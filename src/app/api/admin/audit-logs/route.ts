import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRole, hasMinRole } from "@/lib/rbac";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { clampInt } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await getUserRole(session.user.id);
  if (!hasMinRole(role, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const limit = clampInt(searchParams.get("limit"), 50, 1, 200);
  const offset = clampInt(searchParams.get("offset"), 0, 0, 100000);
  const userIdFilter = searchParams.get("userId");

  const logs = userIdFilter
    ? await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.userId, userIdFilter))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset)
    : await db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

  return NextResponse.json({ logs, limit, offset });
}
