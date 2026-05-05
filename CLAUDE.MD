# CLAUDE.md — Flashcode

## Project Overview

Flashcode is a cross-platform desktop application for learning and memorizing programming concepts through interactive flashcards with syntax-highlighted code blocks. Built with **Tauri + React + TypeScript**.

- **Target users:** Developers learning new languages, syntax, or concepts
- **Platforms:** Windows, macOS, Linux (via Tauri)
- **Language:** English only (no i18n)

---

## Tech Stack

| Layer        | Technology                         |
| ------------ | ---------------------------------- |
| Desktop      | Tauri (Rust backend)               |
| Frontend     | React 18+ with TypeScript (strict) |
| Styling      | Mantine UI                         |
| Routing      | React Router                       |
| State        | React Context API                  |
| Data Storage | SQLite (via Tauri SQL plugin)      |
| Code Blocks  | Mantine `CodeHighlight` component  |
| Bundler      | Vite                               |
| Pkg Manager  | pnpm                               |
| Linting      | ESLint + Prettier                  |

---

## Commands

```bash
# Install dependencies
pnpm install

# Run in development mode (frontend + Tauri)
pnpm dev
# or
pnpm tauri dev

# Build frontend
pnpm build

# Build production binary (platform-specific installer)
pnpm tauri build
```

---

## Project Structure

> **Follow the existing folder structure.** Do not reorganize or introduce new top-level directories without discussion.

```
flashcode/
├── src/                  # React frontend source
│   ├── components/       # Reusable UI components
│   ├── pages/            # Route-level page components
│   ├── hooks/            # Custom React hooks
│   ├── context/          # React Context providers
│   ├── utils/            # Helper functions
│   ├── types/            # TypeScript type definitions
│   └── ...               # Follow existing structure
├── src-tauri/            # Tauri / Rust backend
│   ├── src/
│   │   └── main.rs       # Rust entry point & Tauri commands
│   ├── tauri.conf.json   # Tauri configuration
│   └── Cargo.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
└── CLAUDE.md
```

---

## Coding Conventions

### TypeScript

- **Strict mode** — no `any`, no implicit types. Every function parameter, return type, and variable must be explicitly or inferrably typed.
- Use `interface` for object shapes, `type` for unions/intersections/utilities.
- Prefer `const` over `let`. Never use `var`.

### React

- **Functional components only.** No class components.
- **Named exports only.** No default exports.

```tsx
// ✅ Correct
export const DeckCard: React.FC<DeckCardProps> = ({ title, count }) => { ... }

// ❌ Wrong
export default function DeckCard(...) { ... }
```

- Keep components small and focused. Extract logic into custom hooks.
- Colocate component-specific types in the same file or a sibling `.types.ts` file.

### State Management

- Use **React Context API** for global/shared state (decks, user preferences, study session).
- Keep context providers focused — one context per domain (e.g., `DecksContext`, `StudyContext`, `ThemeContext`).
- Use `useReducer` inside context for complex state transitions.

### Styling

- Use **Mantine UI** components and styling system.
- Use Mantine's `createStyles` / `sx` prop / CSS Modules with Mantine tokens — not raw CSS or inline styles.
- The app supports **light and dark themes** via Mantine's `MantineProvider` color scheme toggle. Always ensure components look correct in both themes.
- When adding custom styles, use Mantine theme tokens (colors, spacing, radius) rather than hardcoded values.

### Code Highlighting

- Use Mantine's `CodeHighlight` component for rendering code blocks on flashcards.
- Supported languages: Python, JavaScript, TypeScript, Rust, C++, Java, Go, Swift, PHP.
- Always pass the `language` prop explicitly.

### Routing

- Use **React Router** for navigation.
- Main routes: Decks, Favorites, Study, Add New.
- Keep route definitions centralized.

---

## Data Layer

### SQLite (Tauri SQL Plugin)

- All persistent data (decks, flashcards, study progress, favorites) is stored in a local SQLite database.
- Communicate between the React frontend and Rust backend using Tauri's `invoke` API:

```tsx
import { invoke } from '@tauri-apps/api/core';

const decks = await invoke<Deck[]>('get_all_decks');
```

- Define Tauri commands in `src-tauri/src/main.rs` (or modularized Rust files).
- Always type the return values of `invoke` calls on the frontend.

### Spaced Repetition

- The app uses the **SM-2 spaced repetition algorithm** for scheduling flashcard reviews.
- Study session logic should respect the SM-2 intervals — do not bypass or simplify the scheduling.
- Cards have properties like `easiness_factor`, `interval`, `repetitions`, and `next_review_date`.

---

## Key Features & Domain Concepts

- **Deck**: A collection of flashcards, has a name, description, favorite status, and card count.
- **Flashcard**: Has a title, front content (question), back content (answer), optional code block with language tag.
- **Favorites**: Decks can be starred/unstarred. Favorite decks appear in a dedicated sidebar section.
- **Study Session**: Presents due cards one at a time. User reveals the answer and self-rates recall. SM-2 updates the schedule.

---

## Common Gotchas

- **Do not use Node.js APIs** (like `fs`, `path`) in the frontend. Tauri runs in a webview — use `invoke` to call Rust commands for filesystem/DB access.
- **Always handle errors** from `invoke` calls with try/catch — Rust commands can fail.
- **Theme awareness**: Every UI addition must work in both light and dark mode. Test both.
- **Mantine version**: Check the installed Mantine version before using APIs — v6 and v7 have breaking differences.

---

## Formatting & Linting

- **ESLint + Prettier** are configured. Run before committing:

```bash
pnpm lint        # if script exists
pnpm format      # if script exists
```

- Follow the existing `.eslintrc` and `.prettierrc` configurations.
- Do not disable ESLint rules without a comment explaining why.

---

## What NOT to Do

- ❌ Do not introduce new dependencies without justification.
- ❌ Do not use `any` type — find or create the correct type.
- ❌ Do not use default exports.
- ❌ Do not use class components.
- ❌ Do not write raw CSS outside of Mantine's styling system.
- ❌ Do not hardcode color values — use Mantine theme tokens.
- ❌ Do not bypass the SM-2 algorithm logic.
- ❌ Do not restructure the folder layout.
