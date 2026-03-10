import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { syncPlaidTransactions } from "@/lib/sync-plaid";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.source, "plaid")));

  if (userAccounts.length === 0) {
    return NextResponse.json(
      { error: "No Plaid accounts to sync" },
      { status: 404 }
    );
  }

  const result = await syncPlaidTransactions(userAccounts);

  return NextResponse.json({
    success: result.errors.length === 0,
    added: result.added,
    modified: result.modified,
    removed: result.removed,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
}
