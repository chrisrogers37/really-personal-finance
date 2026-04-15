import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { grantConsent, revokeConsent, getActiveConsents, VALID_CONSENT_TYPES } from "@/lib/consent";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const consents = await getActiveConsents(session.user.id);
  return NextResponse.json({ consents });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { consentType, version, action } = body;

  if (!consentType || !VALID_CONSENT_TYPES.includes(consentType)) {
    return NextResponse.json({ error: "Invalid consent type" }, { status: 400 });
  }

  const ipAddress = request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip");

  if (action === "revoke") {
    await revokeConsent(session.user.id, consentType);
    await audit({
      userId: session.user.id,
      action: "consent.revoked",
      resource: "consent",
      detail: { consentType },
      request,
    });
    return NextResponse.json({ revoked: true });
  }

  if (!version || typeof version !== "string") {
    return NextResponse.json({ error: "Version required" }, { status: 400 });
  }

  await grantConsent(session.user.id, consentType, version, ipAddress);
  await audit({
    userId: session.user.id,
    action: "consent.granted",
    resource: "consent",
    detail: { consentType, version },
    request,
  });

  return NextResponse.json({ granted: true });
}
