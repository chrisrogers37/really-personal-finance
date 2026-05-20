import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { confirmMfaEnrollment, verifyMfaCode, hasMfaEnabled } from "@/lib/mfa";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

// NextAuth's session cookie names (insecure for HTTP, __Secure- prefix on HTTPS).
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

function readSessionToken(request: NextRequest): string | null {
  for (const name of SESSION_COOKIE_NAMES) {
    const v = request.cookies.get(name)?.value;
    if (v) return v;
  }
  return null;
}

async function markSessionMfaVerified(request: NextRequest): Promise<void> {
  const token = readSessionToken(request);
  if (!token) return;
  await db
    .update(sessions)
    .set({ mfaVerifiedAt: new Date() })
    .where(eq(sessions.sessionToken, token));
}

async function _POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string" || code.length < 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const rateLimitKey = `mfa:${session.user.id}`;
  const limit = await checkRateLimit(rateLimitKey);
  if (!limit.allowed) {
    await audit({
      userId: session.user.id,
      action: "auth.mfa_rate_limited",
      resource: "mfa",
      detail: { retryAfterMs: limit.retryAfterMs },
      request,
    });
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs! / 1000)) },
      },
    );
  }

  const isEnrolled = await hasMfaEnabled(session.user.id);

  if (!isEnrolled) {
    // First-time verification during enrollment
    const success = await confirmMfaEnrollment(session.user.id, code);
    if (!success) {
      const { remaining } = await recordFailure(rateLimitKey);
      await audit({
        userId: session.user.id,
        action: "auth.mfa_failed",
        resource: "mfa",
        detail: { phase: "enrollment", attemptsRemaining: remaining },
        request,
      });
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await resetAttempts(rateLimitKey);
    await markSessionMfaVerified(request);
    await audit({
      userId: session.user.id,
      action: "auth.mfa_verified",
      resource: "mfa",
      detail: { phase: "enrollment_confirmed" },
      request,
    });

    return NextResponse.json({ verified: true, enrolled: true });
  }

  // Login-time MFA verification
  const valid = await verifyMfaCode(session.user.id, code);
  if (!valid) {
    const { remaining } = await recordFailure(rateLimitKey);
    await audit({
      userId: session.user.id,
      action: "auth.mfa_failed",
      resource: "mfa",
      detail: { phase: "login", attemptsRemaining: remaining },
      request,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await resetAttempts(rateLimitKey);
  await markSessionMfaVerified(request);
  await audit({
    userId: session.user.id,
    action: "auth.mfa_verified",
    resource: "mfa",
    detail: { phase: "login" },
    request,
  });

  return NextResponse.json({ verified: true });
}

export const POST = withErrorHandling(_POST);
