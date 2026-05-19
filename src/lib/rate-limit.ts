import { db } from "@/db";
import { rateLimitAttempts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function checkRateLimit(
  key: string
): Promise<{ allowed: boolean; remaining: number; retryAfterMs?: number }> {
  const [row] = await db
    .select()
    .from(rateLimitAttempts)
    .where(eq(rateLimitAttempts.key, key))
    .limit(1);

  if (!row) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (row.lockedUntil) {
    const lockedUntilMs = row.lockedUntil.getTime();
    const now = Date.now();
    if (now < lockedUntilMs) {
      return { allowed: false, remaining: 0, retryAfterMs: lockedUntilMs - now };
    }
    // Lockout window passed; clear the row so attempts reset.
    await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  return { allowed: true, remaining: Math.max(0, MAX_ATTEMPTS - row.count) };
}

export async function recordFailure(key: string): Promise<{ remaining: number }> {
  // Atomic upsert: increment count and set lockout when threshold crossed, in one SQL.
  const [row] = await db
    .insert(rateLimitAttempts)
    .values({ key, count: 1, lastAttempt: new Date() })
    .onConflictDoUpdate({
      target: rateLimitAttempts.key,
      set: {
        count: sql`${rateLimitAttempts.count} + 1`,
        lastAttempt: sql`NOW()`,
        lockedUntil: sql`CASE
          WHEN ${rateLimitAttempts.count} + 1 >= ${MAX_ATTEMPTS}
          THEN NOW() + (${LOCKOUT_MS} || ' milliseconds')::interval
          ELSE ${rateLimitAttempts.lockedUntil}
        END`,
      },
    })
    .returning({ count: rateLimitAttempts.count });

  return { remaining: Math.max(0, MAX_ATTEMPTS - row.count) };
}

export async function resetAttempts(key: string): Promise<void> {
  await db.delete(rateLimitAttempts).where(eq(rateLimitAttempts.key, key));
}
