# Really Personal Finance — Implementation Plan

## Overview
A personal finance tracker that connects to real bank accounts via Plaid,
syncs transactions daily, and provides spending insights via a web dashboard
and Telegram bot alerts. Deployed on Vercel, public/open-source repo.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js    │────▶│ Vercel       │────▶│   Plaid     │
│   Frontend   │     │ Postgres     │     │   API       │
│   (React)    │     │ (Neon)       │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │              ┌─────┴──────┐
       │              │ Vercel     │
       │              │ Cron (daily)│
       │              └────────────┘
       │
 ┌─────┴──────┐
 │  Telegram  │
 │  Bot API   │
 └────────────┘
```

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Vercel Postgres (Neon under the hood)
- **ORM**: Drizzle ORM (lightweight, type-safe, SQL-like)
- **Auth**: NextAuth.js v5 — email magic link (signup + verification flow)
- **Banking**: Plaid API (sandbox → development → production)
- **Styling**: Tailwind CSS + shadcn/ui (charts via Recharts)
- **Alerts**: Telegram Bot API
- **Deployment**: Vercel (hobby tier to start)
- **Cron**: Vercel Cron Jobs (daily transaction sync)

## Security Considerations (Public Repo)
- All secrets via environment variables (never committed)
- `.env.example` with placeholder keys (no real values)
- `.gitignore` covers `.env*`, `.vercel`, node_modules
- Plaid access tokens encrypted at rest in DB
- Rate limiting on API routes
- Clear privacy notice: users' bank transactions are stored in the app's database

---

## Database Schema

### users (SCD2 — tracks full history of profile changes)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK (surrogate, unique per row) |
| user_id | uuid | Business key (stable across versions) |
| email | text | verified via magic link |
| name | text | nullable |
| email_verified | timestamp | when email was verified |
| valid_from | timestamp | when this version became active |
| valid_to | timestamp | null = current record |
| is_current | boolean | true = active version |
| created_at | timestamp | row insertion time |

All FKs in other tables point to `user_id` (business key), not `id`.
Queries filter on `is_current = true` for live data.
Profile updates close the current row (`valid_to = now, is_current = false`)
and insert a new row (`valid_from = now, is_current = true`).

### accounts (bank accounts via Plaid)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| plaid_item_id | text | Plaid item identifier |
| plaid_access_token | text | encrypted |
| plaid_account_id | text | Plaid account identifier |
| name | text | e.g. "Chase Checking" |
| type | text | checking, savings, credit |
| subtype | text | |
| mask | text | last 4 digits |
| cursor | text | Plaid sync cursor |
| created_at | timestamp | |

### transactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| account_id | uuid | FK → accounts |
| user_id | uuid | FK → users (denormalized for queries) |
| plaid_transaction_id | text | unique, from Plaid |
| amount | decimal | positive = money out |
| date | date | transaction date |
| name | text | raw merchant name from Plaid |
| merchant_name | text | cleaned merchant name |
| category_primary | text | Plaid primary category |
| category_detailed | text | Plaid detailed category |
| pending | boolean | |
| created_at | timestamp | |

### telegram_configs
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| chat_id | text | Telegram chat ID |
| enabled | boolean | default true |
| created_at | timestamp | |

---

## Implementation Phases

### Phase 1: Project Scaffold
- [x] Initialize Next.js 14 with TypeScript, Tailwind, App Router
- [x] Set up ESLint, Prettier, .gitignore
- [x] Create `.env.example` with all required env vars
- [x] Install and configure Drizzle ORM
- [x] Define database schema
- [x] Set up NextAuth.js with email provider

### Phase 1b: Auth & Profile Management
- [ ] Sign-up page (email input → magic link sent)
- [ ] Email verification flow (click link → verified, session created)
- [ ] Profile page (update name, email — triggers SCD2 row closure + new row)
- [ ] SCD2 helper: `updateUserProfile()` closes current row, inserts new version
- [ ] Auth middleware — protect dashboard routes, require verified email

### Phase 2: Plaid Integration
- [ ] Plaid client setup (sandbox mode)
- [ ] `/api/plaid/create-link-token` — generate Link token
- [ ] `/api/plaid/exchange-token` — exchange public token for access token
- [ ] Plaid Link React component (connect bank flow)
- [ ] Store access tokens + account info in DB

### Phase 3: Transaction Sync
- [ ] `/api/cron/sync-transactions` — daily cron endpoint
- [ ] Use Plaid `transactions/sync` endpoint (cursor-based)
- [ ] Pull up to 5 years of historical data on first sync
- [ ] Handle pending → posted transaction updates
- [ ] `vercel.json` cron configuration (daily at 6 AM UTC)

### Phase 4: Dashboard
- [ ] Layout: sidebar nav + main content area
- [ ] **Transaction list** — filterable by date range, merchant, category, account
- [ ] **Spending by category** — pie/donut chart + table breakdown
- [ ] **Spending by merchant** — bar chart, sorted by total spend, highlights recurring
- [ ] **Net income vs spending** — monthly bar chart, running summary

### Phase 5: Telegram Alerts
- [ ] Telegram bot setup instructions in README
- [ ] `/api/telegram/webhook` — receive messages, register chat ID
- [ ] Daily spending summary alert
- [ ] Weekly spending vs. baseline comparison
- [ ] Anomaly detection: "You spent $X more than usual this week at [merchant]"

### Phase 6: Polish & Deploy
- [ ] Landing page with privacy notice
- [ ] Responsive design (mobile-friendly)
- [ ] Error handling and loading states
- [ ] README with setup instructions
- [ ] Deploy to Vercel, configure env vars

---

## Environment Variables Needed

```bash
# Database
DATABASE_URL=              # Vercel Postgres connection string

# NextAuth
NEXTAUTH_URL=              # App URL (http://localhost:3000 locally)
NEXTAUTH_SECRET=           # Random secret for session encryption
EMAIL_SERVER=              # SMTP connection string for magic links
EMAIL_FROM=                # Sender email for magic links

# Plaid
PLAID_CLIENT_ID=           # From Plaid dashboard
PLAID_SECRET=              # From Plaid dashboard
PLAID_ENV=                 # sandbox | development | production
PLAID_PRODUCTS=            # transactions
PLAID_COUNTRY_CODES=       # US

# Telegram
TELEGRAM_BOT_TOKEN=        # From @BotFather

# Encryption
ENCRYPTION_KEY=            # For encrypting Plaid access tokens at rest
```

---

## File Structure

```
really-personal-finance/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, providers
│   │   ├── page.tsx                # Landing/home page
│   │   ├── auth/
│   │   │   ├── signin/page.tsx     # Sign in / sign up (email input)
│   │   │   ├── verify/page.tsx     # "Check your email" page
│   │   │   └── error/page.tsx      # Auth error page
│   │   ├── profile/
│   │   │   └── page.tsx            # Profile management (name, email)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Dashboard layout (sidebar)
│   │   │   ├── page.tsx            # Overview / net income vs spending
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx        # Transaction list
│   │   │   ├── categories/
│   │   │   │   └── page.tsx        # Spending by category
│   │   │   └── merchants/
│   │   │       └── page.tsx        # Spending by merchant
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts        # NextAuth handler
│   │       ├── plaid/
│   │       │   ├── create-link-token/route.ts
│   │       │   └── exchange-token/route.ts
│   │       ├── cron/
│   │       │   └── sync-transactions/route.ts
│   │       ├── transactions/
│   │       │   └── route.ts        # Query transactions
│   │       └── telegram/
│   │           └── webhook/route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── plaid-link.tsx          # Plaid Link button
│   │   ├── transaction-table.tsx
│   │   ├── category-chart.tsx
│   │   ├── merchant-chart.tsx
│   │   └── income-spending-chart.tsx
│   ├── db/
│   │   ├── index.ts                # Drizzle client
│   │   └── schema.ts               # Table definitions
│   ├── lib/
│   │   ├── plaid.ts                # Plaid client
│   │   ├── telegram.ts             # Telegram bot helpers
│   │   ├── encryption.ts           # Token encryption/decryption
│   │   └── auth.ts                 # NextAuth config
│   └── types/
│       └── index.ts                # Shared types
├── drizzle.config.ts
├── vercel.json                     # Cron config
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── README.md
```
