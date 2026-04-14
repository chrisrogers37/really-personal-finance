import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enrollMfa } from "@/lib/mfa";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
