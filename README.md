# Null

A privacy-focused desktop web browser built with Electron, React, and Vite.

Null is a full-featured Chromium-based browser with tab management, an AI assistant panel, device-profile spoofing, a download manager, find-in-page, and a one-click emergency escape.

## Features

- **Tabbed browsing** — top, side, or bottom tab layouts, pinned tabs, reopen closed tabs, multi-window
- **Smart address bar** — auto-detects URLs vs. search queries, configurable search engine (Google, Bing, DuckDuckGo)
- **Bookmarks & history** — a bookmarks bar with a one-click star, plus a searchable history page. Both are session-only and never touch disk
- **Command palette** — `Ctrl/⌘ + K` for fuzzy access to tabs, actions, view and privacy options; `Ctrl/⌘ + Shift + A` searches tabs
- **Zoom controls** — per-tab zoom with an address-bar chip and `Ctrl/⌘ + +/-/0`
- **AI panel** — side panel with built-in providers (ChatGPT, Claude, Gemini, Qwen) plus custom providers
- **Privacy tools** — clear session data on demand or on quit, per-tab device user-agent profiles (desktop + mobile)
- **Permission prompts** — explicit in-app allow/block for camera, microphone, location, notifications, clipboard, MIDI and screen sharing; unknown permissions are denied
- **HTTPS-first** — upgrades plain HTTP navigations to HTTPS, falling back (with the usual warning) only when the secure version is unavailable
- **Emergency escape** — one-click jump to a safe page (Google, blank, or custom URL) with optional confirmation
- **Download manager** — progress tray with pause, resume, cancel and configurable location
- **Find in page** — match counts and navigation
- **Internal pages** — `null://newtab`, `null://settings`, `null://error/*` served over a privileged custom protocol
- **Theming** — light/dark appearance with blue, red, and neutral themes
- **Setup wizard** — first-run onboarding for layout, theme, search, and privacy defaults

## Tech Stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Shell    | Electron 44 + Electron Forge                    |
| UI       | React 19 + Zustand + Vite                       |
| Main     | TypeScript (`src/main/*`: tabs, windows, IPC)   |
| Storage  | `electron-store` (settings, tabs restore)       |
| Build    | Vite (main / preload / renderer) + TS           |
| Packaging| Squirrel (Win), ZIP (macOS), deb/rpm (Linux)    |

## Project Structure

```
src/
├── main.ts                 # App boot, menu, protocol registration
├── preload.ts              # Secure IPC bridge (window.nullBrowser / nullSettings)
├── main/
│   ├── window-manager.ts   # BrowserWindow + BrowserView layout
│   ├── tab-manager.ts      # Tab lifecycle, navigation, restore
│   ├── download-manager.ts # Download tracking
│   ├── ai-panel-manager.ts # AI side panel views
│   ├── privacy-manager.ts  # Session cleanup
│   ├── settings-store.ts   # Persisted settings
│   ├── null-protocol.ts    # null:// internal pages
│   └── ipc/                # IPC handlers
├── renderer/               # React UI (toolbar, tabs, settings, wizard…)
├── shared/
│   ├── types.ts            # TabInfo, AppSettings, defaults
│   └── config.ts           # Search engines, AI providers, UA profiles
```

## Getting Started

**Prerequisites:** Node.js (see `.nvmrc` if present) and npm.

```bash
npm install
npm start
```

## Scripts

| Script         | Description              |
| -------------- | ------------------------ |
| `npm start`    | Run in development       |
| `npm run package` | Package the app       |
| `npm run make` | Build installers (out/)  |
| `npm run publish` | Publish via Forge     |
| `npm run lint` | ESLint (TS/React)        |

## Keyboard Shortcuts

| Shortcut                  | Action              |
| ------------------------- | ------------------- |
| `Ctrl/⌘ + T`              | New tab             |
| `Ctrl/⌘ + W`              | Close tab           |
| `Ctrl/⌘ + Shift + T`      | Reopen closed tab   |
| `Ctrl/⌘ + L`              | Focus address bar   |
| `Ctrl/⌘ + R` / `Shift+R`  | Reload / hard reload|
| `Ctrl/⌘ + F`              | Find in page        |
| `Ctrl/⌘ + K`              | Command palette     |
| `Ctrl/⌘ + Shift + A`      | Search tabs         |
| `Ctrl/⌘ + D`              | Bookmark this page  |
| `Ctrl/⌘ + H`              | Browsing history    |
| `Ctrl/⌘ + J`              | Downloads           |
| `Ctrl/⌘ + +` / `-` / `0`  | Zoom in / out / reset|
| `Ctrl/⌘ + Tab`            | Next / previous tab |
| `Ctrl/⌘ + Shift + Del`    | Clear session data  |
| `Esc`                     | Stop / dismiss      |

## Security Notes

- Context isolation is on; the renderer talks to the main process only through a minimal preload IPC bridge.
- Electron fuses are enabled (`RunAsNode: false`, ASAR integrity validation, app-only-from-ASAR).
- The `null://` scheme is registered as privileged/standard/secure.

## License

MIT
