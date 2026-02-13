# Phase 02: Cron Job Error Handling and Performance

## PR Metadata

| Field | Value |
|-------|-------|
| **PR Title** | `fix: add error handling and batch inserts to cron jobs` |
| **Risk Level** | **Medium** -- Changes critical data pipeline (transaction sync) and alert delivery |
| **Estimated Effort** | 3-4 hours experienced / 5-7 hours junior |
| **Files Modified** | `src/app/api/cron/sync-transactions/route.ts`, `src/app/api/cron/send-alerts/route.ts`, `src/lib/alerts.ts` |

## Dependencies and Blocks

- **Blocks:** Nothing
- **Blocked by:** Nothing
- **Can run in parallel with:** Phase 01, Phase 03 (disjoint file sets)

---

## Problem Statement

### Problem 1: No error handling in sync-transactions (lines 42-134)

The sync cron job at `src/app/api/cron/sync-transactions/route.ts` iterates over all Plaid items (line 42) but has no try/catch. If **one** account's Plaid API call throws (network timeout, rate limit, token revoked), the entire cron job aborts. All remaining accounts are left unsynced, and their cursors are not updated.

### Problem 2: N+1 insert pattern (lines 58-83)

Transactions are inserted one at a time in a `for` loop:
```typescript
for (const txn of added) {
  await db.insert(transactions).values({...}).onConflictDoNothing(...);
}
```
With 500 transactions per Plaid sync page, this is 500 individual INSERT statements per API page. Drizzle supports batch inserts with `.values([...])`.

### Problem 3: Sequential alert processing (alerts.ts lines 184-217)

`sendDailyAlerts()` and `sendWeeklyAlerts()` process users one at a time with `for...of`. Each user triggers 2-3 DB queries + a Telegram API call. The `maxDuration` is 60 seconds. With many users, this will timeout.

---

## Step-by-Step Implementation

### Step 1: Add per-item error handling to sync-transactions

**File:** `src/app/api/cron/sync-transactions/route.ts`

**BEFORE** (lines 38-134, the main loop):
```typescript
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;

  for (const [itemId, item] of itemMap) {
    let cursor = item.cursor;
    let hasMore = true;

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: item.accessToken,
        cursor: cursor ?? undefined,
        count: 500,
      });
      // ... rest of sync logic
    }

    // Update cursor for all accounts in this item
    for (const acct of item.accounts) {
      await db.update(accounts).set({ cursor }).where(eq(accounts.id, acct.id));
    }
  }

  return NextResponse.json({
    success: true,
    added: totalAdded,
    modified: totalModified,
    removed: totalRemoved,
  });
```

**AFTER** (replace lines 38-142):
```typescript
  let totalAdded = 0;
  let totalModified = 0;
  let totalRemoved = 0;
  const errors: { itemId: string; error: string }[] = [];

  for (const [itemId, item] of itemMap) {
    try {
      let cursor = item.cursor;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor: cursor ?? undefined,
          count: 500,
        });

        const { added, modified, removed, next_cursor, has_more } =
          response.data;

        // Batch insert new transactions
        if (added.length > 0) {
          const values = added
            .map((txn) => {
              const matchingAccount = item.accounts.find(
                (a) => a.plaidAccountId === txn.account_id
              );
              if (!matchingAccount) return null;
              return {
                accountId: matchingAccount.id,
                userId: item.userId,
                plaidTransactionId: txn.transaction_id,
                amount: txn.amount.toString(),
                date: txn.date,
                name: txn.name,
                merchantName: txn.merchant_name ?? null,
                categoryPrimary:
                  txn.personal_finance_category?.primary ?? null,
                categoryDetailed:
                  txn.personal_finance_category?.detailed ?? null,
                pending: txn.pending,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

          if (values.length > 0) {
            await db
              .insert(transactions)
              .values(values)
              .onConflictDoNothing({ target: transactions.plaidTransactionId });
          }
          totalAdded += added.length;
        }

        // Update modified transactions (must be individual -- different WHERE per row)
        if (modified.length > 0) {
          for (const txn of modified) {
            await db
              .update(transactions)
              .set({
                amount: txn.amount.toString(),
                date: txn.date,
                name: txn.name,
                merchantName: txn.merchant_name ?? null,
                categoryPrimary:
                  txn.personal_finance_category?.primary ?? null,
                categoryDetailed:
                  txn.personal_finance_category?.detailed ?? null,
                pending: txn.pending,
              })
              .where(
                eq(transactions.plaidTransactionId, txn.transaction_id)
              );
          }
          totalModified += modified.length;
        }

        // Remove deleted transactions
        if (removed.length > 0) {
          for (const txn of removed) {
            if (txn.transaction_id) {
              await db
                .delete(transactions)
                .where(
                  eq(transactions.plaidTransactionId, txn.transaction_id)
                );
            }
          }
          totalRemoved += removed.length;
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Update cursor for all accounts in this item
      for (const acct of item.accounts) {
        await db
          .update(accounts)
          .set({ cursor })
          .where(eq(accounts.id, acct.id));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Sync failed for item ${itemId}:`, message);
      errors.push({ itemId, error: message });
      // Continue to next item -- don't abort the entire job
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    added: totalAdded,
    modified: totalModified,
    removed: totalRemoved,
    errors: errors.length > 0 ? errors : undefined,
  });
```

**Key changes:**
1. Wrapped entire per-item block in `try/catch` (line 41, line 134)
2. Added `errors` array to track failures (line 41)
3. Replaced N+1 inserts with batch insert using `.values(values)` (lines 64-76)
4. Used `.filter()` with type guard to remove null entries from unmapped accounts
5. Response includes error details when failures occur

### Step 2: Add per-user error handling and concurrency to alerts

**File:** `src/lib/alerts.ts`

**BEFORE** (`sendDailyAlerts`, lines 184-201):
```typescript
export async function sendDailyAlerts() {
  const configs = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.enabled, true));

  for (const config of configs) {
    // Daily summary
    const summary = await getDailySummary(config.userId);
    await sendTelegramMessage(config.chatId, summary);

    // Anomaly detection
    const anomaly = await detectAnomalies(config.userId);
    if (anomaly) {
      await sendTelegramMessage(config.chatId, anomaly);
    }
  }
}
```

**AFTER** (replace lines 184-201):
```typescript
export async function sendDailyAlerts() {
  const configs = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.enabled, true));

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      // Daily summary
      const summary = await getDailySummary(config.userId);
      await sendTelegramMessage(config.chatId, summary);

      // Anomaly detection
      const anomaly = await detectAnomalies(config.userId);
      if (anomaly) {
        await sendTelegramMessage(config.chatId, anomaly);
      }
    })
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `Daily alerts: ${failures.length}/${configs.length} failed`,
      failures.map((f) => (f as PromiseRejectedResult).reason)
    );
  }
}
```

**BEFORE** (`sendWeeklyAlerts`, lines 207-217):
```typescript
export async function sendWeeklyAlerts() {
  const configs = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.enabled, true));

  for (const config of configs) {
    const comparison = await getWeeklyComparison(config.userId);
    await sendTelegramMessage(config.chatId, comparison);
  }
}
```

**AFTER** (replace lines 207-217):
```typescript
export async function sendWeeklyAlerts() {
  const configs = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.enabled, true));

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const comparison = await getWeeklyComparison(config.userId);
      await sendTelegramMessage(config.chatId, comparison);
    })
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `Weekly alerts: ${failures.length}/${configs.length} failed`,
      failures.map((f) => (f as PromiseRejectedResult).reason)
    );
  }
}
```

**Key changes:**
1. Replaced sequential `for...of` with `Promise.allSettled()` -- all users process concurrently
2. `allSettled` (not `all`) ensures one failure doesn't abort other users
3. Added error logging with count of failures

### Step 3: Update send-alerts response to include error counts

**File:** `src/app/api/cron/send-alerts/route.ts`

No changes needed. The route already calls `sendDailyAlerts()` / `sendWeeklyAlerts()` and returns success. The error logging happens inside the alert functions via `console.error`. If you want error counts in the response, the alert functions would need to return them -- but that's optional for this phase.

---

## Verification Checklist

### Compilation
- [ ] `npx tsc --noEmit` -- zero type errors
- [ ] `npm run build` -- build succeeds

### Sync Transaction Testing
- [ ] Verify batch inserts work: Check that new transactions appear in the database after a sync
- [ ] Verify `onConflictDoNothing` still works with batch inserts (duplicate plaid_transaction_id should be skipped)
- [ ] Verify that if one Plaid item fails (e.g., revoked token), other items still sync successfully
- [ ] Verify the response includes `errors` array when failures occur
- [ ] Verify the cursor is NOT updated for failed items (it stays inside the try block)
- [ ] Verify the cursor IS updated for successful items

### Alert Testing
- [ ] Verify daily alerts send to all enabled users
- [ ] Verify weekly alerts send to all enabled users
- [ ] Verify that if one user's alert fails (e.g., invalid chatId), other users still receive alerts
- [ ] Verify error count is logged when failures occur

---

## What NOT To Do

1. **Do NOT batch UPDATE/DELETE operations.** Modified and removed transactions have different WHERE clauses per row. They must remain as individual statements. Only INSERTs benefit from batching.

2. **Do NOT use `Promise.all` for alerts.** Use `Promise.allSettled`. `Promise.all` rejects on the first failure, which defeats the purpose of per-user isolation.

3. **Do NOT add retry logic in this PR.** Retries add complexity (backoff, max attempts, idempotency). This PR focuses on isolation and logging. Retries can be a follow-up.

4. **Do NOT change the cron schedule or `maxDuration` values.** The existing `maxDuration = 300` (5 min) for sync and `maxDuration = 60` (1 min) for alerts are adequate once concurrency is added.

5. **Do NOT modify the Plaid client or encryption logic.** This PR only changes how we handle errors and batch writes. The Plaid API calls and token decryption remain unchanged.

6. **Do NOT suppress errors silently.** Always log to `console.error` so they appear in Vercel logs. Never catch and ignore.

7. **Do NOT change the `vercel.json` cron configuration.** The schedules remain the same.
