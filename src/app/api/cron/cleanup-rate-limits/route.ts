import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateLimitAttempts } from "@/db/schema";
import { lt } from "drizzle-orm";
import { withErrorHandling } from "@/lib/api-helpers";
import { timingSafeCompare } from "@/lib/validation";

async function _GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || !timingSafeCompare(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const deleted = await db
    .delete(rateLimitAttempts)
    .where(lt(rateLimitAttempts.lastAttempt, cutoff))
    .returning({ key: rateLimitAttempts.key });

  return NextResponse.json({ deletedCount: deleted.length });
}

export const GET = withErrorHandling(_GET);
