import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const results = await db
    .select({
      category: transactions.categoryPrimary,
    })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .groupBy(transactions.categoryPrimary)
    .orderBy(sql`${transactions.categoryPrimary} ASC`);

  const categories = results
    .map((r) => r.category)
    .filter((c): c is string => c !== null);

  return NextResponse.json({ categories });
}
