import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { telegramConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [config] = await db
    .select({
      id: telegramConfigs.id,
      chatId: telegramConfigs.chatId,
      enabled: telegramConfigs.enabled,
    })
    .from(telegramConfigs)
    .where(eq(telegramConfigs.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ config: config || null });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { chatId, enabled } = body as Record<string, unknown>;

  if (chatId !== undefined && (typeof chatId !== "string" || !chatId.trim())) {
    return NextResponse.json({ error: "Valid chat ID is required" }, { status: 400 });
  }

  if (enabled !== undefined && typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  // Upsert
  if (chatId) {
    await db
      .insert(telegramConfigs)
      .values({
        userId: session.user.id,
        chatId: chatId.trim(),
        enabled: enabled !== false,
      })
      .onConflictDoUpdate({
        target: telegramConfigs.userId,
        set: {
          chatId: chatId.trim(),
          enabled: enabled !== false,
        },
      });
  } else if (enabled !== undefined) {
    await db
      .update(telegramConfigs)
      .set({ enabled })
      .where(eq(telegramConfigs.userId, session.user.id));
  }

  const [updated] = await db
    .select({
      id: telegramConfigs.id,
      chatId: telegramConfigs.chatId,
      enabled: telegramConfigs.enabled,
    })
    .from(telegramConfigs)
    .where(eq(telegramConfigs.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ config: updated || null });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .delete(telegramConfigs)
    .where(eq(telegramConfigs.userId, session.user.id));

  return NextResponse.json({ success: true });
}
