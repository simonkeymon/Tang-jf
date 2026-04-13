# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` monorepo. Application code lives under `apps/`: `apps/web` is the main React client, `apps/admin` is the admin React app, and `apps/server` is the Express API. Shared UI, types, i18n, and client helpers live in `packages/shared/src`. Keep new code close to its feature area, for example `apps/server/src/modules/auth/*` or `apps/web/src/pages/HomePage.tsx`. Generated coverage output goes to `coverage/`, utility scripts live in `scripts/`, and uploaded files are stored under `uploads/`.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies.
- `pnpm build`: build shared first, then web, server, and admin.
- `pnpm typecheck`: run TypeScript checks across all packages.
- `pnpm lint`: run ESLint for `.ts`, `.tsx`, and `.js` files.
- `pnpm test`: run the Vitest suite from the repo root.
- `pnpm test:coverage`: generate coverage reports under `coverage/`.
- `pnpm --filter @tang/web dev`: start the main web app with Vite.
- `pnpm --filter @tang/admin dev`: start the admin app locally.
- `pnpm --filter @tang/server build && pnpm --filter @tang/server start`: build and run the API server.

## Coding Style & Naming Conventions
Use TypeScript throughout. Prettier enforces `singleQuote: true`, semicolons, and `printWidth: 100`; format before submitting. Follow the existing naming patterns: React components use PascalCase (`ErrorBoundary.tsx`), hooks use `use*`, stores and utilities use kebab-case (`auth-store.ts`, `error-handler.ts`), and server modules are organized as `<feature>/<feature>.(controller|service|validator).ts`. Prefer small, focused modules and reuse `packages/shared` before adding new abstractions.

## Testing Guidelines
Vitest is configured at the repo root and in `apps/server` and `packages/shared`. Place tests beside supporting helpers in `__tests__` folders and use `*.test.ts` naming, as in `apps/server/src/test-utils/__tests__/health.test.ts`. Run `pnpm test` before opening a PR; use `pnpm --filter @tang/server test` or `pnpm --filter @tang/shared test` for package-level work.

## Commit & Pull Request Guidelines
Current history is sparse and uses short summaries, so keep commit subjects brief and descriptive. Prefer an imperative first line and include context in the body when needed. This repo’s workflow also expects Lore-style trailers when the change carries decisions or risk, for example `Constraint:`, `Rejected:`, and `Tested:`. PRs should include a clear summary, affected apps/packages, verification steps, linked issues, and screenshots for UI changes.

## Security & Configuration Tips
Keep secrets in environment files loaded by `apps/server`; never commit credentials or uploaded user data. Avoid adding new dependencies unless the existing workspace packages cannot cover the need.
