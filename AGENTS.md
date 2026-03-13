# AGENTS.md

Operational guide for coding agents working in `asset-tracker`.

## Project snapshot

- Full-stack TypeScript app.
- Frontend: React 19, Vite, Wouter, TanStack Query, tRPC, Tailwind CSS v4.
- Backend: Express + tRPC, runtime entry at `server/_core/index.ts`.
- Database: MySQL with Drizzle ORM.
- Tests: Vitest, server-side only by default.
- Package manager: `pnpm` (`packageManager` is pinned in `package.json`).

## Repository layout

- `client/src/` — frontend app code.
- `client/src/pages/` — route-level screens.
- `client/src/components/` — app components.
- `client/src/components/ui/` — reusable UI primitives.
- `client/src/lib/` — helpers such as `trpc`, utils, localization, config.
- `server/` — routers, services, DB helpers, tests.
- `server/_core/` — auth, env, tRPC setup, Vite wiring.
- `shared/` — shared constants and types.
- `drizzle/` — generated DB artifacts.
- `scripts/` — helper scripts.

## Rule files and agent instructions

- Root `AGENTS.md` exists and should be kept current.
- No `.cursorrules` file exists.
- No `.cursor/rules/` directory exists.
- No `.github/copilot-instructions.md` exists.

## Environment notes

- Run commands from repo root.
- Start from `.env.example` if present.
- `drizzle.config.ts` requires `DATABASE_URL`.
- Common env vars used in code include:
  - `DATABASE_URL`
  - `DEV_USER_EMAIL`
  - `JWT_SECRET`
  - `FINNHUB_API_KEY`
  - `OWNER_OPEN_ID`
  - OAuth-related variables

## Core commands

### Install / dev / build

- `pnpm install`
- `pnpm dev` — runs `NODE_ENV=development tsx watch server/_core/index.ts`
- `pnpm build` — Vite client build + esbuild server bundle
- `pnpm start`

### Typecheck / lint / format

- `pnpm check` — `tsc --noEmit`
- `pnpm lint` — `eslint .`
- `pnpm lint:fix` — `eslint . --fix`
- `pnpm format` — `prettier --write .`

### Tests

- `pnpm test` — `vitest run`
- `pnpm test:live` — runs live API tests only:
  - `server/price-fetching.test.ts`
  - `server/real-price-api.test.ts`
  - `server/real-crypto-prices.test.ts`

### Run a single test

- Single file:
  - `pnpm exec vitest run server/holdings.test.ts`
  - `pnpm test -- server/holdings.test.ts`
- Single file + test name:
  - `pnpm exec vitest run server/holdings.test.ts -t "should add a new holding with quantity"`
- Name filter across files:
  - `pnpm exec vitest run -t "addHolding"`

### Database

- `pnpm db:push`
- `pnpm db:migrate`
- `pnpm check-db`

## Validation expectations

- Default baseline: `pnpm check` + `pnpm lint` + relevant tests.
- CI also runs `pnpm test` and `pnpm build`.
- For server logic changes, start with the narrowest relevant Vitest file.
- For frontend/routing changes, run `pnpm check` and usually `pnpm build`.
- `tsconfig.json` excludes `**/*.test.ts`, so tests are not covered by `pnpm check`.

## Test setup

- Vitest config: `vitest.config.ts`.
- Test environment: `node`.
- Included test files:
  - `server/**/*.test.ts`
  - `server/**/*.spec.ts`
- Vitest aliases:
  - `@` → `client/src`
  - `@shared` → `shared`
  - `@assets` → `attached_assets`

## Formatting rules

- Prettier is authoritative.
- Use semicolons.
- Use double quotes.
- `printWidth: 80`.
- `tabWidth: 2`, no tabs.
- Keep trailing commas where Prettier inserts them (`es5`).
- Prefer `arrowParens: avoid`.
- `endOfLine: lf`.

## ESLint rules that matter

- `react-hooks/rules-of-hooks`: error.
- `react-hooks/exhaustive-deps`: warn.
- `import/no-duplicates`: error.
- `import/order`: error.
- `@typescript-eslint/consistent-type-imports`: error.
- `@typescript-eslint/no-explicit-any`: error outside tests.
- Unused vars are errors unless prefixed with `_`.
- `react-refresh/only-export-components` is enabled except in a few UI/context files.

## TypeScript rules

- `strict: true` is enabled.
- Do not weaken types just to pass checks.
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Prefer explicit types for exported helpers and reusable functions.
- Use `import type` where appropriate.
- Prefer shared types from `@shared/*` when they already exist.
- Runtime validation at API boundaries is typically done with `zod`.

## Import conventions

- Path aliases:
  - `@/*` → `client/src/*`
  - `@shared/*` → `shared/*`
- Server code usually uses relative imports within `server/` and `server/_core/`.
- Import order should follow ESLint config:
  1. builtin
  2. external
  3. internal aliases (`@/`, `@shared/`)
  4. parent / sibling / index
  5. type imports
- Keep blank lines between groups.
- Follow surrounding file style if a file is already slightly mixed.

## Naming conventions

- React components and page files: `PascalCase`.
- Hooks: `useXxx`.
- Helpers/utilities/functions: `camelCase`.
- Constants and label maps: `UPPER_SNAKE_CASE` when shared/static.
- tRPC router branches use noun-based names like `assets`, `holdings`, `prices`, `portfolio`, `fund`.
- Prefer descriptive verbs for server helpers, e.g. `fetchAssetPrice`, `recordPortfolioValue`.

## Frontend conventions

- Prefer function components.
- Prefer local state and composition before new abstractions.
- Reuse `client/src/components/ui/` primitives before creating new base components.
- Use `cn(...)` from `@/lib/utils` for class merging.
- Wouter handles routing; route screens live in `client/src/pages/`.
- Where a page already uses bilingual text objects / `useLanguage`, preserve that pattern.
- Static page config is often better extracted to `client/src/lib/` when a page gets heavy.

## Backend conventions

- tRPC procedures are built with `publicProcedure`, `protectedProcedure`, and `adminProcedure`.
- Validate inputs with `z.object(...)`.
- Keep DB access in `server/db.ts` or adjacent service modules.
- Extract helpers when router handlers get large.
- Preserve lazy DB initialization behavior unless intentionally changing infrastructure.

## Error handling

- Use `TRPCError` for auth/permission failures in tRPC paths.
- Use plain `Error` for generic failures when no richer type exists.
- `console.warn` / `console.error` with useful context is normal in server code.
- Avoid empty `catch` blocks.
- Do not silently swallow important failures.
- Make intentional fallback behavior obvious in code.

## Change strategy for agents

- Make minimal, focused changes.
- Follow existing patterns before introducing new ones.
- Do not refactor unrelated files while fixing a bug.
- Do not add dependencies unless necessary.
- Do not commit unless explicitly asked.

## Recommended workflow

1. Read relevant config and nearby similar files first.
2. Prefer the smallest coherent change.
3. Run the narrowest relevant test first.
4. Run `pnpm check`.
5. Run `pnpm lint` and `pnpm build` when the change warrants it.
