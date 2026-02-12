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

  const conditions = [
    eq(transactions.userId, session.user.id),
    // Only outflows (positive amounts in Plaid = money out)
    sql`${transactions.amount} > 0`,
  ];

  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));

  const results = await db
    .select({
      category: transactions.categoryPrimary,
      total: sql<string>`SUM(${transactions.amount})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(transactions.categoryPrimary)
    .orderBy(sql`SUM(${transactions.amount}) DESC`);

  return NextResponse.json({
    categories: results.map((r) => ({
      category: r.category || "Uncategorized",
      total: parseFloat(r.total),
      count: r.count,
    })),
  });
}
