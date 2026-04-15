import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConsentHistory } from "@/lib/consent";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await getConsentHistory(session.user.id);
  return NextResponse.json({ history });
}
