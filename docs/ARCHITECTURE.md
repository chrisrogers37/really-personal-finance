# Architecture Guide

This document describes the overall system architecture of Really Personal Finance, the design patterns used, and how every part of the codebase fits together. Read this first before working on any feature or bug fix.

## System Overview

Really Personal Finance is a full-stack personal finance tracker built on Next.js. It connects to real bank accounts through the Plaid API, stores transactions in a PostgreSQL database, presents analytics through a web dashboard, and pushes spending alerts via a Telegram bot.

```
                         +-------------------+
                         |   User's Browser  |
                         +--------+----------+
                                  |
                                  | HTTPS
                                  v
                         +-------------------+
                         |    Next.js App    |
                         |   (App Router)    |
                         |                   |
                         | - React pages     |
                         | - API routes      |
                         | - Middleware       |
                         +--+------+------+--+
                            |      |      |
               +------------+      |      +-----------+
               |                   |                   |
               v                   v                   v
      +--------+------+  +--------+------+  +---------+------+
      | Neon Postgres  |  |   Plaid API   |  | Telegram Bot   |
      | (via Drizzle)  |  |               |  |     API        |
      +---------------+   +---------------+  +----------------+
                                  ^
                                  |
                         +--------+----------+
                         |   Vercel Cron     |
                         | (scheduled jobs)  |
                         +-------------------+
```

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js (App Router) | 16.1.6 | Server-side rendering, API routes, routing |
| Language | TypeScript | 5.x | Type safety across the entire codebase |
| UI | React | 19.2.3 | Component-based frontend |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Charts | Recharts | 3.7.0 | Bar charts, pie charts |
| Icons | Lucide React | 0.563.0 | Dashboard sidebar icons |
| Database | PostgreSQL (Neon) | - | Serverless Postgres via HTTP driver |
| ORM | Drizzle ORM | 0.45.1 | Type-safe SQL query builder |
| Auth | NextAuth.js v5 | 5.0.0-beta.30 | Email magic link authentication |
| Banking | Plaid SDK | 41.1.0 | Bank account linking and transaction sync |
| Alerts | Telegram Bot API | - | Spending notifications (via raw fetch) |
| Testing | Vitest | 3.2.4 | Unit test runner |
| Deployment | Vercel | - | Hosting, serverless functions, cron jobs |

## Directory Structure

```
src/
  app/                      # Next.js App Router (pages + API routes)
    api/                    # Backend API endpoints
      analytics/            # Spending breakdown endpoints
      auth/                 # NextAuth handler
      cron/                 # Scheduled job endpoints
      plaid/                # Plaid integration endpoints
      profile/              # User profile CRUD
      telegram/             # Telegram bot webhook
      transactions/         # Transaction query endpoint
    auth/                   # Auth UI pages (signin, verify, error)
    dashboard/              # Dashboard UI pages
    profile/                # Profile settings page
    layout.tsx              # Root layout (fonts, providers)
    page.tsx                # Public landing page
  components/               # Reusable React components
  db/                       # Database client and schema
  lib/                      # Shared business logic
  types/                    # TypeScript interfaces
  middleware.ts             # Route protection
  __tests__/                # Unit tests
```

## Request Lifecycle

### Authenticated Page Request

1. Browser requests `/dashboard`
2. `middleware.ts` intercepts the request
3. Middleware calls `auth()` from NextAuth to check for a valid session
4. If no session exists, middleware redirects to `/auth/signin`
5. If session exists, the request passes through to the page component
6. The page component renders on the client (`"use client"`)
7. The component makes `fetch()` calls to API routes (e.g., `/api/analytics/income-vs-spending`)
8. The API route calls `auth()` again to verify the session and extract `user.id`
9. The API route queries the database scoped to that `user.id`
10. JSON response returns to the frontend, which renders charts/tables

### Cron Job Request

1. Vercel Cron sends a GET request to `/api/cron/sync-transactions` at 6:00 AM UTC
2. The cron route is exempt from middleware auth (see `middleware.ts` lines 14-16)
3. The route verifies `Authorization: Bearer <CRON_SECRET>` header
4. The route queries all bank accounts from the database
5. For each Plaid item, it decrypts the access token and calls the Plaid sync API
6. New/modified/removed transactions are written to the database
7. The cursor is updated for the next incremental sync

### Telegram Webhook Request

1. User sends a message to the Telegram bot
2. Telegram sends a POST to `/api/telegram/webhook`
3. The route is exempt from middleware auth
4. The route verifies `X-Telegram-Bot-Api-Secret-Token` using timing-safe comparison
5. The route parses the command (`/start`, `/pause`, `/resume`, `/summary`)
6. The route updates the database and sends a reply via the Telegram Bot API

## Core Design Patterns

### SCD2 (Slowly Changing Dimension Type 2) for User Profiles

The `users` table uses the SCD2 pattern from data warehousing. Instead of updating a user row in place, updates **close** the current row and **insert** a new one. This gives you a full audit trail of every profile change.

**Key concepts:**
- `id` (uuid) is the **row key** -- unique per row, changes with each version
- `user_id` (uuid) is the **business key** -- stable across all versions of a user
- `is_current` (boolean) -- `true` for the active version, `false` for historical
- `valid_from` / `valid_to` (timestamps) -- when this version was active

**How an update works** (see `src/lib/scd2.ts`):
1. Read the current row (`is_current = true`)
2. Within a database transaction:
   a. Close the current row: set `valid_to = now`, `is_current = false`
   b. Insert a new row with the updated fields, `valid_from = now`, `is_current = true`
3. If either step fails, both are rolled back

**Querying current data:**
All queries for "current" user data filter on `is_current = true`. Foreign keys in other tables reference `user_id` (the business key), not `id` (the row key).

**Why this matters for you:**
- Never `UPDATE` the `users` table directly -- always go through `updateUserProfile()` in `src/lib/scd2.ts`
- When adding new columns to the `users` table, carry forward the value in the SCD2 insert
- The profile history endpoint (`/api/profile/history`) returns all versions

### Cursor-Based Plaid Sync

The transaction sync uses Plaid's `transactionsSync` API with a stored cursor. This is an incremental sync pattern:

1. First sync: `cursor` is `null`, Plaid returns all historical transactions (up to 730 days)
2. Subsequent syncs: pass the stored `cursor`, Plaid returns only changes since last sync
3. The response includes `added`, `modified`, and `removed` transaction arrays
4. After processing, store `next_cursor` for the next sync
5. If `has_more` is `true`, loop and fetch more pages (500 transactions per page)

The cursor is stored on each row of the `accounts` table. All accounts sharing the same `plaid_item_id` share an access token, so they are synced together and all get the same cursor value.

### Encrypted Token Storage

Plaid access tokens grant permanent access to a user's bank data. They are encrypted at rest using AES-256-GCM before being stored in the `accounts.plaid_access_token` column.

- **Encryption happens** in `/api/plaid/exchange-token` when the token is first obtained
- **Decryption happens** in `/api/cron/sync-transactions` when the token is needed for API calls
- See `src/lib/encryption.ts` for the implementation and `docs/SECURITY.md` for details

### Denormalized `user_id` on Transactions

The `transactions` table includes a `user_id` column even though each transaction already has an `account_id` that belongs to a user. This is an intentional denormalization:

- **Why:** Most queries filter by user first (`WHERE user_id = ?`). Without denormalization, every query would need a JOIN through `accounts` to find the user.
- **Tradeoff:** Minor data redundancy (one extra UUID per transaction row).
- **Rule:** When inserting transactions, always set both `account_id` AND `user_id`.

## Data Flow Diagram

```
  User signs up              User connects bank         Daily cron
  ──────────────             ──────────────────         ──────────
  1. Email magic link  -->   1. PlaidLink UI opens -->  1. CRON_SECRET verified
  2. Verification token -->  2. User picks bank    -->  2. All accounts fetched
  3. User row created  -->   3. Public token sent  -->  3. Access tokens decrypted
  (SCD2 initial version)     4. Exchanged for      -->  4. transactionsSync called
                                access token            5. Transactions upserted
                             5. Token encrypted    -->  6. Cursor updated
                             6. Accounts saved     -->
                                                        7. Alerts sent (if enabled)
```

## Module Dependency Graph

```
middleware.ts
  └── lib/auth.ts

lib/auth.ts
  ├── lib/scd2.ts
  ├── db/index.ts
  └── db/schema.ts

lib/scd2.ts
  ├── db/index.ts
  └── db/schema.ts

lib/alerts.ts
  ├── db/index.ts
  ├── db/schema.ts
  ├── lib/telegram.ts
  └── lib/utils.ts

lib/encryption.ts  (standalone, uses Node crypto)
lib/plaid.ts       (standalone, configures Plaid SDK)
lib/telegram.ts    (standalone, uses fetch)
lib/validation.ts  (standalone, uses Node crypto)
lib/utils.ts       (standalone, uses clsx + tailwind-merge)

API Routes all import from:
  ├── lib/auth.ts    (session verification)
  ├── db/index.ts    (database queries)
  ├── db/schema.ts   (table references)
  └── lib/*.ts       (business logic)
```

## Key Files Reference

| File | Purpose | When to modify |
|------|---------|----------------|
| `src/db/schema.ts` | All database table definitions | Adding columns, tables, or indexes |
| `src/lib/auth.ts` | NextAuth config + custom DB adapter | Changing auth flow or session behavior |
| `src/lib/scd2.ts` | SCD2 profile update/history logic | Changing how profile updates work |
| `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt | Never (unless changing algorithms) |
| `src/lib/alerts.ts` | Telegram alert message generation | Adding new alert types or changing formatting |
| `src/lib/plaid.ts` | Plaid SDK client setup | Changing Plaid configuration |
| `src/middleware.ts` | Route protection rules | Adding new protected/public routes |
| `src/types/index.ts` | Shared TypeScript interfaces | Adding new data shapes used by multiple files |
| `vercel.json` | Cron job schedule | Changing sync/alert timing |
| `drizzle.config.ts` | Database migration config | Changing schema output path |

## Adding a New Feature: Checklist

1. **Database changes?** Edit `src/db/schema.ts`, run `npm run db:generate`, then `npm run db:push`
2. **New API endpoint?** Create a route file under `src/app/api/`. Follow the auth pattern from existing routes.
3. **New page?** Create under `src/app/dashboard/` for authenticated pages, `src/app/` for public pages
4. **New component?** Add to `src/components/`. Use `"use client"` directive for interactive components.
5. **New library function?** Add to `src/lib/`. Write tests in `src/__tests__/`.
6. **New cron job?** Add the endpoint and register it in `vercel.json`. Protect with CRON_SECRET.
7. **New type?** Add to `src/types/index.ts` if shared, or define locally if used in one file.
