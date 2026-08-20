# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Node.js + Express + TypeScript backend for **Toko Profil Indah** — an inventory,
sales, and accounting system. Core domains: products (brand/type/unit/package),
stock (in/out/card/HPP), suppliers, customers, sales invoices, purchase invoices,
good receipts, expenses, deposits, receivables, promotions, and reporting.

Package name `profil_indah_node`, owned by PT Terra Nusa Teknologi.

## Running the Application

```bash
npm install
npm start            # nodemon src/app.ts (dev, ts-node)
npm run build        # tsc -> dist/
npm test             # jest
npm run check        # route-guard + sql-injection static checks
npm run pretty       # prettier --write on all .ts
```

Background worker and one-off maintenance jobs:

```bash
npm run start:worker           # BullMQ worker (src/worker.ts)
npm run start:setup            # provision Meilisearch indexes
npm run start:setup-database   # startup.ts setupDatabase
npm run start:sync-product     # startup.ts syncProduct  (see package.json for the full list)
```

**External services expected** (all localhost by default): MySQL (Prisma),
Redis, Meilisearch.

## Architecture

**MVC + Repository pattern, layered:**

- `src/routes/` — Express routers, one flat file per resource, suffix
  `.route.ts`. **No subfolders.** They used to exist (`master/`,
  `transaction/`, `distinct/`, …) but they never matched the mount prefixes —
  `master/customer.route.ts` mounts at `/customer`, not `/master/customer` —
  so they grouped by a taxonomy that nothing else in the system used.
  `src/app.ts` is the real index: every router appears there with its actual
  URL prefix.
- `src/controllers/` — request handling and orchestration (one class per domain).
- `src/services/` — reusable business logic shared across controllers.
- `src/repositories/` — Prisma-based data access (MySQL).
- `src/models/` — domain models / DTOs.
- `src/schemas/` — Zod validation schemas (see "Validation" below).
- `src/utils/` — cross-cutting utilities: database, auth, redis, meili,
  search, queue, socket, sql, escape, date, error, validate.
- `src/interfaces/` — **every** TypeScript interface, one file per domain.
- `src/constants/` — **every** constant and enum, one file per group.

**Entry point:** `src/app.ts` — builds the Express app, wires global middleware
(`compression`, `helmet`, `cors`, body parsers), then mounts every router.
Most routers are mounted **with an auth guard at mount time**, e.g.
`app.use("/product", authMiddleware, productRoutes)`.

**Worker:** `src/worker.ts` — BullMQ worker for async jobs (notifications,
stock/HPP processing). Queues are defined in `src/utils/queue.helper.ts`.

**CLI:** `src/startup.ts` — one-off maintenance commands dispatched by argv
(`setupDatabase`, `syncProduct`, `syncProductPackage`, `updateProductStock`,
`insertStockInOut`, `insertStockOut`, `calculateStockOut`, `insertStockCard`,
`orderStockCard`, `syncSales`). Exposed as `npm run start:*` scripts.

## Key Patterns

**Validation is migrating from express-validator to Zod.** New/updated routes
use a Zod schema from `src/schemas/` applied through the `validate()` middleware
in `src/utils/validate.helper.ts`. Older routes still use express-validator
chains terminated by `ErrorHelper.intercept`. Both produce the **same error
shape**: HTTP 400 with a raw string body (the first failing message, not JSON) —
the frontend renders `error.error` verbatim, so do not change the shape.

**Zod schemas are deliberately stricter than the chains they replaced.**
express-validator stringifies every value before checking it, so `isInt()`
accepted `"5"` and `notEmpty()` accepted `123` and even objects (stored as
`"[object Object]"`). On `req.body` the schemas use `z.number()`/`z.string()`
and reject both. This is a real behavior change and must ship with the
frontend. `req.params`/`req.query` are exempt — values there are always text,
so use the `*FromText` helpers. The policy is documented in
`src/schemas/common.schema.ts` and locked by
`tests/strict-policy.schema.test.ts`; that guard exists because the change
first slipped in untested, every migration case having happened to use the
already-correct type.

**`validate()` never overwrites the request.** Auth middleware writes `userId`
and `role` onto `req.body`; the Zod bridge only `safeParse`s and passes through,
so it must not replace `req.body`/`req.query` with the parse result or the
caller identity is lost. Field order in a schema determines which message
surfaces first — keep it aligned with the old validator chain order.

**Auth via JWT Bearer tokens.** Middlewares live in `src/utils/auth.helper.ts`
and verify the token with `TOKEN_KEY`, injecting `userId`/`role` into the
request. Guards, by increasing privilege:
- `authMiddleware` — any authenticated user
- `authMiddlewareRole` / `requireRole(levels[])` — specific access levels
- `administratorMiddleware` — admin
- `superadministratorMiddleware` — super admin
- `putriForbiddenMiddleware` — domain-specific exclusion guard

`accessLevel` runs 0–4 on the user record. Access + refresh tokens use
`TOKEN_KEY` / `REFRESH_TOKEN_KEY` with `EXPIRATION` / `REFRESH_EXPIRATION`.

**One database.** All persistent data is in **MySQL via Prisma**
(`src/repositories/`, `prisma/schema.prisma`); Redis holds cache and queue
state. MongoDB/Mongoose was removed — its connection had been commented out in
`worker.ts`, so every Mongo-backed path was already failing. Do not reintroduce
a second store: add a Prisma model instead.

**Search & cache.** Meilisearch powers full-text product/supplier search
(`src/utils/meili.helper.ts`, `search.helper.ts`); Redis is used for caching
and queue backing (`src/utils/redis.helper.ts`).

**Raw SQL is guarded.** Any `prisma.$queryRaw` interpolation is tracked by a
baseline (`scripts/sql-injection-baseline.txt`). Prefer parameterized
`Prisma.sql` / tagged templates; new interpolation fails `npm run check`.

## Guardrails (`npm run check`)

Two static checks run in CI-style before commits:

- **`scripts/check-route-guards.js`** — walks every `*.route.ts` block and
  fails if a route has no authorization middleware (at `app.use` mount,
  `router.use`, or per-route). Public routes are explicitly allow-listed
  (currently only `POST /auth/login` and `POST /auth/refresh-token`).
- **`scripts/check-sql-injection.js`** — compares raw-query interpolation
  against `scripts/sql-injection-baseline.txt`; any *new* interpolation fails.

`scripts/smoke-test.js` is a lightweight end-to-end sanity check.

## Testing

Jest + ts-jest. Tests live in `tests/` (outside `src/`) and use a separate
`tsconfig.test.json` so jest global types don't leak into the production build,
and so the test `rootDir` can sit above `src/`. ts-jest ignores implicit-any
codes (7006/7031) because the Prisma client types only exist after
`prisma generate`; **real type-checking is `npm run build`**, not the test run.

Run `prisma generate` before `npm test` on a fresh checkout.

## Database

Prisma schema in `prisma/schema.prisma` (MySQL). Prisma-managed migrations live
in `prisma/migrations/`. Hand-run index/tuning SQL that is **not** a Prisma
migration lives in `docs/` (e.g. `docs/index-tuning.sql`) — apply it manually,
section by section, never all at once.

Many tables carry an audit trail (`createdAt`/`createdBy`, `deletedAt`) and use
soft delete — filter out deleted rows in queries.

## Environment

Environment files are gitignored; `.env.example` documents the required
variables. There are **two** of them, chosen by `NODE_ENV` in
`src/utils/env.helper.ts` — `.env.development` locally, `.env.production` on
the server, with a plain `.env` read afterwards as a fallback. Prisma's CLI
only ever looks for `.env`, so that name is a symlink to whichever file
applies; without it `prisma migrate` would target a different database than
the app. **The loader must stay the first import of every entry point**
(`app.ts`, `worker.ts`, `startup.ts`) — modules that read `process.env` while
being loaded otherwise see `undefined`.

```
DATABASE_URL="mysql://user:sandi@localhost:3306/nama_database"
TOKEN_KEY="..."
REFRESH_TOKEN_KEY="..."
EXPIRATION="1h"
REFRESH_EXPIRATION="7d"
```

Redis and Meilisearch connection settings are read where their helpers
are initialized. **Never commit runtime state** — Redis dumps (`dump.rdb` and
any renamed copy), the Meilisearch `data.ms/` index, and `.env` all contain real
business and user data.

## Conventions

**Interfaces live in `src/interfaces/`, constants in `src/constants/` — always.**
An interface or a constant must never be declared inside a model, controller,
repository, or helper, even when only that one file uses it. One file per
domain, named `<domain>.interface.ts` and `<domain>.ts` respectively. A model
file holds a class and nothing else — `achivement` is the worked example:
`constants/achivement.ts` (the threshold table), `interfaces/achivement.interface.ts`
(`IAchivement`), `models/achivement.model.ts` (the class). Express-validator
chains are middleware, not constants; leave those beside their routes.

- TypeScript throughout; formatted with Prettier (`npm run pretty`) — 2-space
  indent, double quotes, semicolons, trailing commas.
- File naming: kebab-case with a role suffix, **every file in every layer** —
  `*.route.ts`, `*.controller.ts`, `*.repository.ts`, `*.model.ts`,
  `*.schema.ts`, `*.interface.ts`, `*.constant.ts`, `*.helper.ts`. No
  exceptions, no snake_case, no dots as separators.
- Exported identifiers are English; comments and local variable names are
  Indonesian. A file therefore reads as English API surface with Indonesian
  reasoning around it.
- Comments and validation messages are written in **Indonesian**; keep new ones
  consistent with that.
