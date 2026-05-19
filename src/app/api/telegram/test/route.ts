import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { db } from "@/db";
import { telegramConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const [config] = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.userId, session.user.id))
    .limit(1);

  if (!config) {
    return NextResponse.json(
      { error: "No Telegram configuration found. Set up your chat ID first." },
      { status: 404 }
    );
  }

  const success = await sendTelegramMessage(
    config.chatId,
    "Test alert from Really Personal Finance! Your Telegram integration is working."
  );

  if (!success) {
    return NextResponse.json(
      { error: "Failed to send test message. Check your chat ID and bot token." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
