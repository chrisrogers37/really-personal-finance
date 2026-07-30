import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { enrollMfa, hasMfaEnabled, verifyMfaCode } from "@/lib/mfa";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";

async function _POST(request: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  // Step-up: if a verified MFA credential already exists, re-enrollment must
  // prove possession of the CURRENT factor before the secret is overwritten.
  // Without this, a first-factor-only session could overwrite the victim's TOTP
  // secret and verify against the attacker's — a complete second-factor bypass.
  if (await hasMfaEnabled(session.user.id)) {
    // Rate-limit the step-up code (shared mfa:${userId} bucket with verify and
    // disable) so the 6-digit check can't be brute-forced by a first-factor session.
    const rateLimitKey = `mfa:${session.user.id}`;
    const limit = await checkRateLimit(rateLimitKey);
    if (!limit.allowed) {
      await audit({
        userId: session.user.id,
        action: "auth.mfa_rate_limited",
        resource: "mfa",
        detail: { phase: "reenroll_stepup", retryAfterMs: limit.retryAfterMs },
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

    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const currentCode =
      typeof body?.currentCode === "string" ? body.currentCode.trim() : "";
    if (!currentCode || !(await verifyMfaCode(session.user.id, currentCode))) {
      const { remaining } = await recordFailure(rateLimitKey);
      await audit({
        userId: session.user.id,
        action: "auth.mfa_failed",
        resource: "mfa",
        detail: { phase: "reenroll_stepup", attemptsRemaining: remaining },
        request,
      });
      return NextResponse.json(
        { error: "Current authenticator or recovery code required to re-enroll." },
        { status: 403 },
      );
    }

    await resetAttempts(rateLimitKey);
  }

  const { uri, secret, recoveryCodes } = await enrollMfa(
    session.user.id,
    session.user.email!,
  );

  await audit({
    userId: session.user.id,
    action: "auth.mfa_enrolled",
    resource: "mfa",
    detail: { status: "pending_verification" },
    request,
  });

  return NextResponse.json({ uri, secret, recoveryCodes });
}

export const POST = withErrorHandling(_POST);
