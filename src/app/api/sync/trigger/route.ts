import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user's Plaid accounts
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.source, "plaid")));

  if (userAccounts.length === 0) {
    return NextResponse.json(
      { error: "No Plaid accounts to sync" },
      { status: 404 }
    );
  }

  // Group by item ID
  const itemMap = new Map<
    string,
    {
      accessToken: string;
      cursor: string | null;
      accounts: typeof userAccounts;
    }
  >();

  for (const acct of userAccounts) {
    if (!acct.plaidItemId || !acct.plaidAccessToken || !acct.plaidAccountId)
      continue;

    if (!itemMap.has(acct.plaidItemId)) {
      itemMap.set(acct.plaidItemId, {
        accessToken: decrypt(acct.plaidAccessToken),
        cursor: acct.cursor,
        accounts: [],
      });
    }
    itemMap.get(acct.plaidItemId)!.accounts.push(acct);
  }

  let totalAdded = 0;
  let totalModified = 0;

  for (const [, item] of itemMap) {
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

      if (added.length > 0) {
        const values = added
          .map((txn) => {
            const matchingAccount = item.accounts.find(
              (a) => a.plaidAccountId === txn.account_id
            );
            if (!matchingAccount) return null;
            return {
              accountId: matchingAccount.id,
              userId,
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
            .onConflictDoNothing({ target: transactions.plaidTransactionId });
        }
        totalAdded += added.length;
      }

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
      }

      cursor = next_cursor;
      hasMore = has_more;
    }

    // Update cursor
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
  });
}
