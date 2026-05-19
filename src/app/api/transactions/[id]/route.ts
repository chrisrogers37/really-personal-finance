import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const { id } = await params;
  const body = await request.json();
  const { merchantName, categoryPrimary } = body as Record<string, unknown>;

  const updates: Record<string, string | null> = {};

  if (typeof merchantName === "string") {
    updates.merchantName = merchantName.trim() || null;
  }
  if (typeof categoryPrimary === "string") {
    updates.categoryPrimary = categoryPrimary.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update. Provide merchantName or categoryPrimary." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(transactions)
    .set(updates)
    .where(
      and(eq(transactions.id, id), eq(transactions.userId, session.user.id))
    )
    .returning({
      id: transactions.id,
      merchantName: transactions.merchantName,
      categoryPrimary: transactions.categoryPrimary,
    });

  if (!updated) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ transaction: updated });
}
