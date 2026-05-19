import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { disableMfa, verifyMfaCode } from "@/lib/mfa";
import { audit } from "@/lib/audit";

async function _POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "MFA code required" }, { status: 400 });
  }

  // Require current MFA code to disable
  const valid = await verifyMfaCode(session.user.id, code);
  if (!valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

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
