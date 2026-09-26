use std::path::Path;

fn is_valid_secret(val: &str) -> bool {
    let trimmed = val.trim().trim_matches('"').trim_matches('\'').trim();
    !trimmed.is_empty()
        && trimmed != "YOUR_CLIENT_SECRET"
        && !trimmed.starts_with("YOUR_")
}

fn read_secret_from_env_file(path: &Path) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once('=') {
            if key.trim() == "GOOGLE_OAUTH_CLIENT_SECRET" {
                let cleaned = value.trim().trim_matches('"').trim_matches('\'').trim();
                if is_valid_secret(cleaned) {
                    return Some(cleaned.to_string());
                }
            }
        }
    }
    None
}

fn main() {
    println!("cargo:rerun-if-env-changed=GOOGLE_OAUTH_CLIENT_SECRET");
    println!("cargo:rerun-if-changed=../.env.local");
    println!("cargo:rerun-if-changed=.env.local");

    let secret = std::env::var("GOOGLE_OAUTH_CLIENT_SECRET")
        .ok()
        .filter(|v| is_valid_secret(v))
        .or_else(|| read_secret_from_env_file(Path::new("../.env.local")))
        .or_else(|| read_secret_from_env_file(Path::new(".env.local")));

    if let Some(secret_val) = secret {
        println!("cargo:rustc-env=GOOGLE_OAUTH_CLIENT_SECRET={}", secret_val);
    }

    tauri_build::build()
}

