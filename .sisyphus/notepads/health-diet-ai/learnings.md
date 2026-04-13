# Learnings

- Introduced Vitest-based test framework across monorepo with a minimal setup: root vitest.config.ts, root test scripts, and per-package tests for shared and server.
- Created lightweight mock utilities in shared to support realistic tests while staying type-safe with existing @tang/shared types.
- Added a small test bootstrap for the server to demonstrate integration-style test with Supertest.
- Current blocker: vitest not installed initially, fixed by pinning to a real registry version (Vitest 4.1.4) and wiring tests across packages/apps so `pnpm install` and `pnpm test` pass.
- Tests now cover shared mock utilities and a lightweight server health endpoint to demonstrate end-to-end testing with Supertest.
- Coverage provider now installed via real package @vitest/coverage-v8@4.1.4. Verification should pass the coverage step.
- Added per-package Vitest config (apps/server/vitest.config.ts and packages/shared/vitest.config.ts) and updated per-package test scripts to load local config. This fixes No test files found when filtering by package and ensures server/shared tests are discovered under their own workspaces.
- Next: validate CI runs and ensure coverage collection reports are produced; adjust include patterns if more tests are added.
- Auth backend slices fit cleanly by composing a reusable `createApp()` and keeping each auth service instance's in-memory store local, which keeps Supertest integration tests isolated without extra resets.
- Node ESM runtime for `apps/server` requires explicit `.js` extensions in TypeScript relative imports once compiled; switching the package to `NodeNext` keeps emitted imports runtime-resolvable by `node dist/server.js`.
- Minimal refresh/logout can stay local and testable by storing issued refresh JWTs in-memory keyed to user IDs, reusing JWT verification for refresh, and deleting the token on logout to invalidate it immediately.
- User profile CRUD follows the same factory pattern as auth: `createUserService()` for in-memory storage + business logic, `createUserRouter(service, requireAuth)` for route handling, and zod schemas in `user.validator.ts`. The auth middleware is passed as a `RequestHandler` dependency, keeping the user module decoupled from auth internals. BMR/TDEE uses Mifflin-St Jeor with activity multipliers and goal-based calorie offsets. PATCH requires an existing profile (returns 404 otherwise) while PUT always creates/replaces.
T27: Implemented AI Diet Plan Home Page. Reused existing auth state and api configuration. Created a simple empty state and generation flow calling backend. The BottomNav provides mobile-friendly structure. The page successfully queries current plan on mount. No global changes made outside of PlanPage and the routing pointing `/` to it.
