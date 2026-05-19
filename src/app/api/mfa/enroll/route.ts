import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { enrollMfa } from "@/lib/mfa";
import { audit } from "@/lib/audit";

async function _POST(request: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

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
