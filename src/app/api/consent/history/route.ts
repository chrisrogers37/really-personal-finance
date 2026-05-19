import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getConsentHistory } from "@/lib/consent";

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const history = await getConsentHistory(session.user.id);
  return NextResponse.json({ history });
}

export const GET = withErrorHandling(_GET);
