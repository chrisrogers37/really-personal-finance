# API Reference

All API routes live under `src/app/api/`. Each route exports HTTP method handlers (`GET`, `POST`, `PUT`) as named exports from a `route.ts` file.

## Authentication

Most endpoints require an active NextAuth session. The session is checked by calling `auth()` from `src/lib/auth.ts` at the top of each handler. Unauthenticated requests receive a `401 Unauthorized` response.

**Exceptions** (no session required):
- `/api/auth/*` -- NextAuth internal routes
- `/api/cron/*` -- Protected by `CRON_SECRET` header instead
- `/api/telegram/webhook` -- Protected by `TELEGRAM_WEBHOOK_SECRET` header instead

---

## Endpoints

### Authentication

#### `POST /api/auth/[...nextauth]` and `GET /api/auth/[...nextauth]`

**File:** `src/app/api/auth/[...nextauth]/route.ts`

NextAuth catch-all route. Handles sign-in, sign-out, session management, and email verification callbacks. Do not call this directly -- it is used internally by NextAuth and the `signIn()` / `signOut()` client functions.

---

### Plaid Integration

#### `POST /api/plaid/create-link-token`

**File:** `src/app/api/plaid/create-link-token/route.ts`

Creates a Plaid Link token to launch the bank connection UI.

**Auth:** Session required

**Request body:** None

**Response:**
```json
{
  "linkToken": "link-sandbox-abc123..."
}
```

**How it works:**
1. Reads `PLAID_PRODUCTS` (default: `"transactions"`) and `PLAID_COUNTRY_CODES` (default: `"US"`) from environment
2. Calls `plaidClient.linkTokenCreate()` with 730 days of transaction history requested
3. Returns the link token for the frontend Plaid Link component

---

#### `POST /api/plaid/exchange-token`

**File:** `src/app/api/plaid/exchange-token/route.ts`

Exchanges a Plaid public token (received after the user completes the Plaid Link flow) for a permanent access token, then stores the linked bank accounts.

**Auth:** Session required

**Request body:**
```json
{
  "publicToken": "public-sandbox-abc123..."
}
```

**Response:**
```json
{
  "accounts": [
    {
      "id": "uuid",
      "name": "Chase Checking",
      "type": "depository",
      "subtype": "checking",
      "mask": "1234"
    }
  ]
}
```

**How it works:**
1. Validates that `publicToken` is a non-empty string
2. Calls `plaidClient.itemPublicTokenExchange()` to get the permanent access token
3. Calls `plaidClient.accountsGet()` to retrieve all accounts under that item
4. Encrypts the access token using AES-256-GCM (`encrypt()` from `src/lib/encryption.ts`)
5. Inserts one row per account into the `accounts` table (all sharing the same encrypted token and `plaid_item_id`)

---

### Transactions

#### `GET /api/transactions`

**File:** `src/app/api/transactions/route.ts`

Returns a paginated, filterable list of the authenticated user's transactions.

**Auth:** Session required

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | `YYYY-MM-DD` | none | Include transactions on or after this date |
| `endDate` | `YYYY-MM-DD` | none | Include transactions on or before this date |
| `category` | string | none | Exact match on `category_primary` (e.g., `FOOD_AND_DRINK`) |
| `merchant` | string | none | Case-insensitive partial match on `merchant_name` |
| `accountId` | uuid | none | Filter to a specific bank account |
| `limit` | integer | 100 | Results per page (clamped to 1-200) |
| `offset` | integer | 0 | Pagination offset (clamped to 0-100000) |

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": "42.50",
      "date": "2024-01-15",
      "name": "UBER *EATS",
      "merchantName": "Uber Eats",
      "categoryPrimary": "FOOD_AND_DRINK",
      "categoryDetailed": "FOOD_AND_DRINK_RESTAURANT",
      "pending": false,
      "accountName": "Chase Checking",
      "accountType": "depository"
    }
  ]
}
```

**Notes:**
- Transactions are sorted by date descending (newest first)
- Joins with the `accounts` table to include account name and type
- The `amount` field is a string (decimal) -- positive values are spending, negative values are income
- Date parameters are validated against `YYYY-MM-DD` format; invalid formats return a `400` error

---

### Analytics

#### `GET /api/analytics/spending-by-category`

**File:** `src/app/api/analytics/spending-by-category/route.ts`

Returns spending totals grouped by Plaid category.

**Auth:** Session required

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | `YYYY-MM-DD` | none | Start of date range |
| `endDate` | `YYYY-MM-DD` | none | End of date range |

**Response:**
```json
{
  "categories": [
    {
      "category": "FOOD_AND_DRINK",
      "total": 523.40,
      "count": 15
    },
    {
      "category": "TRANSPORTATION",
      "total": 210.00,
      "count": 8
    }
  ]
}
```

**Notes:**
- Only includes outflows (transactions where `amount > 0`)
- Sorted by total descending
- Categories with `null` are returned as `"Uncategorized"`

---

#### `GET /api/analytics/spending-by-merchant`

**File:** `src/app/api/analytics/spending-by-merchant/route.ts`

Returns spending totals grouped by merchant.

**Auth:** Session required

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | `YYYY-MM-DD` | none | Start of date range |
| `endDate` | `YYYY-MM-DD` | none | End of date range |
| `limit` | integer | 20 | Number of merchants to return (clamped to 1-100) |

**Response:**
```json
{
  "merchants": [
    {
      "merchant": "Amazon",
      "total": 850.23,
      "count": 12,
      "avgAmount": 70.85,
      "isRecurring": true
    }
  ]
}
```

**Notes:**
- Only includes outflows (`amount > 0`)
- Uses `COALESCE(merchant_name, name)` to fall back to the raw transaction name
- `isRecurring` is `true` when `count >= 3` for that merchant
- Sorted by total descending

---

#### `GET /api/analytics/income-vs-spending`

**File:** `src/app/api/analytics/income-vs-spending/route.ts`

Returns monthly income vs. spending breakdown.

**Auth:** Session required

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `startDate` | `YYYY-MM-DD` | none | Start of date range |
| `endDate` | `YYYY-MM-DD` | none | End of date range |

**Response:**
```json
{
  "monthly": [
    {
      "month": "2024-01",
      "income": 5000.00,
      "spending": 3200.00,
      "net": 1800.00
    }
  ]
}
```

**Notes:**
- Income = absolute value of negative transactions (Plaid convention: negative = money in)
- Spending = sum of positive transactions (Plaid convention: positive = money out)
- Net = income - spending
- Sorted chronologically by month (YYYY-MM format)

---

### Profile

#### `GET /api/profile`

**File:** `src/app/api/profile/route.ts`

Returns the current user's profile.

**Auth:** Session required

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

#### `PUT /api/profile`

**File:** `src/app/api/profile/route.ts`

Updates the user's profile. This triggers an SCD2 version change -- the current profile row is closed and a new row is inserted.

**Auth:** Session required

**Request body:**
```json
{
  "name": "New Name",
  "email": "new@email.com"
}
```

At least one of `name` or `email` must be provided.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "new@email.com",
    "name": "New Name"
  }
}
```

**Validation:**
- If `email` is provided, it must match the pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Returns `400` if neither field is provided or if email format is invalid

---

#### `GET /api/profile/history`

**File:** `src/app/api/profile/history/route.ts`

Returns the full SCD2 history of the user's profile changes.

**Auth:** Session required

**Response:**
```json
{
  "history": [
    {
      "email": "old@email.com",
      "name": "Old Name",
      "validFrom": "2024-01-01T00:00:00.000Z",
      "validTo": "2024-06-15T10:30:00.000Z",
      "isCurrent": false
    },
    {
      "email": "current@email.com",
      "name": "Current Name",
      "validFrom": "2024-06-15T10:30:00.000Z",
      "validTo": null,
      "isCurrent": true
    }
  ]
}
```

**Notes:**
- Sorted by `valid_from` ascending (oldest first)
- The last entry will have `isCurrent: true` and `validTo: null`

---

### Cron Jobs

Both cron endpoints require the `Authorization: Bearer <CRON_SECRET>` header. In production, Vercel sends this header automatically when invoking cron jobs defined in `vercel.json`.

#### `GET /api/cron/sync-transactions`

**File:** `src/app/api/cron/sync-transactions/route.ts`

Syncs transactions from all linked Plaid accounts.

**Auth:** `CRON_SECRET` bearer token

**Max duration:** 300 seconds (5 minutes)

**Response:**
```json
{
  "success": true,
  "added": 42,
  "modified": 3,
  "removed": 1,
  "errors": [
    { "itemId": "item-abc", "error": "ITEM_LOGIN_REQUIRED" }
  ]
}
```

**How it works:**
1. Fetches all rows from the `accounts` table
2. Groups accounts by `plaid_item_id` (accounts from the same bank share an access token)
3. For each item:
   - Decrypts the access token
   - Calls `plaidClient.transactionsSync()` with the stored cursor (or `null` for first sync)
   - Loops while `has_more === true` (fetches 500 transactions per page)
   - **Added transactions:** Batch insert with `ON CONFLICT DO NOTHING` on `plaid_transaction_id`
   - **Modified transactions:** Individual `UPDATE` per transaction (different WHERE clauses)
   - **Removed transactions:** Individual `DELETE` per transaction
   - Updates the cursor on all accounts for this item
4. If an error occurs for one item, it is logged and the sync continues with the next item
5. Returns aggregate counts and any errors

---

#### `GET /api/cron/send-alerts`

**File:** `src/app/api/cron/send-alerts/route.ts`

Sends spending alerts to all enabled Telegram users.

**Auth:** `CRON_SECRET` bearer token

**Max duration:** 60 seconds

**Query parameters:**

| Param | Type | Values | Description |
|-------|------|--------|-------------|
| `type` | string | `daily` (default), `weekly` | Which alert type to send |

**Response:**
```json
{
  "success": true,
  "type": "daily"
}
```

**How it works:**
- `type=daily`: Calls `sendDailyAlerts()` which sends a spending summary + anomaly alerts
- `type=weekly`: Calls `sendWeeklyAlerts()` which sends week-over-week comparisons
- Individual failures (e.g., one user's Telegram delivery fails) do not block other users -- uses `Promise.allSettled()`

---

### Telegram Webhook

#### `POST /api/telegram/webhook`

**File:** `src/app/api/telegram/webhook/route.ts`

Receives messages from the Telegram bot and processes commands. See `docs/TELEGRAM.md` for the full Telegram setup and command reference.

**Auth:** `X-Telegram-Bot-Api-Secret-Token` header (timing-safe comparison)

**Request body:** Telegram Update object (sent automatically by Telegram)

**Supported commands:**

| Command | Description |
|---------|-------------|
| `/start <email>` | Link Telegram chat to the user account with that email |
| `/start` (no email) | Show welcome message with usage instructions |
| `/pause` | Disable alerts for this chat |
| `/resume` | Re-enable alerts for this chat |
| `/summary` | Send today's spending summary immediately |

**Response:** Always returns `{ "ok": true }` (Telegram expects a 200 response)

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad request (invalid parameters, missing required fields) |
| 401 | Unauthorized (missing or invalid session/token) |
| 500 | Server error (misconfiguration, unhandled exception) |

## Amount Convention

The Plaid API uses the following convention for transaction amounts, and this codebase follows it:
- **Positive values** = money flowing **out** of the account (spending/debits)
- **Negative values** = money flowing **in** to the account (income/credits)

This is important when building queries or new analytics endpoints. For example, to sum only spending: `WHERE amount > 0`. To sum only income: `WHERE amount < 0` (and use `ABS()` for display).
