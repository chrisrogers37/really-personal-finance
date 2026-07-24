import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { enrollMfa, hasMfaEnabled, verifyMfaCode } from "@/lib/mfa";
import { audit } from "@/lib/audit";

async function _POST(request: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  // Step-up: if a verified MFA credential already exists, re-enrollment must
  // prove possession of the CURRENT factor before the secret is overwritten.
  // Without this, a first-factor-only session could overwrite the victim's TOTP
  // secret and verify against the attacker's — a complete second-factor bypass.
  if (await hasMfaEnabled(session.user.id)) {
    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const currentCode =
      typeof body?.currentCode === "string" ? body.currentCode.trim() : "";
    if (!currentCode || !(await verifyMfaCode(session.user.id, currentCode))) {
      await audit({
        userId: session.user.id,
        action: "auth.mfa_failed",
        resource: "mfa",
        detail: { phase: "reenroll_stepup" },
        request,
      });
      return NextResponse.json(
        { error: "Current authenticator or recovery code required to re-enroll." },
        { status: 403 },
      );
    }
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
