import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Updates a user profile using SCD2 pattern:
 * 1. Close the current row (set valid_to + is_current = false)
 * 2. Insert a new row with updated values (valid_from = now, is_current = true)
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string }
) {
  // Get current version
  const [current] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.isCurrent, true)))
    .limit(1);

  if (!current) {
    throw new Error("User not found");
  }

  const now = new Date();

  // Close current row
  await db
    .update(users)
    .set({ validTo: now, isCurrent: false })
    .where(eq(users.id, current.id));

  // Insert new version
  const [newVersion] = await db
    .insert(users)
    .values({
      userId: current.userId,
      email: updates.email ?? current.email,
      name: updates.name ?? current.name,
      emailVerified: current.emailVerified,
      validFrom: now,
      isCurrent: true,
    })
    .returning();

  return newVersion;
}

/**
 * Get the full history of a user's profile changes
 */
export async function getUserHistory(userId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .orderBy(users.validFrom);
}
