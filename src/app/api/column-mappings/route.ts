import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { db } from "@/db";
import { columnMappings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const mappings = await db
    .select()
    .from(columnMappings)
    .where(eq(columnMappings.userId, session.user.id))
    .orderBy(columnMappings.createdAt);

  return NextResponse.json({ mappings });
}

async function _POST(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const { name, columns, dateFormat, amountConvention, skipRows } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!columns || typeof columns !== "object" || !columns.date || !columns.amount || !columns.description) {
    return NextResponse.json(
      { error: "Columns mapping must include date, amount, and description" },
      { status: 400 }
    );
  }

  const [mapping] = await db
    .insert(columnMappings)
    .values({
      userId: session.user.id,
      name: name.trim(),
      columns,
      dateFormat: dateFormat || null,
      amountConvention: amountConvention || "positive_outflow",
      skipRows: skipRows || 0,
    })
    .returning();

  return NextResponse.json({ mapping }, { status: 201 });
}

async function _DELETE(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await db
    .delete(columnMappings)
    .where(
      and(eq(columnMappings.id, id), eq(columnMappings.userId, session.user.id))
    );

  return NextResponse.json({ success: true });
}

export const GET = withErrorHandling(_GET);
export const POST = withErrorHandling(_POST);
export const DELETE = withErrorHandling(_DELETE);
