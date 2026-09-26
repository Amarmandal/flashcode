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

const SERVICE_NAME: &str = "flashcode_desktop";

#[derive(Debug, Serialize, Deserialize)]
pub struct OAuthResult {
    pub id: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
    pub expires_in: u64,
}

#[derive(Deserialize)]
struct TokenResponse {
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

pub fn save_token(key: &str, value: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, key)
        .map_err(|e| format!("Keyring init error: {}", e))?;
    entry
        .set_password(value)
        .map_err(|e| format!("Failed to set token in OS Keychain: {}", e))?;
    Ok(())
}

pub fn get_token(key: &str) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(SERVICE_NAME, key)
        .map_err(|e| format!("Keyring init error: {}", e))?;
    match entry.get_password() {
        Ok(pass) => Ok(Some(pass)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to retrieve token from OS Keychain: {}", e)),
    }
}

pub fn delete_token(key: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(SERVICE_NAME, key)
        .map_err(|e| format!("Keyring init error: {}", e))?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete token from OS Keychain: {}", e)),
    }
}

pub async fn perform_google_oauth(
    app: &AppHandle,
    client_id: &str,
) -> Result<OAuthResult, String> {
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

    // 8. Securely store tokens in OS Keychain
    save_token("google_access_token", &token_data.access_token)?;
    if let Some(ref refresh) = token_data.refresh_token {
        save_token("google_refresh_token", refresh)?;
    }

    Ok(OAuthResult {
        id: user_info.sub,
        email: user_info.email,
        name: user_info.name.unwrap_or_else(|| "Flashcode User".to_string()),
        picture: user_info.picture,
        expires_in: token_data.expires_in,
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
