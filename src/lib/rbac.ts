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
