import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { syncPlaidTransactions } from "@/lib/sync-plaid";

export const maxDuration = 300; // 5 minutes for Vercel

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allAccounts = await db.select().from(accounts);
  const result = await syncPlaidTransactions(allAccounts);

  return NextResponse.json({
    success: result.errors.length === 0,
    added: result.added,
    modified: result.modified,
    removed: result.removed,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
}
