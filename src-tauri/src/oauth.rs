use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

const SERVICE_NAME: &str = "flashcode_desktop";
const CREDENTIALS_KEY: &str = "google_credentials";

/// Margin in seconds before expiry at which we consider the token expired.
/// This reduces the chance of a token expiring mid-request.
const EXPIRY_MARGIN_SECS: i64 = 60;

/// Global mutex that serializes all credential mutations: login writes, logout
/// deletions, and token refreshes. This prevents an in-flight refresh from
/// saving stale credentials after a logout or account switch.
static CREDENTIAL_MUTEX: std::sync::OnceLock<Mutex<()>> = std::sync::OnceLock::new();

fn credential_mutex() -> &'static Mutex<()> {
    CREDENTIAL_MUTEX.get_or_init(|| Mutex::new(()))
}

// ===== Credential Storage =====

/// All Google OAuth credentials stored as a single atomic record.
/// Serialized to JSON and stored in the OS credential store.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleCredentials {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64, // access token expiry
    pub client_id: String,
    pub user_id: String,
    // Session fields
    #[serde(default)]
    pub session_authenticated_at: i64, // Unix timestamp
    #[serde(default)]
    pub session_expires_at: i64, // Unix timestamp
    #[serde(default = "default_session_duration")]
    pub session_duration_days: u32,
}

fn default_session_duration() -> u32 {
    90
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeSessionInfo {
    pub user_id: String,
    pub authenticated_at: String, // ISO 8601
    pub expires_at: String, // ISO 8601
    pub duration_days: u32,
}

pub const ALLOWED_DURATIONS: &[u32] = &[30, 90, 180, 365];

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthResult {
    pub id: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub expires_in: u64,
    pub session: NativeSessionInfo,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
}

#[derive(Deserialize)]
struct RefreshTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
}

#[derive(Deserialize)]
struct GoogleUserInfo {
    sub: String,
    email: String,
    name: Option<String>,
    picture: Option<String>,
}

#[derive(Deserialize)]
struct GoogleErrorResponse {
    error: Option<String>,
    error_description: Option<String>,
}

/// Save the entire credentials record atomically.
/// Caller MUST hold credential_mutex.
fn save_credentials(creds: &GoogleCredentials) -> Result<(), String> {
    let json = serde_json::to_string(creds)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;
    let entry = keyring::Entry::new(SERVICE_NAME, CREDENTIALS_KEY)
        .map_err(|e| format!("Keyring init error: {}", e))?;
    entry
        .set_password(&json)
        .map_err(|e| format!("Failed to save credentials to OS Keychain: {}", e))?;
    Ok(())
}

/// Load the credentials record from the OS credential store.
pub fn load_credentials() -> Result<Option<GoogleCredentials>, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, CREDENTIALS_KEY)
        .map_err(|e| format!("Keyring init error: {}", e))?;
    match entry.get_password() {
        Ok(json) => {
            let creds: GoogleCredentials = serde_json::from_str(&json)
                .map_err(|e| format!("Failed to parse stored credentials: {}", e))?;
            Ok(Some(creds))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!(
            "Failed to retrieve credentials from OS Keychain: {}",
            e
        )),
    }
}

// ===== Session Management =====

/// Check if the native session is valid (not expired).
pub fn is_session_valid(creds: &GoogleCredentials) -> bool {
    let now = chrono::Utc::now().timestamp();
    creds.session_expires_at > now && creds.session_authenticated_at > 0
}

/// Convert credentials to a NativeSessionInfo for the frontend.
pub fn session_info_from_creds(creds: &GoogleCredentials) -> NativeSessionInfo {
    use chrono::TimeZone;
    NativeSessionInfo {
        user_id: creds.user_id.clone(),
        authenticated_at: chrono::Utc
            .timestamp_opt(creds.session_authenticated_at, 0)
            .single()
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
        expires_at: chrono::Utc
            .timestamp_opt(creds.session_expires_at, 0)
            .single()
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default(),
        duration_days: creds.session_duration_days,
    }
}

/// Restore the native session. Returns session info if valid.
/// Acquires the credential mutex.
pub async fn restore_session() -> Result<Option<NativeSessionInfo>, String> {
    let _guard = credential_mutex().lock().await;
    let creds = match load_credentials()? {
        Some(c) => c,
        None => return Ok(None),
    };
    if !is_session_valid(&creds) {
        return Ok(None);
    }
    Ok(Some(session_info_from_creds(&creds)))
}

/// Update session duration. Validates allowed values.
/// Acquires the credential mutex.
pub async fn update_session_duration(duration_days: u32) -> Result<NativeSessionInfo, String> {
    if !ALLOWED_DURATIONS.contains(&duration_days) {
        return Err(format!(
            "Invalid session duration: {} days. Allowed: {:?}",
            duration_days, ALLOWED_DURATIONS
        ));
    }
    let _guard = credential_mutex().lock().await;
    let mut creds = load_credentials()?
        .ok_or_else(|| "No active session. Please sign in.".to_string())?;
    if !is_session_valid(&creds) {
        return Err("Session has expired. Please sign in again.".to_string());
    }
    // Recalculate expiry from authenticated_at
    let new_expires_at = creds.session_authenticated_at + (duration_days as i64) * 86400;
    let now = chrono::Utc::now().timestamp();
    // If the recalculated expiry would already be in the past, compute from now
    let final_expires_at = if new_expires_at <= now {
        now + (duration_days as i64) * 86400
    } else {
        new_expires_at
    };
    creds.session_duration_days = duration_days;
    creds.session_expires_at = final_expires_at;
    save_credentials(&creds)?;
    Ok(session_info_from_creds(&creds))
}

/// Refresh session for another full cycle. Rejects expired sessions.
/// Acquires the credential mutex.
pub async fn refresh_session() -> Result<NativeSessionInfo, String> {
    let _guard = credential_mutex().lock().await;
    let mut creds = load_credentials()?
        .ok_or_else(|| "No active session. Please sign in.".to_string())?;
    if !is_session_valid(&creds) {
        return Err("Session has expired. Please sign in again.".to_string());
    }
    let now = chrono::Utc::now().timestamp();
    let duration_days = if creds.session_duration_days > 0 {
        creds.session_duration_days
    } else {
        90
    };
    creds.session_authenticated_at = now;
    creds.session_expires_at = now + (duration_days as i64) * 86400;
    save_credentials(&creds)?;
    Ok(session_info_from_creds(&creds))
}

/// Delete all stored credentials.
/// Acquires the credential mutex to prevent a concurrent refresh from
/// saving stale credentials after this deletion completes.
pub async fn delete_credentials() -> Result<(), String> {
    let _guard = credential_mutex().lock().await;
    delete_credentials_inner()
}

/// Inner deletion without locking — caller must hold the mutex.
fn delete_credentials_inner() -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, CREDENTIALS_KEY)
        .map_err(|e| format!("Keyring init error: {}", e))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!(
            "Failed to delete credentials from OS Keychain: {}",
            e
        )),
    }
}

/// Clean up legacy per-key entries from before the unified credential record.
/// Called once after a successful OAuth login to remove stale entries.
fn cleanup_legacy_entries() {
    for key in &["google_access_token", "google_refresh_token"] {
        if let Ok(entry) = keyring::Entry::new(SERVICE_NAME, key) {
            let _ = entry.delete_credential();
        }
    }
}

// ===== Token Retrieval with Auto-Refresh =====

/// Get a valid access token, refreshing automatically if expired or near-expiry.
///
/// This function:
/// 1. Acquires the credential mutex to prevent concurrent refreshes and
///    coordinate with login/logout operations.
/// 2. Re-reads credentials (another caller may have refreshed already).
/// 3. If the access token is still valid for >60 seconds, returns it.
/// 4. Otherwise, exchanges the refresh token for a new access token.
/// 5. Validates the user_id hasn't changed before persisting.
pub async fn get_valid_access_token() -> Result<String, String> {
    let _guard = credential_mutex().lock().await;

    let creds = load_credentials()?
        .ok_or_else(|| "Google sign-in required. No stored credentials found.".to_string())?;

    // Validate that Flashcode native session is still valid
    if !is_session_valid(&creds) {
        return Err("Flashcode session has expired. Please sign in again.".to_string());
    }

    let now = chrono::Utc::now().timestamp();

    // Check if the access token is still valid with margin
    if creds.expires_at - now > EXPIRY_MARGIN_SECS {
        return Ok(creds.access_token);
    }

    // Access token expired or near-expiry — refresh it
    refresh_and_save(creds).await
}

/// Force-refresh the access token regardless of expiry. Used when a Drive API
/// call returns 401, indicating the stored token was rejected despite the expiry
/// check passing.
///
/// Acquires the credential mutex. After acquiring, re-checks the stored
/// credentials: if another caller already refreshed (the access_token changed),
/// returns the new token without a redundant refresh.
pub async fn force_refresh_access_token(stale_token: &str) -> Result<String, String> {
    let _guard = credential_mutex().lock().await;

    let creds = load_credentials()?
        .ok_or_else(|| "Google sign-in required. No stored credentials found.".to_string())?;

    // Validate that Flashcode native session is still valid
    if !is_session_valid(&creds) {
        return Err("Flashcode session has expired. Please sign in again.".to_string());
    }

    // Another caller may have already refreshed — check if the token changed
    if creds.access_token != stale_token {
        // Someone else refreshed while we were waiting for the lock.
        // The new token may be valid; return it.
        return Ok(creds.access_token);
    }

    refresh_and_save(creds).await
}

/// Exchange the refresh token for a new access token.
/// Caller MUST hold credential_mutex.
async fn refresh_and_save(mut creds: GoogleCredentials) -> Result<String, String> {
    let expected_user_id = creds.user_id.clone();

    let http_client = reqwest::Client::new();
    let mut params = HashMap::new();
    params.insert("client_id", creds.client_id.as_str());
    params.insert("grant_type", "refresh_token");
    params.insert("refresh_token", creds.refresh_token.as_str());

    let res = http_client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token refresh request failed: {}. Please try again.", e))?;

    let status = res.status();

    if !status.is_success() {
        let body = res.text().await.unwrap_or_default();

        // Check for revoked/expired refresh token
        if let Ok(err_resp) = serde_json::from_str::<GoogleErrorResponse>(&body) {
            if err_resp.error.as_deref() == Some("invalid_grant") {
                return Err(format!(
                    "Google credentials have been revoked or expired. Please sign in with Google again. ({})",
                    err_resp.error_description.unwrap_or_default()
                ));
            }
        }

        return Err(format!(
            "Token refresh failed (HTTP {}). Please try again.",
            status.as_u16()
        ));
    }

    let refresh_data: RefreshTokenResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token refresh response: {}", e))?;

    if refresh_data.access_token.is_empty() {
        return Err("Token refresh returned an empty access token.".to_string());
    }

    if refresh_data.expires_in == 0 {
        return Err("Token refresh returned an invalid expiry.".to_string());
    }

    // Before saving, verify the stored credentials still belong to the same user.
    // A login or logout may have occurred during the (unlocked) network request...
    // but we hold the mutex, so this can't happen with our current design.
    // Still, defensive check for safety.
    let current = load_credentials()?;
    match current {
        None => {
            // Credentials were deleted (logout) while we were refreshing.
            // Do not save — the user logged out.
            return Err(
                "Credentials were cleared during token refresh. Please sign in again.".to_string(),
            );
        }
        Some(ref stored) if stored.user_id != expected_user_id => {
            // A different user signed in while we were refreshing.
            // Do not overwrite their credentials.
            return Err(
                "Account changed during token refresh. Please try again.".to_string(),
            );
        }
        Some(_) => {
            // Same user, safe to update.
        }
    }

    // Update credentials
    let now = chrono::Utc::now().timestamp();
    creds.access_token = refresh_data.access_token.clone();
    creds.expires_at = now + refresh_data.expires_in as i64;

    // Preserve existing refresh token if response omits one; update if provided
    if let Some(new_refresh) = refresh_data.refresh_token {
        if !new_refresh.is_empty() {
            creds.refresh_token = new_refresh;
        }
    }

    // Persist before returning
    save_credentials(&creds)?;

    Ok(refresh_data.access_token)
}

// ===== OAuth Login Flow =====

pub async fn perform_google_oauth(
    app: &AppHandle,
    client_id: &str,
    duration_days: u32,
) -> Result<OAuthResult, String> {
    // Validate session duration before starting OAuth
    if !ALLOWED_DURATIONS.contains(&duration_days) {
        return Err(format!(
            "Invalid session duration: {} days. Allowed: {:?}",
            duration_days, ALLOWED_DURATIONS
        ));
    }

    // 1. Generate PKCE code verifier and code challenge
    let mut random_bytes = [0u8; 48];
    rand::thread_rng().fill_bytes(&mut random_bytes);
    let code_verifier = URL_SAFE_NO_PAD.encode(random_bytes);

    let mut hasher = Sha256::new();
    hasher.update(code_verifier.as_bytes());
    let code_challenge = URL_SAFE_NO_PAD.encode(hasher.finalize());

    // 2. Start local TCP loopback listener
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind loopback TCP server: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local port: {}", e))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);

    // 3. Construct OAuth URL
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?\
        client_id={}&\
        redirect_uri={}&\
        response_type=code&\
        scope=openid%20email%20profile%20https://www.googleapis.com/auth/drive.appdata&\
        code_challenge={}&\
        code_challenge_method=S256&\
        access_type=offline&\
        prompt=consent",
        client_id,
        urlencoding(&redirect_uri),
        code_challenge
    );

    // 4. Open user's default browser
    app.opener()
        .open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Failed to open system browser: {}", e))?;

    // 5. Wait for redirect with a 2-minute timeout
    let auth_code = tokio::time::timeout(Duration::from_secs(120), async {
        let (mut socket, _) = listener
            .accept()
            .await
            .map_err(|e| format!("Socket accept failed: {}", e))?;

        let mut buffer = [0u8; 2048];
        let bytes_read = socket
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Socket read failed: {}", e))?;

        let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

        // Parse query parameter `code`
        let code = extract_query_param(&request_str, "code");

        // Send friendly HTML response to browser
        let html_body = "<!DOCTYPE html><html><head><title>Flashcode Auth</title></head>\
        <body style='font-family: sans-serif; text-align: center; padding: 40px;'>\
        <h2 style='color: #2b8a3e;'>Authentication successful!</h2>\
        <p>You may now close this browser window and return to Flashcode.</p>\
        </body></html>";

        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            html_body.len(),
            html_body
        );

        let _ = socket.write_all(response.as_bytes()).await;
        let _ = socket.flush().await;

        code.filter(|value| !value.is_empty())
            .ok_or_else(|| "No authorization code found in redirect request".to_string())
    })
    .await
    .map_err(|_| "Authentication timed out. Please try again.".to_string())??;

    // 6. Exchange authorization code for tokens
    let http_client = reqwest::Client::new();
    let mut token_params = HashMap::new();
    token_params.insert("client_id", client_id);
    token_params.insert("code", &auth_code);
    token_params.insert("code_verifier", &code_verifier);
    token_params.insert("grant_type", "authorization_code");
    token_params.insert("redirect_uri", &redirect_uri);

    let token_res = http_client
        .post("https://oauth2.googleapis.com/token")
        .form(&token_params)
        .send()
        .await
        .map_err(|e| format!("Token exchange request failed: {}", e))?;

    if !token_res.status().is_success() {
        let err_body = token_res.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", err_body));
    }

    let token_data: TokenResponse = token_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    // 7. Fetch verified user info
    let user_res = http_client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(&token_data.access_token)
        .send()
        .await
        .map_err(|e| format!("User info request failed: {}", e))?;

    if !user_res.status().is_success() {
        let err_body = user_res.text().await.unwrap_or_default();
        return Err(format!("Failed to retrieve user profile: {}", err_body));
    }

    let user_info: GoogleUserInfo = user_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse user info: {}", e))?;

    // 8. Calculate expiry and store credentials as a single atomic record.
    //    Acquire the credential mutex to prevent a concurrent refresh from
    //    overwriting these new credentials with stale ones.
    let now = chrono::Utc::now().timestamp();
    let expires_at = now + token_data.expires_in as i64;

    let refresh_token = token_data.refresh_token.unwrap_or_default();
    if refresh_token.is_empty() {
        return Err(
            "Google did not provide a refresh token. Please try signing in again with consent."
                .to_string(),
        );
    }

    let session_now = chrono::Utc::now().timestamp();
    let credentials = GoogleCredentials {
        access_token: token_data.access_token,
        refresh_token,
        expires_at,
        client_id: client_id.to_string(),
        user_id: user_info.sub.clone(),
        session_authenticated_at: session_now,
        session_expires_at: session_now + (duration_days as i64) * 86400,
        session_duration_days: duration_days,
    };
    
    let session = session_info_from_creds(&credentials);

    {
        let _guard = credential_mutex().lock().await;
        save_credentials(&credentials)?;
        // Clean up any legacy per-key entries from previous versions
        cleanup_legacy_entries();
    }

    Ok(OAuthResult {
        id: user_info.sub,
        email: user_info.email,
        name: user_info.name.unwrap_or_else(|| "Flashcode User".to_string()),
        picture: user_info.picture,
        expires_in: token_data.expires_in,
        session,
    })
}

fn urlencoding(input: &str) -> String {
    let mut encoded = String::new();
    for byte in input.bytes() {
        match byte {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

fn extract_query_param(request: &str, param_name: &str) -> Option<String> {
    let first_line = request.lines().next()?;
    let request_target = first_line.split_whitespace().nth(1)?;
    let (_, query) = request_target.split_once('?')?;

    url::form_urlencoded::parse(query.as_bytes())
        .find(|(key, _)| key == param_name)
        .map(|(_, value)| value.into_owned())
}
