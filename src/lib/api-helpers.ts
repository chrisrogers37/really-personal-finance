import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "./auth";
import { getUserRole, hasMinRole, type UserRole } from "./rbac";

export type AuthGuard = { userId: string; session: Session };
export type RoleGuard = AuthGuard & { role: UserRole };

export async function requireUser(): Promise<AuthGuard | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { userId: session.user.id, session };
}

export async function requireRole(
  minRole: UserRole,
): Promise<RoleGuard | NextResponse> {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const role = await getUserRole(guard.userId);
  if (!hasMinRole(role, minRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { ...guard, role };
}

export async function requireAdmin(): Promise<RoleGuard | NextResponse> {
  return requireRole("admin");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => Promise<Response> | Response;

export function withErrorHandling<H extends AnyHandler>(handler: H): H {
  return (async (...args: Parameters<H>) => {
    try {
      return await handler(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const firstArg = args[0] as unknown;
      const url =
        firstArg instanceof Request ? firstArg.url : "unknown";
      console.error(`[api] ${url}: ${message}`);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  }) as H;
}
