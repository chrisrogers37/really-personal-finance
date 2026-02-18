# Phase 01: Schema Evolution

**PR Title:** feat: evolve schema for manual transaction import
**Risk:** Low | **Effort:** Low | **Status:** ✅ COMPLETE
**Started:** 2026-02-17 | **Completed:** 2026-02-17 | **PR:** #7

## Context

The current schema assumes all transactions come from Plaid. Three changes are needed:
1. `plaidTransactionId` is NOT NULL + UNIQUE — imported transactions don't have a Plaid ID
2. No way to distinguish Plaid vs imported data
3. Accounts require Plaid-specific fields (plaidItemId, plaidAccessToken, plaidAccountId)

## Dependencies

- **Blocks:** Phase 03 (manual accounts), Phase 04 (import API)
- **Blocked by:** Nothing

## Files Modified

- `src/db/schema.ts` — schema changes
- New migration via `drizzle-kit push`
- `src/types/index.ts` — add `source` to Transaction type
- `src/app/api/transactions/route.ts` — add `source` to select so table component can display it
- `src/components/transaction-table.tsx` — display source badge
- `src/app/api/cron/sync-transactions/route.ts` — set source='plaid' on synced transactions

## Detailed Implementation

### 1. Schema changes (`src/db/schema.ts`)

#### 1a. Add `source` column to transactions table

After the `pending` column (line ~118), add:

```typescript
source: text("source").notNull().default("plaid"),
```

Valid values: `"plaid"` | `"import"`. Using text instead of enum for flexibility.

#### 1b. Make `plaidTransactionId` nullable

Change line ~108 from:
```typescript
plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
```
to:
```typescript
plaidTransactionId: text("plaid_transaction_id").unique(),
```

Remove the `.notNull()` — imported transactions won't have a Plaid ID. The UNIQUE constraint stays (null values don't conflict in Postgres).

#### 1c. Add `importId` column to transactions

After `plaidTransactionId`, add:

```typescript
importId: text("import_id").unique(),
```

This stores a hash-based dedup key for imported transactions (e.g., SHA-256 of date+description+amount). Used to prevent duplicate imports. The `.unique()` constraint is required by Phase 04's `onConflictDoNothing({ target: transactions.importId })` safety net. Drizzle creates a unique index automatically — no separate index needed.

#### 1d. Make account Plaid fields nullable

In the `accounts` table, change:
```typescript
plaidItemId: text("plaid_item_id").notNull(),
plaidAccessToken: text("plaid_access_token").notNull(),
plaidAccountId: text("plaid_account_id").notNull(),
```
to:
```typescript
plaidItemId: text("plaid_item_id"),
plaidAccessToken: text("plaid_access_token"),
plaidAccountId: text("plaid_account_id"),
```

#### 1e. Add `source` column to accounts table

After the `mask` column, add:

```typescript
source: text("source").notNull().default("plaid"),
```

### 2. Update Transaction type (`src/types/index.ts`)

Add to the `Transaction` interface:

```typescript
source: "plaid" | "import";
```

### 3. Update transactions API to return source

In `src/app/api/transactions/route.ts`, add `source` to the select object (around line 52-63):

```typescript
source: transactions.source,
```

This is needed for the transaction table to display the source badge added in step 5.

### 4. Update Plaid sync to set source explicitly

In `src/app/api/cron/sync-transactions/route.ts`, in the transaction values object (around line 67-80), add:

```typescript
source: "plaid",
```

### 5. Update transaction table to show source

In `src/components/transaction-table.tsx`, add a small badge or icon next to the account column showing "Plaid" vs "Import" source. Use a subtle indicator — small text label, not prominent.

### 6. Push schema

```bash
npx drizzle-kit push
```

## Test Plan

- **Unit test:** Verify source column defaults to "plaid" for existing insert patterns
- **Manual test:** Run `npx drizzle-kit push`, confirm no data loss
- **Manual test:** Trigger transaction sync, verify all transactions get `source='plaid'`
- **Manual test:** Verify transaction table renders without errors

## What NOT To Do

- Don't create a Drizzle migration file — this project uses `drizzle-kit push` directly
- Don't add a TypeScript enum for source values — plain string union is simpler and matches the rest of the codebase
- Don't modify any Plaid API routes beyond adding the `source` field — those stay functional as-is
- Don't rename `plaidTransactionId` — it's referenced in many places and still valid for Plaid transactions
