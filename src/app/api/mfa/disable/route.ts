import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disableMfa, verifyMfaCode } from "@/lib/mfa";
import { audit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
