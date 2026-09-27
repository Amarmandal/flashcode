# Flashcode

![Tauri](https://img.shields.io/badge/Tauri-FRAMEWORK-blue)
![React](https://img.shields.io/badge/React-FRAMEWORK-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-LANGUAGE-blue)

## Overview

Flashcode is a desktop application built with Tauri, React, and TypeScript. It's designed to help users learn and memorize programming concepts, syntax, or code snippets through interactive flashcards. Whether you're a seasoned developer looking to pick up a new language or a beginner starting your coding journey, Flashcode offers a focused and efficient way to study. It's ideal for anyone who wants to reinforce their programming knowledge.

## Features

*   **Create & Manage Decks:** Easily organize your flashcards into different decks based on topics or programming languages.
*   **Code-Optimized Flashcards:** Add code snippets to your flashcards, with syntax highlighting for various languages.
*   **Language Support:** Support for multiple programming languages in code blocks (e.g., Python, JavaScript, Rust, C++, Java, Go, Swift, PHP, TypeScript).
*   **Study Mode:** Efficiently study your flashcards with a clean and focused interface.
*   **Favorite Decks:** Mark your most important or frequently used decks as favorites for quick access.
*   **Cross-Platform:** Works on Windows, macOS, and Linux thanks to Tauri.

## How to Use

Flashcode is designed to be intuitive. Here’s how to get started:

### 1. Navigation
The application is organized into several main sections, accessible from the sidebar:
*   **Decks:** View, manage, and create your flashcard decks.
*   **Favorites:** Access your decks marked as favorites.
*   **Study Now:** Start a study session with due flashcards.
*   **Add New:** Quickly add a new deck or a new flashcard.

### 2. Creating a New Deck
1.  Navigate to the **Decks** section or click **Add New** > **Deck**.
2.  Click on the "**Create New Deck**" button.
3.  Enter a **Name** for your deck (e.g., "Python Basics", "React Hooks").
4.  Optionally, add a **Description**.
5.  Click "**Create Deck**".

### 3. Adding Flashcards
1.  Open the deck you want to add flashcards to from the **Decks** list.
2.  Click on the "**Add Flashcard**" button.
3.  Enter a **Title** for your flashcard (e.g., "What is a closure?").
4.  In the **Front** content area, type your question or the concept you want to learn. You can use markdown for formatting.
5.  In the **Back** content area, type the answer or explanation.
6.  To add a **Code Block**:
    *   Click the code block icon or use appropriate markdown (e.g., \`\`\`python).
    *   Select the **Programming Language** for syntax highlighting.
    *   Paste or type your code.
7.  Click "**Save Flashcard**".

### 4. Studying Flashcards
1.  Navigate to the **Study Now** section to review cards that are due based on a spaced repetition algorithm (if applicable, otherwise describe the study mechanism).
2.  Alternatively, open a specific deck from the **Decks** list and click the "**Study Deck**" button.
3.  Flashcards will be presented one by one.
4.  Reveal the answer and self-assess your recall. (Describe how to mark as easy, good, hard if such a feature is apparent or standard for flashcard apps).

### 5. Managing Favorites
1.  In the **Decks** list, click the **Star Icon** next to a deck to mark it as a favorite.
2.  Access all your favorite decks quickly from the **Favorites** section.

## Development

### Google sign-in configuration

Configure Flashcode's Google Desktop OAuth client ID once as the app developer.
Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_OAUTH_CLIENT_ID` to that
client ID. Set the same variable in the release build environment before building
the frontend. Vite embeds this public identifier at build time; restart the dev
process or rebuild after changing it. Do not put tokens or client secrets in
`VITE_*` variables.

The Google sign-in button uses this app configuration to open the native browser
OAuth flow. End users do not need a Google Cloud project or an OAuth client ID.
An unconfigured build cannot complete Google sign-in.

Set `GOOGLE_OAUTH_CLIENT_SECRET` from the same **Desktop app** OAuth registration
in `.env.local` for development. Release builds embed it in the native Rust binary
via `src-tauri/build.rs`. It is extractable from the distributed app; storing it
in Rust or the OS Keychain does not make a shared desktop credential confidential.
Never use a confidential Web application client secret for this flow. User access
and refresh tokens are obtained at sign-in and stored in each user's OS credential
store; they must not be supplied to CI.

### GitHub release configuration

In Settings → Secrets and variables → Actions, configure:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `VITE_GOOGLE_OAUTH_CLIENT_ID` | Google Desktop app client ID |
| Secret | `GOOGLE_OAUTH_CLIENT_SECRET` | Matching Desktop app client secret |
| Secret | `TAURI_SIGNING_PRIVATE_KEY` | Updater private key contents matching the existing `plugins.updater.pubkey` in `src-tauri/tauri.conf.json` |
| Secret (if encrypted) | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the updater private key; leave unset for an unencrypted key |


The workflow passes the Google values to the frontend/native build on every OS.
Updater artifacts are enabled, so Tauri signs the update bundles and tauri-action
uploads `latest.json` to the release. The `update-json` job validates that manifest
and copies it to `releases.json` on `gh-pages`, the app's existing update endpoint.
Updater signing is independent of Apple signing and requires no Apple membership.
Keep the original updater key pair: replacing it prevents existing installations
from trusting new updates. See [Tauri's updater guide](https://v2.tauri.app/plugin/updater/).

Users of the release do not need an `.env` file. Configure the Google consent
screen for your intended audience before public distribution, and enable the
Google Drive API for cloud backup.

macOS releases use **ad-hoc signing** (`APPLE_SIGNING_IDENTITY="-"`). No Apple
Developer membership, certificate, keychain password, or notarization credentials
are required. Existing Apple secrets in GitHub are unused by this workflow and
can remain there. These builds are not notarized and do not have an
Apple-verified developer identity.

After downloading and installing Flashcode, macOS may block the first launch.
If you trust the download, try opening it, then go to **System Settings → Privacy
& Security → Open Anyway** and confirm. Managed Macs may restrict this option.
See [Apple's opening instructions](https://support.apple.com/en-us/102445) and
[Tauri's ad-hoc signing guide](https://v2.tauri.app/distribute/sign/macos/#ad-hoc-signing).
For verified distribution in the future, use a Developer ID Application
certificate and notarization.

See [Google's desktop OAuth guide](https://developers.google.com/identity/protocols/oauth2/native-app)
for the sign-in configuration.

Sanitized build errors and certificate identity names can be shared for debugging.
Do not share `.env.local`, `.p12` contents, passwords, tokens, or raw verbose build
logs without reviewing/redacting them. GitHub secret masking protects many log
occurrences, but does not make embedded desktop credentials confidential.

### Recommended IDE Setup
*   [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Setting up the Environment
1.  **Clone the repository:**
    Replace `https://github.com/yourusername/flashcode.git` with the actual repository URL.
    ```bash
    git clone https://github.com/yourusername/flashcode.git
    cd flashcode 
    ```
2.  **Install dependencies:**
    This project uses `pnpm` as the package manager. If you don't have `pnpm`, install it first (e.g., `npm install -g pnpm`).
    ```bash
    pnpm install
    ```
3.  **Install Rust:**
    If you don't have Rust installed, follow the official instructions at [rust-lang.org](https://www.rust-lang.org/tools/install). Tauri development requires Rust.

### Running the Application
*   **Development Mode:**
    To run the application in development mode with hot-reloading:
    ```bash
    pnpm dev
    ```
    This will typically start the Vite frontend and the Tauri application.

*   **Tauri CLI:**
    You can also use the Tauri CLI directly for more control:
    ```bash
    pnpm tauri dev
    ```

### Available Scripts
The `package.json` includes the following scripts:
*   `pnpm dev`: Starts the development server and Tauri app.
*   `pnpm build`: Compiles TypeScript, builds the frontend, and prepares for Tauri build.
*   `pnpm tauri <command>`: Accesses the Tauri CLI for commands like `tauri build`, `tauri plugin`, etc. (e.g. `pnpm tauri build`).

## Building for Production

To build the application for production, which will generate executables for your platform:

1.  **Ensure frontend is built:**
    The Tauri build process often relies on the frontend being built first.
    ```bash
    pnpm build
    ```

2.  **Build the Tauri application:**
    This command bundles your application into a distributable format.
    ```bash
    pnpm tauri build
    ```
    This will create an executable in `src-tauri/target/release/` and an installer/bundle in `src-tauri/target/release/bundle/`. The exact output may vary based on your operating system and Tauri configuration.

    For specific platforms:
    *   **Windows:** Typically generates an `.msi` installer.
    *   **macOS:** Typically generates a `.dmg` file and an `.app` bundle.
    *   **Linux:** Typically generates an `.AppImage` and a `.deb` file.

## Contributing

Contributions are welcome! If you'd like to contribute to Flashcode, please follow these general steps:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/your-feature-name
    ```
3.  **Make your changes.**
4.  **Commit your changes** with a clear and descriptive commit message.
5.  **Push your branch** to your forked repository.
6.  **Open a Pull Request** to the main Flashcode repository.

Please ensure your code adheres to the project's coding standards and includes tests where applicable.
If you're planning a larger change, it's a good idea to open an issue first to discuss it.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
