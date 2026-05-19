import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { getUserHistory } from "@/lib/scd2";

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

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

export const GET = withErrorHandling(_GET);
