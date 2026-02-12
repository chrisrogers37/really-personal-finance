import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";

export const maxDuration = 300; // 5 minutes for Vercel

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all accounts grouped by plaid_item_id (to avoid duplicate syncs)
  const allAccounts = await db.select().from(accounts);

  // Group by item ID (each item shares an access token)
  const itemMap = new Map<
    string,
    { accessToken: string; userId: string; cursor: string | null; accounts: typeof allAccounts }
  >();

  for (const acct of allAccounts) {
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

  for (const [itemId, item] of itemMap) {
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

      // Insert new transactions
      if (added.length > 0) {
        for (const txn of added) {
          // Find the matching account
          const matchingAccount = item.accounts.find(
            (a) => a.plaidAccountId === txn.account_id
          );
          if (!matchingAccount) continue;

          await db
            .insert(transactions)
            .values({
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
            })
            .onConflictDoNothing({ target: transactions.plaidTransactionId });
        }
        totalAdded += added.length;
      }

      // Update modified transactions
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
  }

  return NextResponse.json({
    success: true,
    added: totalAdded,
    modified: totalModified,
    removed: totalRemoved,
  });
}
