import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
