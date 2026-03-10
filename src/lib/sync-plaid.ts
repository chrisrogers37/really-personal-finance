import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";

interface PlaidAccount {
  id: string;
  userId: string;
  plaidItemId: string | null;
  plaidAccessToken: string | null;
  plaidAccountId: string | null;
  cursor: string | null;
  [key: string]: unknown;
}

interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  errors: { itemId: string; error: string }[];
}

/**
 * Syncs Plaid transactions for the given accounts.
 * Groups by plaidItemId and handles added/modified/removed transactions.
 */
export async function syncPlaidTransactions(
  plaidAccounts: PlaidAccount[]
): Promise<SyncResult> {
  // Group by item ID (each item shares an access token)
  const itemMap = new Map<
    string,
    {
      accessToken: string;
      userId: string;
      cursor: string | null;
      accounts: PlaidAccount[];
    }
  >();

  for (const acct of plaidAccounts) {
    if (!acct.plaidItemId || !acct.plaidAccessToken || !acct.plaidAccountId)
      continue;

    if (!itemMap.has(acct.plaidItemId)) {
      itemMap.set(acct.plaidItemId, {
        accessToken: decrypt(acct.plaidAccessToken),
        userId: acct.userId,
        cursor: acct.cursor,
        accounts: [],
      });
    }
    itemMap.get(acct.plaidItemId)!.accounts.push(acct);
  }

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
                source: "plaid" as const,
              };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);

          if (values.length > 0) {
            await db
              .insert(transactions)
              .values(values)
              .onConflictDoNothing({
                target: transactions.plaidTransactionId,
              });
          }
          totalAdded += added.length;
        }

        // Update modified transactions concurrently
        if (modified.length > 0) {
          await Promise.all(
            modified.map((txn) =>
              db
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
                )
            )
          );
          totalModified += modified.length;
        }

        // Batch-remove deleted transactions
        if (removed.length > 0) {
          const idsToRemove = removed
            .map((txn) => txn.transaction_id)
            .filter((id): id is string => !!id);
          if (idsToRemove.length > 0) {
            await db
              .delete(transactions)
              .where(
                inArray(transactions.plaidTransactionId, idsToRemove)
              );
          }
          totalRemoved += removed.length;
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Update cursor for all accounts in this item with a single query
      const itemAccountIds = item.accounts.map((a) => a.id);
      await db
        .update(accounts)
        .set({ cursor })
        .where(inArray(accounts.id, itemAccountIds));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Sync failed for item ${itemId}:`, message);
      errors.push({ itemId, error: message });
    }
  }

  return {
    added: totalAdded,
    modified: totalModified,
    removed: totalRemoved,
    errors,
  };
}
