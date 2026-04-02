# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> See `AGENTS.md` for full conventions (naming, imports, TypeScript rules, error handling, change strategy).

## Commands

```bash
pnpm dev          # start dev server (Express + Vite HMR)
pnpm build        # Vite client build + esbuild server bundle
pnpm check        # tsc --noEmit (excludes *.test.ts)
pnpm lint         # eslint
pnpm lint:fix     # eslint --fix
pnpm format       # prettier --write
pnpm test         # vitest run (server tests only)
pnpm test:live    # live API price-fetching tests

# Run a single test file
pnpm exec vitest run server/holdings.test.ts
# Run a single test by name
pnpm exec vitest run server/holdings.test.ts -t "should add a new holding"

pnpm db:push      # apply schema to DB
pnpm db:migrate   # run migrations
```

**Validation baseline before committing:** `pnpm check` + `pnpm lint` + relevant test file. Run `pnpm build` for frontend or routing changes.

## Architecture

Full-stack TypeScript monorepo. Single `package.json` at the root.

### Request flow

Browser → Wouter router → TanStack Query → tRPC client (`/api/trpc`) → Express → tRPC procedure → Drizzle/MySQL

### Server (`server/`)

- **`_core/`** — infrastructure: Express bootstrap (`index.ts`), tRPC init + middleware (`trpc.ts`), auth context (`context.ts`), OAuth/JWT (`sdk.ts`, `cookies.ts`), Claude client (`llm.ts`), Vite wiring (`vite.ts`).
- **`routers.ts`** — single `appRouter` that composes all tRPC branches: `auth`, `assets`, `holdings`, `prices`, `portfolio`, `portfolioHistory`, `strategy`, `fund`, `stock`, `system`.
- **`db.ts`** — Drizzle instance, connection pool, DB helper functions.
- **`priceService.ts`** — fetches/caches real-time prices (Finnhub, EODHD, crypto).
- **`strategyAdvisor.ts`** — AI portfolio recommendations via Claude.

**tRPC procedure tiers:** `publicProcedure` → `protectedProcedure` → `nonGuestProcedure` → `adminProcedure`.

### Client (`client/src/`)

- **`App.tsx`** — Wouter routes: `/` (Home), `/dashboard`, `/import`, `/strategy`, `/wallet-planning`.
- **`pages/`** — route-level screens.
- **`components/`** — feature components; `components/ui/` for Radix-based primitives.
- **`lib/trpc.ts`** — tRPC + TanStack Query client setup.
- **`lib/navigation.ts`** — centralised route constants.
- Theming and language via React contexts (`contexts/`).

### Database schema (`drizzle/schema.ts`)

Six tables: `users`, `assets` (symbol + type: currency|crypto|stock|fund), `holdings` (quantity + costBasis), `prices` (cached real-time), `priceHistory`, `portfolioValueHistory`.

### Auth

JWT stored in cookie → validated by Manus OAuth SDK in `createContext` → populates `ctx.user`. Guest mode allows read-only exploration; `nonGuestProcedure` blocks writes for guests.

### Path aliases

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `client/src/*` |
| `@shared/*` | `shared/*` |

### Key env vars

`DATABASE_URL`, `DEV_USER_EMAIL` (dev bypass), `JWT_SECRET`, `FINNHUB_API_KEY`, `OWNER_OPEN_ID`. Copy `.env.example` to `.env` to get started.
