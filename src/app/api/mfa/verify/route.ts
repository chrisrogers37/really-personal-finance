import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmMfaEnrollment, verifyMfaCode, hasMfaEnabled } from "@/lib/mfa";
import { audit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string" || code.length < 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const isEnrolled = await hasMfaEnabled(session.user.id);

  if (!isEnrolled) {
    // First-time verification during enrollment
    const success = await confirmMfaEnrollment(session.user.id, code);
    if (!success) {
      await audit({
        userId: session.user.id,
        action: "auth.mfa_failed",
        resource: "mfa",
        detail: { phase: "enrollment" },
        request,
      });
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

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
    await audit({
      userId: session.user.id,
      action: "auth.mfa_failed",
      resource: "mfa",
      detail: { phase: "login" },
      request,
    });
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await audit({
    userId: session.user.id,
    action: "auth.mfa_verified",
    resource: "mfa",
    detail: { phase: "login" },
    request,
  });

  return NextResponse.json({ verified: true });
}
