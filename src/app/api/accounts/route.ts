import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAccountInput } from "@/lib/validation";

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const userAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      subtype: accounts.subtype,
      mask: accounts.mask,
      source: accounts.source,
    })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  return NextResponse.json({ accounts: userAccounts });
}

async function _POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const result = validateAccountInput(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [created] = await db
    .insert(accounts)
    .values({
      userId: session.user.id,
      name: result.name,
      type: result.type,
      subtype: result.subtype,
      mask: result.mask,
      source: "import",
    })
    .returning();

  return NextResponse.json({
    account: {
      id: created.id,
      name: created.name,
      type: created.type,
      subtype: created.subtype,
      mask: created.mask,
      source: created.source,
    },
  });
}

export const GET = withErrorHandling(_GET);
export const POST = withErrorHandling(_POST);
