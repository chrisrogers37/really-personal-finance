# Database Guide

The application uses PostgreSQL hosted on [Neon](https://neon.tech) (serverless Postgres), accessed through the Neon HTTP driver and Drizzle ORM.

## Connection Setup

**File:** `src/db/index.ts`

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

The `db` object is a singleton that is imported throughout the codebase. It uses the Neon HTTP driver, which sends queries over HTTP rather than maintaining a persistent connection. This is ideal for serverless environments (Vercel) where functions are short-lived.

**Important:** The Neon HTTP driver batches queries within a transaction. This means you cannot use the result of one query as input to another query within the same `db.transaction()` block. That is why `src/lib/scd2.ts` reads the current user row *before* starting the transaction.

## Schema Definition

**File:** `src/db/schema.ts`

All tables are defined using Drizzle ORM's `pgTable` function. The schema file is the single source of truth for database structure.

## Tables

### `users` (SCD2 -- Slowly Changing Dimension Type 2)

Stores user profiles with full version history. See `docs/ARCHITECTURE.md` for a detailed explanation of the SCD2 pattern.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | no | `gen_random_uuid()` | Row-level primary key (changes per version) |
| `user_id` | uuid | no | - | Business key (stable across all versions of a user) |
| `email` | text | no | - | User email address |
| `name` | text | yes | - | Display name |
| `email_verified` | timestamp | yes | - | When the email was verified via magic link |
| `valid_from` | timestamp | no | `now()` | When this version became the active version |
| `valid_to` | timestamp | yes | - | When this version was superseded (`null` = still active) |
| `is_current` | boolean | no | `true` | Whether this is the current active version |
| `created_at` | timestamp | no | `now()` | When this row was inserted |

**Indexes:**
- `idx_users_user_id` on (`user_id`) -- lookup by business key
- `idx_users_email_current` on (`email`, `is_current`) -- lookup by email for current users
- `idx_users_current` on (`user_id`, `is_current`) -- fast filtering for current version

**Querying patterns:**
```sql
-- Get current user by business key
SELECT * FROM users WHERE user_id = ? AND is_current = true LIMIT 1;

-- Get current user by email
SELECT * FROM users WHERE email = ? AND is_current = true LIMIT 1;

-- Get full history
SELECT * FROM users WHERE user_id = ? ORDER BY valid_from;
```

**Foreign key references:** All other tables reference `user_id` (the business key), **not** `id` (the row key). This means FK references remain valid across version changes.

---

### `auth_accounts`

Required by NextAuth for OAuth providers. This table stores linked OAuth accounts. Since this application uses email-only authentication, this table is mostly unused but must exist for the NextAuth adapter interface.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | no | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | no | - | FK to `users.user_id` |
| `type` | text | no | - | Account type (e.g., `"oauth"`) |
| `provider` | text | no | - | Provider name (e.g., `"google"`) |
| `provider_account_id` | text | no | - | External account ID |
| `refresh_token` | text | yes | - | OAuth refresh token |
| `access_token` | text | yes | - | OAuth access token |
| `expires_at` | timestamp | yes | - | Token expiration |
| `token_type` | text | yes | - | Token type (e.g., `"bearer"`) |
| `scope` | text | yes | - | OAuth scope |
| `id_token` | text | yes | - | OIDC ID token |
| `session_state` | text | yes | - | OAuth session state |

**Indexes:**
- `idx_auth_accounts_user_id` on (`user_id`)

---

### `sessions`

Stores active user sessions. NextAuth creates a session row when a user signs in and deletes it when they sign out or the session expires.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | no | `gen_random_uuid()` | Primary key |
| `session_token` | text | no | - | Unique session token (sent as cookie) |
| `user_id` | uuid | no | - | FK to `users.user_id` |
| `expires` | timestamp | no | - | When the session expires |

**Indexes:**
- `idx_sessions_user_id` on (`user_id`)
- Unique constraint on `session_token`

---

### `verification_tokens`

Stores email magic link tokens. A token is created when a user requests a sign-in email and consumed (deleted) when they click the link.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `identifier` | text | no | - | Email address |
| `token` | text | no | - | Unique verification token |
| `expires` | timestamp | no | - | When the token expires |

**Constraints:**
- Unique constraint on `token`

**Lifecycle:**
1. User enters email on sign-in page
2. `createVerificationToken()` inserts a row
3. Email is sent with a link containing the token
4. User clicks the link
5. `useVerificationToken()` finds and deletes the row
6. A session is created

---

### `accounts` (Bank Accounts via Plaid)

Stores linked bank accounts. Each row represents one account (e.g., "Chase Checking") from a Plaid item (one per financial institution connection).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | no | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | no | - | FK to `users.user_id` |
| `plaid_item_id` | text | no | - | Plaid item ID (one per bank connection) |
| `plaid_access_token` | text | no | - | **Encrypted** Plaid access token (AES-256-GCM) |
| `plaid_account_id` | text | no | - | Plaid account ID (unique per account) |
| `name` | text | no | - | Account name (e.g., `"Chase Checking"`) |
| `type` | text | no | - | Account type (e.g., `"depository"`, `"credit"`) |
| `subtype` | text | yes | - | Account subtype (e.g., `"checking"`, `"savings"`) |
| `mask` | text | yes | - | Last 4 digits of account number |
| `cursor` | text | yes | - | Plaid sync cursor for incremental updates |
| `created_at` | timestamp | no | `now()` | When the account was linked |

**Indexes:**
- `idx_accounts_user_id` on (`user_id`)
- `idx_accounts_plaid_item_id` on (`plaid_item_id`)

**Relationships:**
- Multiple accounts can share the same `plaid_item_id` (e.g., checking + savings at the same bank)
- All accounts with the same `plaid_item_id` share the same encrypted access token
- The `cursor` is updated after each sync and applies to all accounts under the same item

**Important: The `plaid_access_token` column stores encrypted data.** Never read this value and pass it directly to the Plaid API. Always decrypt it first using `decrypt()` from `src/lib/encryption.ts`. Similarly, always encrypt before storing using `encrypt()`.

---

### `transactions`

Stores bank transactions synced from Plaid.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | no | `gen_random_uuid()` | Primary key |
| `account_id` | uuid | no | - | FK to `accounts.id` |
| `user_id` | uuid | no | - | FK to `users.user_id` (denormalized) |
| `plaid_transaction_id` | text | no | - | Unique Plaid transaction ID |
| `amount` | decimal(12,2) | no | - | Transaction amount (positive = spending, negative = income) |
| `date` | date (string) | no | - | Transaction date in `YYYY-MM-DD` format |
| `name` | text | no | - | Raw transaction name from Plaid |
| `merchant_name` | text | yes | - | Cleaned merchant name (if available from Plaid) |
| `category_primary` | text | yes | - | Plaid primary category (e.g., `FOOD_AND_DRINK`) |
| `category_detailed` | text | yes | - | Plaid detailed category (e.g., `FOOD_AND_DRINK_RESTAURANT`) |
| `pending` | boolean | no | `false` | Whether the transaction is still pending |
| `created_at` | timestamp | no | `now()` | When this row was synced |

**Indexes:**
- `idx_transactions_user_id` on (`user_id`) -- filter by user
- `idx_transactions_account_id` on (`account_id`) -- filter by account
- `idx_transactions_date` on (`user_id`, `date`) -- date range queries per user
- `idx_transactions_category` on (`user_id`, `category_primary`) -- category filter per user
- `idx_transactions_merchant` on (`user_id`, `merchant_name`) -- merchant filter per user
- `idx_transactions_plaid_id` on (`plaid_transaction_id`) -- unique constraint and sync lookups

**Constraints:**
- Unique constraint on `plaid_transaction_id` (prevents duplicate imports)

**Amount convention (from Plaid):**
- `amount > 0` = money leaving the account (spending, debits, purchases)
- `amount < 0` = money entering the account (income, deposits, refunds)

**Denormalization:** The `user_id` column is denormalized from the `accounts` table. This avoids JOINs on the most common query pattern (`WHERE user_id = ?`). When inserting transactions, always populate both `account_id` and `user_id`.

---

### `telegram_configs`

Stores Telegram bot configuration for each user.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | no | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | no | - | FK to `users.user_id` (unique) |
| `chat_id` | text | no | - | Telegram chat ID |
| `enabled` | boolean | no | `true` | Whether alerts are active |
| `created_at` | timestamp | no | `now()` | When the chat was linked |

**Indexes:**
- `idx_telegram_configs_user_id` on (`user_id`)

**Constraints:**
- Unique constraint on `user_id` (one Telegram config per user)

**Upsert behavior:** When a user links their Telegram account via `/start <email>`, the route uses `ON CONFLICT DO UPDATE` on `user_id` to update the `chat_id` and re-enable alerts if the user re-links.

---

## Database Management Commands

```bash
# Push the current schema to the database (creates/alters tables)
npm run db:push

# Generate migration files (for reviewing changes before applying)
npm run db:generate

# Open Drizzle Studio (visual database browser)
npm run db:studio
```

## Schema Change Workflow

When you need to modify the database schema:

1. **Edit the schema file:** `src/db/schema.ts`
2. **Generate a migration:** `npm run db:generate` -- creates SQL migration files in the `drizzle/` directory
3. **Review the migration:** Check the generated SQL to verify it does what you expect
4. **Apply to database:** `npm run db:push` -- applies changes directly to the database
5. **Update related code:** Modify API routes, lib functions, and types that use the changed tables

**For the `users` table specifically:** If you add a new column, you must also update the SCD2 logic in `src/lib/scd2.ts` to carry forward the new column's value when creating a new version row.

## Common Query Patterns

### Filtering current users
```typescript
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const [user] = await db
  .select()
  .from(users)
  .where(and(eq(users.userId, someUserId), eq(users.isCurrent, true)))
  .limit(1);
```

### Querying transactions with date range
```typescript
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const results = await db
  .select()
  .from(transactions)
  .where(
    and(
      eq(transactions.userId, userId),
      gte(transactions.date, "2024-01-01"),
      lte(transactions.date, "2024-12-31")
    )
  );
```

### Aggregating with raw SQL
```typescript
import { sql } from "drizzle-orm";

const results = await db
  .select({
    total: sql<string>`SUM(${transactions.amount})`,
    count: sql<number>`COUNT(*)`,
  })
  .from(transactions)
  .where(eq(transactions.userId, userId));
```
