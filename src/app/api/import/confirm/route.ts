import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateConfirmInput } from "@/lib/import";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const result = validateConfirmInput(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.id, result.accountId),
        eq(accounts.userId, userId)
      )
    )
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let inserted = 0;
  for (let i = 0; i < result.transactions.length; i += 100) {
    const batch = result.transactions.slice(i, i + 100);
    const values = batch.map((txn) => ({
      accountId: result.accountId,
      userId,
      amount: txn.amount,
      date: txn.date,
      name: txn.description,
      merchantName: txn.merchantName || null,
      importId: txn.importId,
      source: "import" as const,
      pending: false,
    }));

    await db
      .insert(transactions)
      .values(values)
      .onConflictDoNothing({ target: transactions.importId });

    inserted += values.length;
  }

  return NextResponse.json({
    success: true,
    imported: inserted,
  });
}
