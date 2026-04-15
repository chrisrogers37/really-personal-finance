import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, setUserRole, hasMinRole, VALID_ROLES } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(session.user.id);
  if (!hasMinRole(role, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db
    .select({
      userId: users.userId,
      email: users.email,
      name: users.name,
      role: users.role,
      mfaEnabled: users.mfaEnabled,
      isCurrent: users.isCurrent,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.isCurrent, true));

  await audit({
    userId: session.user.id,
    action: "admin.access_review",
    resource: "users",
    detail: { userCount: allUsers.length },
  });

  return NextResponse.json({ users: allUsers });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callerRole = await getUserRole(session.user.id);
  if (!hasMinRole(callerRole, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { targetUserId, role, action } = body;

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  // De-provisioning: deactivate user
  if (action === "deprovision") {
    if (!hasMinRole(callerRole, "owner")) {
      return NextResponse.json({ error: "Only owners can deprovision" }, { status: 403 });
    }

    await db
      .update(users)
      .set({ isCurrent: false, validTo: new Date() })
      .where(eq(users.userId, targetUserId));

    await audit({
      userId: session.user.id,
      action: "admin.user_deprovisioned",
      resource: "users",
      resourceId: targetUserId,
      request,
    });

    return NextResponse.json({ deprovisioned: true });
  }

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Only owners can promote to owner/admin
  if ((role === "owner" || role === "admin") && !hasMinRole(callerRole, "owner")) {
    return NextResponse.json({ error: "Only owners can assign admin/owner roles" }, { status: 403 });
  }

  await setUserRole(targetUserId, role);

  await audit({
    userId: session.user.id,
    action: "admin.role_change",
    resource: "users",
    resourceId: targetUserId,
    detail: { newRole: role },
    request,
  });

  return NextResponse.json({ updated: true });
}
