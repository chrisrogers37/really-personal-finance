import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Get the most recent Plaid transaction creation time as proxy for last sync
  const [latest] = await db
    .select({
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.source, "plaid")
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(1);

  // Count total Plaid transactions
  const [countResult] = await db
    .select({
      count: sql<number>`COUNT(*)`,
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
    lastSyncedAt: latest?.createdAt?.toISOString() || null,
    transactionCount: countResult?.count || 0,
  });
}
