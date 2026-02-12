import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserHistory } from "@/lib/scd2";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await getUserHistory(session.user.id);

  return NextResponse.json({
    history: history.map((row) => ({
      email: row.email,
      name: row.name,
      validFrom: row.validFrom,
      validTo: row.validTo,
      isCurrent: row.isCurrent,
    })),
  });
}
