import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rateLimitAttempts } from "@/db/schema";
import { lt } from "drizzle-orm";
import { requireCronAuth, withErrorHandling } from "@/lib/api-helpers";

async function _GET(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const deleted = await db
    .delete(rateLimitAttempts)
    .where(lt(rateLimitAttempts.lastAttempt, cutoff))
    .returning({ key: rateLimitAttempts.key });

  return NextResponse.json({ deletedCount: deleted.length });
}

export const GET = withErrorHandling(_GET);
