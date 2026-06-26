import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { disableMfa, verifyMfaCode } from "@/lib/mfa";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";

async function _POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "MFA code required" }, { status: 400 });
  }

  // Rate-limit MFA code attempts (shared bucket with verify) so a stolen
  // session can't brute-force the 6-digit code to disable MFA.
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

  // Require current MFA code to disable
  const valid = await verifyMfaCode(session.user.id, code);
  if (!valid) {
    const { remaining } = await recordFailure(rateLimitKey);
    await audit({
      userId: session.user.id,
      action: "auth.mfa_failed",
      resource: "mfa",
      detail: { phase: "disable", attemptsRemaining: remaining },
      request,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await resetAttempts(rateLimitKey);
  await disableMfa(session.user.id);

  await audit({
    userId: session.user.id,
    action: "auth.mfa_disabled",
    resource: "mfa",
    request,
  });

  return NextResponse.json({ disabled: true });
}

export const POST = withErrorHandling(_POST);
