import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, and, sql, max } from "drizzle-orm";

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  // Check if user has any Plaid accounts
  const plaidAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.source, "plaid")
      )
    )
    .limit(1);

  if (plaidAccounts.length === 0) {
    return NextResponse.json({
      hasPlaidAccounts: false,
      lastSyncedAt: null,
      transactionCount: 0,
    });
  }

  // Single query for both count and latest createdAt
  const [stats] = await db
    .select({
      count: sql<number>`COUNT(*)`,
      lastSyncedAt: max(transactions.createdAt),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.source, "plaid")
      )
    );

  return NextResponse.json({
    hasPlaidAccounts: true,
    lastSyncedAt: stats?.lastSyncedAt?.toISOString() || null,
    transactionCount: stats?.count || 0,
  });
}

export const GET = withErrorHandling(_GET);
