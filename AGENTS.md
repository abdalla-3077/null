# AGENTS.md — Null project rules

> Read this file before writing code, opening PRs, or cutting a release in this repo.

## 1. What this project is

Null is a privacy-focused desktop browser: Electron 44 + Electron Forge, React 19 + Zustand + Vite.
Entry points: `src/main.ts`, `src/preload.ts`, `src/renderer-entry.tsx`.
Packaging config lives in `forge.config.ts` — makers: Squirrel (Windows), ZIP (macOS), deb/rpm (Linux).

## 2. How to work in this repo

- **Install / run:** `npm ci` then `npm start`. Never commit `node_modules/`, `out/` or `.vite/`.
- **Build installers locally:** `npm run make` → artifacts land in `out/make/`.
- **Lint:** `npm run lint`. Keep `src/main`, `src/renderer`, `src/shared` boundaries clean:
  renderer talks to main **only** through the preload IPC bridge (`window.nullBrowser` / `window.nullSettings`).
- **Security invariants (do not break):** context isolation stays on, Electron fuses stay as configured,
  `null://` stays a privileged/standard/secure scheme, unknown permissions default to **deny**.
- **Privacy invariant:** bookmarks/history are session-only. Anything that persists user data to disk
  must be behind an explicit setting and documented in the PR + README.

## 3. Commit rules (release changelog depends on these)

This repo uses **Conventional Commits**. Every release changelog is generated from commit messages,
so the prefix you pick controls the emoji section the change lands in:

| Prefix | Emoji section | Example |
|---|---|---|
| `feat:` | ✨ Features | `feat: add per-tab device profiles` |
| `fix:` | 🐛 Bug Fixes | `fix: restore window bounds on restart` |
| `sec:` / `privacy:` | 🔒 Security & Privacy | `sec: deny unknown permission requests` |
| `perf:` | ⚡ Performance | `perf: lazy-load AI panel views` |
| `refactor:` | ♻️ Refactors | `refactor: split tab IPC handlers` |
| `docs:` | 📝 Docs | `docs: update emergency-escape notes` |
| `style:` / `ui:` | 💄 UI & Style | `style: polish new-tab weather card` |
| `test:` | ✅ Tests | `test: cover download resume` |
| `chore:` / `build:` / `ci:` | 🔧 Chores | `chore: bump electron to 44.x` |
| anything else | 📌 Other | — |

Rules:
1. One logical change per commit. Scope is optional: `feat(tabs): ...`.
2. Breaking changes: add `!` → `feat(api)!: ...` and explain migration in the body.
3. `sec:`/`privacy:` commits must describe threat + mitigation in the body.
4. Do **not** use `skip-changelog` / `ignore-for-release` labels to hide user-facing changes.

PR titles must follow the same convention — squash-merge keeps the PR title as the final commit.

## 4. Release rules (automated — GitHub Actions)

Workflow: `.github/workflows/release.yml` + notes config `.github/release.yml`.

- **Trigger:** push a semver tag `v*.*.*` (e.g. `v1.2.3`, `v1.0.0-beta.1` → marked prerelease).
  Manual `workflow_dispatch` runs only **build** unless `publish: true`.
- **What the workflow does:**
  1. 🏗️ Builds installers on a matrix: `ubuntu-latest`, `windows-latest`, `macos-latest`
     (`npm ci` → `npm run make`; Linux job installs `fakeroot rpm zip dpkg-dev` first).
  2. 📝 Generates an emoji changelog from commits since the previous `v*` tag
     (grouped ✨/🐛/🔒/⚡/♻️/📝/💄/✅/🔧/📌) into `RELEASE_NOTES.md`.
  3. 🎉 Creates/updates the GitHub Release `Null <tag>` with installers attached
     (`.exe/.nupkg`, `.zip/.dmg`, `.deb/.rpm`) + `generate_release_notes: true`
     (GitHub-native notes styled by `.github/release.yml` are appended).
  4. 📚 Rebuilds `CHANGELOG.md` on top of latest `origin/main` (retry ×3 on push races),
     commits it **as the tag pusher** (never `github-actions[bot]` — contributors graph stays single-author),
     and pushes to `main` (`[skip ci]`).
- **How to cut a release:**
  ```bash
  npm version patch   # or minor / major / prerelease --preid=beta
  git push --follow-tags
  ```
  Then watch **Actions → 🚀 Release Build**. Verify the Release page shows installers + changelog.
- **Version discipline:** `package.json` version and git tag must match (`1.2.3` ↔ `v1.2.3`).
  `npm version` handles both — don't hand-edit one without the other.
- **Hotfix:** branch from the tag, fix with `fix:` commit, bump patch, push tag.
- **If the workflow fails:** check `out/make` listing in the failed Build job log first;
  native-module errors usually mean `npm ci` cache or missing Linux packaging deps.
- **Secrets (optional):** Windows code-signing via `WINDOWS_CERTIFICATE_FILE` /
  `WINDOWS_CERTIFICATE_PASSWORD`. Builds work unsigned without them.
- **CI:** `.github/workflows/ci.yml` runs lint + `tsc --noEmit` on pushes/PRs to `main`.
  Keep it green before tagging.

## 5. Public-repo hygiene

- This repo is **public**. Never commit secrets, `.env` contents, signing certs, or user data.
- README hero image: `MD/Md.png` (browser home screenshot). Keep it up to date when the home screen changes.
- Screenshots with personal data (real history, real location) must be redacted before committing.
