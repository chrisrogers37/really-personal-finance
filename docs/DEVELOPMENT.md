# Development Guide

How to set up your local environment, run the app, write tests, and deploy.

## Prerequisites

- **Node.js** 18 or newer
- **npm** (included with Node.js)
- A **Neon** PostgreSQL database (free tier works: [neon.tech](https://neon.tech))
- A **Plaid** developer account ([plaid.com](https://plaid.com))
- A **Telegram bot** token (create one via [@BotFather](https://t.me/BotFather))
- An **SMTP email service** for magic link authentication (e.g., Gmail SMTP, SendGrid, Resend)

## Initial Setup

### 1. Clone and install

```bash
git clone https://github.com/chrisrogers37/really-personal-finance.git
cd really-personal-finance
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in each value. See the [Environment Variables](#environment-variables) section below for details on each variable.

### 3. Push the database schema

```bash
npm run db:push
```

This creates all tables, indexes, and constraints in your Neon database based on the schema defined in `src/db/schema.ts`.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page should load. Click "Sign In" to test the email magic link flow.

## Environment Variables

All environment variables are defined in `.env.example`. Here is what each one does and how to obtain it:

### Database

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | Copy from your Neon dashboard (Project > Connection Details). Format: `postgresql://user:pass@host/db?sslmode=require` |

### NextAuth

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `NEXTAUTH_URL` | Your application URL | Use `http://localhost:3000` for local development. Set to your production URL in Vercel. |
| `NEXTAUTH_SECRET` | Secret for encrypting sessions | Generate with `openssl rand -base64 32` |
| `EMAIL_SERVER` | SMTP connection string | Format: `smtp://user:password@smtp.example.com:587`. For Gmail: `smtp://you@gmail.com:app-password@smtp.gmail.com:587` |
| `EMAIL_FROM` | Sender address for magic links | e.g., `noreply@yourdomain.com` |

### Plaid

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `PLAID_CLIENT_ID` | Plaid client ID | From your [Plaid Dashboard](https://dashboard.plaid.com/team/keys) |
| `PLAID_SECRET` | Plaid API secret | From your Plaid Dashboard (use the sandbox or development key) |
| `PLAID_ENV` | Plaid environment | `sandbox` for testing, `development` for real banks (limited), `production` for live |
| `PLAID_PRODUCTS` | Plaid products to request | Set to `transactions` |
| `PLAID_COUNTRY_CODES` | Supported countries | Set to `US` |

### Telegram

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `TELEGRAM_BOT_TOKEN` | Bot API token | Message [@BotFather](https://t.me/BotFather) on Telegram, create a new bot, copy the token |
| `TELEGRAM_WEBHOOK_SECRET` | Secret for webhook verification | Generate with `openssl rand -base64 32` |

### Encryption

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `ENCRYPTION_KEY` | 64-character hex string (32 bytes) for AES-256 | Generate with `openssl rand -hex 32` |

### Cron

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `CRON_SECRET` | Bearer token protecting cron endpoints | Generate with `openssl rand -base64 32` |

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start Next.js development server with hot reload |
| `build` | `next build` | Create a production build |
| `start` | `next start` | Start the production server |
| `lint` | `eslint` | Run ESLint on the codebase |
| `test` | `vitest run` | Run all tests once |
| `test:watch` | `vitest` | Run tests in watch mode (re-runs on file changes) |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |
| `db:push` | `drizzle-kit push` | Push schema changes to the database |
| `db:generate` | `drizzle-kit generate` | Generate SQL migration files |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio (visual DB browser) |

## Project Structure

```
src/
  __tests__/              # Unit tests (run with Vitest)
    encryption.test.ts    # Tests for AES-256-GCM encrypt/decrypt
    telegram.test.ts      # Tests for Telegram message sending
    utils.test.ts         # Tests for utility functions
    validation.test.ts    # Tests for input validation helpers
  app/
    api/                  # Backend API routes (server-side only)
    auth/                 # Authentication pages (signin, verify, error)
    dashboard/            # Dashboard pages (overview, transactions, categories, merchants)
    profile/              # Profile settings page
    layout.tsx            # Root layout (fonts, session provider)
    page.tsx              # Public landing page
    globals.css           # Global styles (Tailwind imports)
  components/             # Reusable React components
  db/
    index.ts              # Database client singleton
    schema.ts             # Table definitions (single source of truth)
  lib/                    # Shared business logic modules
    alerts.ts             # Telegram alert generation (daily summary, weekly comparison, anomaly detection)
    auth.ts               # NextAuth configuration and custom database adapter
    encryption.ts         # AES-256-GCM encryption/decryption for Plaid tokens
    plaid.ts              # Plaid API client setup
    scd2.ts               # SCD2 user profile update and history functions
    telegram.ts           # Telegram Bot API message sending
    utils.ts              # UI utilities (class names, currency formatting, date formatting)
    validation.ts         # Input validation (date format, integer clamping, timing-safe compare)
  types/
    index.ts              # Shared TypeScript interfaces (Transaction, CategoryData, MerchantData)
  middleware.ts           # Route protection (auth redirects, public route allowlist)
```

## Testing

### Running tests

```bash
# Run all tests once
npm test

# Run in watch mode (re-runs on changes)
npm run test:watch

# Run with coverage report
npm run test:coverage
```

### Test structure

Tests live in `src/__tests__/` and use Vitest with the following conventions:

- **File naming:** `<module>.test.ts` (e.g., `encryption.test.ts`)
- **Structure:** `describe()` blocks group related tests, `it()` blocks define individual test cases
- **Mocking:** `vi.stubEnv()` for environment variables, `vi.fn()` / `vi.mock()` for function mocks
- **Dynamic imports:** Some tests use `await import()` to re-import modules after stubbing env vars

### What is currently tested

| Module | File | What is covered |
|--------|------|-----------------|
| `encryption.ts` | `encryption.test.ts` | Round-trip encrypt/decrypt, random IV verification, ciphertext format, tamper detection, edge cases (empty string, unicode), env var validation |
| `validation.ts` | `validation.test.ts` | Date format validation, integer clamping, timing-safe string comparison |
| `utils.ts` | `utils.test.ts` | Currency formatting, date formatting, class name merging |
| `telegram.ts` | `telegram.test.ts` | Message sending, fetch mock behavior, parse mode options, error handling |

### Writing new tests

1. Create a file in `src/__tests__/` named `<module>.test.ts`
2. Import from `vitest`: `import { describe, it, expect, vi } from "vitest"`
3. Import the module under test using the `@/` path alias
4. Use `describe()` to group and `it()` to define test cases

Example:
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "@/lib/myModule";

describe("myFunction", () => {
  it("does the expected thing", () => {
    expect(myFunction("input")).toBe("expected output");
  });
});
```

### Test configuration

**File:** `vitest.config.ts`
- Globals: enabled (no need to import `describe`, `it`, `expect` explicitly, but doing so is fine)
- Environment: Node.js
- Path alias: `@` resolves to `./src`
- Test patterns: `src/**/*.test.ts` and `src/**/*.test.tsx`

## Working with the Plaid Sandbox

When `PLAID_ENV=sandbox`, Plaid provides test credentials:

- **Username:** `user_good`
- **Password:** `pass_good`
- **Bank:** Any institution in the Plaid Link UI

The sandbox generates fake transactions so you can test the entire flow without real bank accounts. Transaction sync in sandbox mode returns consistent test data.

To switch to real banks, change `PLAID_ENV` to `development` (limited to 100 connected items) or `production` (requires Plaid approval).

## Deployment to Vercel

### First deployment

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.example` in the Vercel project settings
4. Set `NEXTAUTH_URL` to your production URL (e.g., `https://your-app.vercel.app`)
5. Deploy

### Cron jobs

Cron jobs are configured in `vercel.json`:

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Transaction Sync | Daily at 6:00 AM UTC | `GET /api/cron/sync-transactions` |
| Daily Alerts | Daily at 7:00 AM UTC | `GET /api/cron/send-alerts?type=daily` |
| Weekly Alerts | Mondays at 8:00 AM UTC | `GET /api/cron/send-alerts?type=weekly` |

Vercel automatically sends the `Authorization: Bearer <CRON_SECRET>` header when invoking cron endpoints. The `CRON_SECRET` env var must be set in your Vercel project settings.

**Note:** Vercel Cron is only available on the Pro plan (hobby plan has limited cron support). Check Vercel pricing for current limits.

### Telegram webhook setup

After deploying, register your webhook URL with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
  }'
```

The `secret_token` must match your `TELEGRAM_WEBHOOK_SECRET` environment variable.

## Code Conventions

### Import paths

Use the `@/` alias for all imports from the `src/` directory:

```typescript
// Good
import { db } from "@/db";
import { formatCurrency } from "@/lib/utils";

// Bad
import { db } from "../../db";
```

### Client vs. Server components

- Pages and components that use React hooks (`useState`, `useEffect`, etc.) or browser APIs must have `"use client"` at the top of the file
- API routes (`route.ts` files) are always server-side -- never add `"use client"` to them
- The `src/lib/` modules are server-side only (they use Node.js crypto, direct database queries, etc.) -- never import them in client components

### Error handling in API routes

Follow the existing pattern:
1. Check session with `auth()` -- return 401 if missing
2. Validate input parameters -- return 400 with a descriptive error
3. Perform the operation
4. Return JSON response

```typescript
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... validate, query, return
}
```

### Database queries

- Always scope queries to the authenticated user's ID
- Use Drizzle's query builder for type safety
- Use `sql` template literals for raw SQL when Drizzle's builder doesn't support the operation (e.g., `COALESCE`, `CASE WHEN`, `TO_CHAR`)
