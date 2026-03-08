# AGENTS.md

Repository guide for coding agents working in `asset-tracker`.

## Stack and layout

- Full-stack TypeScript application.
- Frontend: React 19, Vite, Wouter, TanStack Query, tRPC, Tailwind CSS v4.
- Backend: Node server entry at `server/_core/index.ts`.
- Database: Drizzle ORM with MySQL.
- Tests: Vitest in `server/**/*.test.ts` and `server/**/*.spec.ts`.

## Important directories

- `client/src/`: app code.
- `client/src/components/ui/`: shared UI primitives.
- `client/src/pages/`: route-level screens.
- `client/src/lib/`: utilities like `trpc` and `utils`.
- `server/`: routers, DB access, services, tests.
- `server/_core/`: runtime, env, auth, tRPC setup.
- `shared/`: shared constants and types.
- `drizzle/`: schema and migration output.
- `scripts/`: repo helper scripts.

## Package manager

- Prefer `pnpm`; it is pinned in `package.json`.
- `package-lock.json` exists, but npm does not appear to be the primary workflow.

## Environment

- Start from `.env.example`.
- Commonly referenced variables: `DATABASE_URL`, `DEV_USER_EMAIL`, `JWT_SECRET`, `FINNHUB_API_KEY`, `OWNER_OPEN_ID`, plus OAuth variables from `.env.example`.
- `drizzle.config.ts` throws if `DATABASE_URL` is missing.

## Commands

Run from repo root.

### Install

- `pnpm install`

### Development

- `pnpm dev`
  - Runs `tsx watch server/_core/index.ts`.

### Build and start

- `pnpm build`
  - Builds the client with Vite and bundles the server with esbuild.
- `pnpm start`

### Typecheck / format / lint baseline

- `pnpm check`
  - Runs `tsc --noEmit`.
  - Note: `tsconfig.json` excludes `**/*.test.ts`, so tests are not typechecked here.
- `pnpm lint`
  - Runs ESLint across the repo.
- `pnpm lint:fix`
  - Runs ESLint with automatic fixes.
- `pnpm format`
  - Runs Prettier over the repo.
- Current validation baseline is `pnpm lint` + `pnpm check` + relevant tests.

### Tests

- `pnpm test`
  - Runs `vitest run`.
- `pnpm test:live`
  - Runs external live API integration tests only.
  - Requires working network access and is intentionally excluded from the default test baseline.
- Single file:
  - `pnpm exec vitest run server/holdings.test.ts`
  - `pnpm test -- server/holdings.test.ts`
- Filter by test name:
  - `pnpm exec vitest run -t "addHolding"`
  - `pnpm exec vitest run server/holdings.test.ts -t "should add a new holding with quantity"`

### Database

- `pnpm db:push`
- `pnpm db:migrate`
- `pnpm check-db`

## Test conventions

- Vitest config lives in `vitest.config.ts`.
- Environment is `node`.
- Existing tests mostly use `vi.mock(...)`, `beforeEach`, `describe`, `it`, and `expect`.
- Server behavior changes should usually get targeted Vitest coverage first.
- Live network tests are opt-in via `LIVE_API_TESTS=1` and `pnpm test:live`.
- Default `pnpm test` skips network-dependent API tests so local runs and CI stay deterministic.

## CI

- GitHub Actions workflow: `.github/workflows/ci.yml`.
- CI runs on pushes to `main` / `master` and on pull requests.
- CI steps:
  1. `pnpm install --frozen-lockfile`
  2. `pnpm lint`
  3. `pnpm check`
  4. `pnpm test`
  5. `pnpm build`
- Live API tests are not part of the default CI workflow.

## Existing instruction files

- No prior root `AGENTS.md` existed.
- No `.cursorrules` file exists.
- No `.cursor/rules/` directory exists.
- No `.github/copilot-instructions.md` exists.

## Formatting rules

- Derived from `.prettierrc` and existing code.
- Use semicolons.
- Use double quotes.
- Keep lines near 80 columns.
- Use 2-space indentation.
- Keep trailing commas where Prettier inserts them (`es5`).
- Prefer `arrowParens: avoid` formatting when Prettier applies it.
- Let Prettier own formatting; do not hand-format against config.

## TypeScript rules

- `strict: true` is enabled.
- Preserve strict typing; do not weaken types to force code through.
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Prefer explicit types for exported functions and reusable helpers.
- Use `type` imports where appropriate.
- Prefer shared types from `@shared/*` or `shared/types.ts` when available.
- Runtime validation at API boundaries is commonly done with `zod`.

## Import conventions

- Frontend commonly uses `@/` → `client/src/*` and `@shared/` → `shared/*`.
- Server code usually uses relative imports within `server/` and `server/_core/`.
- Keep imports grouped logically: external packages, shared aliases, then local relative imports.
- Match surrounding file style before aggressively reordering imports; some files are mixed.

## Naming conventions

- React components and files: `PascalCase`.
- Hooks: `useXxx`.
- Utilities and helpers: `camelCase`.
- Stable constants and label maps: `UPPER_SNAKE_CASE`.
- DB/service/helper functions use descriptive verbs like `getUserHoldings`, `fetchAssetPrice`, `recordPortfolioValue`.
- tRPC router branches are nouns like `auth`, `assets`, `holdings`, `prices`, `portfolio`.

## Frontend conventions

- Prefer function components.
- Prefer local hook/state composition before adding abstraction layers.
- Reuse primitives from `client/src/components/ui/` before creating new base components.
- Use `cn(...)` from `@/lib/utils` for class merging.
- Wouter is the router; route screens live in `client/src/pages/`.
- Follow the local file’s alias-vs-relative import style instead of normalizing unrelated code.

## Backend conventions

- tRPC procedures are built from `publicProcedure`, `protectedProcedure`, and `adminProcedure`.
- Validate router input with `z.object(...)`.
- Keep DB access in `server/db.ts` or a nearby service module.
- Extract helper functions when router handlers grow too large.
- Preserve lazy DB initialization behavior unless infra is intentionally changing.

## Error handling

- Use `TRPCError` for auth/permission failures in tRPC paths.
- Use plain `Error` for generic failures when no richer domain error exists.
- Log operational issues with useful context via `console.error` / `console.warn`.
- Avoid empty `catch` blocks.
- If keeping best-effort fallback behavior, add a short comment explaining why.
- Do not silently swallow important failures.

## Change strategy

- Make minimal, focused changes.
- Follow surrounding style even if parts of the repo are older or inconsistent.
- Do not clean up unrelated files while fixing a bug.
- Do not add dependencies unless necessary.
- Do not commit unless explicitly asked.

## Recommended validation order

1. Run a targeted Vitest file for affected server behavior.
2. Run `pnpm lint`.
3. Run `pnpm check`.
4. Run `pnpm test` for broader or riskier changes.
5. Run `pnpm build` for cross-stack, routing, or bundling changes.
