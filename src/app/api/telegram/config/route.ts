import { NextRequest, NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { db } from "@/db";
import { telegramConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

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

async function _PUT(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await request.json();
  const { chatId, enabled } = body as Record<string, unknown>;

  // Chat binding belongs exclusively to the `/start <code>` webhook flow, where
  // the chat id arrives in Telegram's own update payload rather than from the
  // caller. A chat id sent here is an unproven claim, and the binding it creates
  // routes financial-summary PII — so it is refused outright rather than
  // validated, because no check available here could make it trustworthy.
  if (chatId !== undefined) {
    return NextResponse.json(
      { error: "chatId cannot be set here — link Telegram with a one-time code" },
      { status: 400 },
    );
  }

  if (enabled !== undefined && typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  if (enabled !== undefined) {
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

async function _DELETE() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  await db
    .delete(telegramConfigs)
    .where(eq(telegramConfigs.userId, session.user.id));

  return NextResponse.json({ success: true });
}

export const GET = withErrorHandling(_GET);
export const PUT = withErrorHandling(_PUT);
export const DELETE = withErrorHandling(_DELETE);
