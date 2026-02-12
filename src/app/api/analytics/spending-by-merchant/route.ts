import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "20");

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
