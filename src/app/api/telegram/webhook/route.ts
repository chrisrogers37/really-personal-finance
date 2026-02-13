import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramConfigs, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";
import { timingSafeCompare } from "@/lib/validation";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; first_name: string };
  };
}

export async function POST(request: NextRequest) {
  // Webhook secret verification
  // Telegram sends X-Telegram-Bot-Api-Secret-Token when registered with secret_token
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!secretToken || !timingSafeCompare(secretToken, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update: TelegramUpdate = await request.json();

  if (!update.message?.text) {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message.chat.id.toString();
  const text = update.message.text.trim();

  if (text.startsWith("/start")) {
    // /start <user_email> — link Telegram to account
    const parts = text.split(" ");
    if (parts.length < 2) {
      await sendTelegramMessage(
        chatId,
        "Welcome to Really Personal Finance!\n\n" +
          "To link your account, send:\n" +
          "<code>/start your@email.com</code>\n\n" +
          "Use the same email you signed up with."
      );
      return NextResponse.json({ ok: true });
    }

    const email = parts[1].toLowerCase();

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.isCurrent, true)))
      .limit(1);

    if (!user) {
      await sendTelegramMessage(
        chatId,
        "No account found for that email. Make sure you've signed up at the website first."
      );
      return NextResponse.json({ ok: true });
    }

    // Upsert telegram config
    await db
      .insert(telegramConfigs)
      .values({ userId: user.userId, chatId, enabled: true })
      .onConflictDoUpdate({
        target: telegramConfigs.userId,
        set: { chatId, enabled: true },
      });

    await sendTelegramMessage(
      chatId,
      "Linked! You'll now receive spending alerts here.\n\n" +
        "Commands:\n" +
        "/summary — Today's spending summary\n" +
        "/pause — Pause alerts\n" +
        "/resume — Resume alerts"
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/pause") {
    await db
      .update(telegramConfigs)
      .set({ enabled: false })
      .where(eq(telegramConfigs.chatId, chatId));
    await sendTelegramMessage(chatId, "Alerts paused. Send /resume to restart.");
    return NextResponse.json({ ok: true });
  }

  if (text === "/resume") {
    await db
      .update(telegramConfigs)
      .set({ enabled: true })
      .where(eq(telegramConfigs.chatId, chatId));
    await sendTelegramMessage(chatId, "Alerts resumed!");
    return NextResponse.json({ ok: true });
  }

  if (text === "/summary") {
    // Fetch today's spending for this user
    const [config] = await db
      .select()
      .from(telegramConfigs)
      .where(eq(telegramConfigs.chatId, chatId))
      .limit(1);

    if (!config) {
      await sendTelegramMessage(
        chatId,
        "You haven't linked your account yet. Send /start your@email.com"
      );
      return NextResponse.json({ ok: true });
    }

    const { getDailySummary } = await import("@/lib/alerts");
    const summary = await getDailySummary(config.userId);
    await sendTelegramMessage(chatId, summary);
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(
    chatId,
    "Unknown command. Available commands:\n/start — Link your account\n/summary — Today's spending\n/pause — Pause alerts\n/resume — Resume alerts"
  );

  return NextResponse.json({ ok: true });
}
