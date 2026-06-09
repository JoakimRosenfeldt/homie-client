# AGENTS.md

## Cursor Cloud specific instructions

Homie Client is an Expo Router (React Native + web) rental listings app. The UI currently uses in-app mock data; the Convex backend in `convex/` is tested separately and is not required to run the browse flow.

### Services

| Service | Command | URL / notes |
|---|---|---|
| Expo web (primary dev target) | `bun run web` | http://localhost:8081 |
| Expo dev server (all platforms) | `bun run start` | Metro on port 8081 |
| Convex backend (optional) | `npx convex dev` | Cloud deployment; not wired to the client yet |

### Package manager

Use **Bun** (`bun.lock`). Bun installs to `~/.bun/bin` and is on `PATH` in login shells via `~/.bashrc`.

### Common commands

See `README.md` for the canonical list:

- `bun install` — install dependencies
- `bun run lint` — ESLint via `expo lint`
- `bun run test` — Vitest tests for Convex backend (`convex-test`, no live Convex needed)
- `bun run web` — start Expo with web target for browser testing

### Gotchas

- **No `.env` required** for the current mock-data UI. Convex env vars (`EXPO_PUBLIC_CONVEX_URL`) are only needed once the client is connected to Convex.
- **Expo version warnings** on startup are informational; the app bundles and runs despite mismatched patch versions.
- **Long-running dev server**: use a tmux session (e.g. `expo-web-dev`) for `bun run web`; Metro blocks the terminal.
- **Core E2E flow (current scope)**: home list at `/` → tap an apartment card → detail at `/apartments/[apartmentId]` → Back.
