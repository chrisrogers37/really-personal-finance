import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { clampInt, isValidDateParam } from "@/lib/validation";

async function _GET(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = clampInt(searchParams.get("limit"), 20, 1, 100);

  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const conditions = [
    eq(transactions.userId, session.user.id),
    sql`${transactions.amount} > 0`,
  ];

  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));

  const results = await db
    .select({
      merchant: sql<string>`COALESCE(${transactions.merchantName}, ${transactions.name})`,
      total: sql<string>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
      avgAmount: sql<string>`AVG(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(sql`COALESCE(${transactions.merchantName}, ${transactions.name})`)
    .orderBy(sql`SUM(${transactions.amount}) DESC`)
    .limit(limit);

  return NextResponse.json({
    merchants: results.map((r) => ({
      merchant: r.merchant,
      total: parseFloat(r.total),
      count: r.count,
      avgAmount: parseFloat(r.avgAmount),
      isRecurring: r.count >= 3,
    })),
  });
}

export const GET = withErrorHandling(_GET);
