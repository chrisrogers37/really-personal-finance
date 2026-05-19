import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { getConsentHistory } from "@/lib/consent";

export async function GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const history = await getConsentHistory(session.user.id);
  return NextResponse.json({ history });
}
