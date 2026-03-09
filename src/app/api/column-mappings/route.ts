import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { columnMappings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mappings = await db
    .select()
    .from(columnMappings)
    .where(eq(columnMappings.userId, session.user.id))
    .orderBy(columnMappings.createdAt);

  return NextResponse.json({ mappings });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
