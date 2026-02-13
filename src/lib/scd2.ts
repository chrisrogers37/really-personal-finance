import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Updates a user profile using SCD2 pattern:
 * 1. Close the current row (set valid_to + is_current = false)
 * 2. Insert a new row with updated values (valid_from = now, is_current = true)
 *
 * Both operations are wrapped in a transaction to prevent data corruption
 * if the process fails between step 1 and step 2.
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string; emailVerified?: Date | null }
) {
  // Read current version outside the transaction.
  // The neon-http driver batches transaction queries, so we cannot
  // use one query's result as input to another within the same transaction.
  const [current] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.isCurrent, true)))
    .limit(1);

  if (!current) {
    throw new Error("User not found");
  }

  const now = new Date();

  // Wrap close + insert in a transaction for atomicity.
  // If either operation fails, both are rolled back.
  const [newVersion] = await db.transaction(async (tx) => {
    // Close current row
    await tx
      .update(users)
      .set({ validTo: now, isCurrent: false })
      .where(eq(users.id, current.id));

    // Insert new version
    return tx
      .insert(users)
      .values({
        userId: current.userId,
        email: updates.email ?? current.email,
        name: updates.name ?? current.name,
        emailVerified:
          updates.emailVerified !== undefined
            ? updates.emailVerified
            : current.emailVerified,
        validFrom: now,
        isCurrent: true,
      })
      .returning();
  });

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
