import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { confirmMfaEnrollment, verifyMfaCode, hasMfaEnabled } from "@/lib/mfa";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";

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
  const limit = checkRateLimit(rateLimitKey);
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
      const { remaining } = recordFailure(rateLimitKey);
      await audit({
        userId: session.user.id,
        action: "auth.mfa_failed",
        resource: "mfa",
        detail: { phase: "enrollment", attemptsRemaining: remaining },
        request,
      });
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    resetAttempts(rateLimitKey);
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
    const { remaining } = recordFailure(rateLimitKey);
    await audit({
      userId: session.user.id,
      action: "auth.mfa_failed",
      resource: "mfa",
      detail: { phase: "login", attemptsRemaining: remaining },
      request,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  resetAttempts(rateLimitKey);
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
