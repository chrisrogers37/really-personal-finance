import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { isValidDateParam } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const conditions = [eq(transactions.userId, session.user.id)];

  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));

  // Monthly breakdown: income (negative amounts in Plaid) vs spending (positive)
  const results = await db
    .select({
      month: sql<string>`TO_CHAR(${transactions.date}::date, 'YYYY-MM')`,
      income: sql<string>`ABS(SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END))`,
      spending: sql<string>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${transactions.date}::date, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(${transactions.date}::date, 'YYYY-MM')`);

  return NextResponse.json({
    monthly: results.map((r) => ({
      month: r.month,
      income: parseFloat(r.income),
      spending: parseFloat(r.spending),
      net: parseFloat(r.income) - parseFloat(r.spending),
    })),
  });
}
