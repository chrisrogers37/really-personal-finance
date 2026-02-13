import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { eq, and, gte, lte, ilike, desc } from "drizzle-orm";
import { clampInt, isValidDateParam } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");
  const merchant = searchParams.get("merchant");
  const accountId = searchParams.get("accountId");

  // Clamp limit to [1, 200], default 100
  const limit = clampInt(searchParams.get("limit"), 100, 1, 200);
  // Clamp offset to [0, 100000], default 0
  const offset = clampInt(searchParams.get("offset"), 0, 0, 100000);

  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const conditions = [eq(transactions.userId, session.user.id)];

  if (startDate) {
    conditions.push(gte(transactions.date, startDate));
  }
  if (endDate) {
    conditions.push(lte(transactions.date, endDate));
  }
  if (category) {
    conditions.push(eq(transactions.categoryPrimary, category));
  }
  if (merchant) {
    conditions.push(ilike(transactions.merchantName, `%${merchant}%`));
  }
  if (accountId) {
    conditions.push(eq(transactions.accountId, accountId));
  }

  const results = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      date: transactions.date,
      name: transactions.name,
      merchantName: transactions.merchantName,
      categoryPrimary: transactions.categoryPrimary,
      categoryDetailed: transactions.categoryDetailed,
      pending: transactions.pending,
      accountName: accounts.name,
      accountType: accounts.type,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.date))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ transactions: results });
}
