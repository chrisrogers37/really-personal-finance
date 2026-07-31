import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type UserRole = "owner" | "admin" | "member" | "viewer";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 40,
  admin: 30,
  member: 20,
  viewer: 10,
};

export const VALID_ROLES = Object.keys(ROLE_HIERARCHY) as UserRole[];

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** True when `callerRole` is strictly higher than `targetRole`. Used to gate
 * role changes: a caller may only modify a target they strictly out-rank, so
 * peers (admin↔admin, owner↔owner) and superiors are protected. */
export function outRanks(callerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[callerRole] > ROLE_HIERARCHY[targetRole];
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.isCurrent, true)))
    .limit(1);

  return (user?.role as UserRole) ?? "member";
}

export async function setUserRole(
  targetUserId: string,
  newRole: UserRole,
): Promise<void> {
  await db
    .update(users)
    .set({ role: newRole })
    .where(and(eq(users.userId, targetUserId), eq(users.isCurrent, true)));
}

/** Number of distinct current owners. Used to protect the last owner from
 * destructive mutations (deprovision) that would leave the org ownerless (#139). */
export async function countCurrentOwners(): Promise<number> {
  const owners = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.isCurrent, true)));
  return owners.length;
}
