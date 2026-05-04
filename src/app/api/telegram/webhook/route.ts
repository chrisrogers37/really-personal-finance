import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramConfigs, telegramLinkTokens } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";
import { timingSafeCompare } from "@/lib/validation";
import { audit } from "@/lib/audit";

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
    // /start <link_code> — link Telegram via one-time code from the web app
    const parts = text.split(" ");
    if (parts.length < 2) {
      await sendTelegramMessage(
        chatId,
        "Welcome to Really Personal Finance!\n\n" +
          "To link your account:\n" +
          "1. Log in at the website\n" +
          "2. Go to Settings > Telegram Alerts\n" +
          "3. Click \"Generate Link Code\"\n" +
          "4. Send: /start YOUR_CODE"
      );
      return NextResponse.json({ ok: true });
    }

    const code = parts[1].toUpperCase().trim();

    const now = new Date();
    const [linkToken] = await db
      .select({ id: telegramLinkTokens.id, userId: telegramLinkTokens.userId })
      .from(telegramLinkTokens)
      .where(
        and(
          eq(telegramLinkTokens.token, code),
          gt(telegramLinkTokens.expires, now),
          isNull(telegramLinkTokens.usedAt)
        )
      )
      .limit(1);

    if (!linkToken) {
      await Promise.all([
        audit({
          action: "telegram.link_failed",
          resource: "telegram_link_tokens",
          detail: { chatId, reason: "invalid_or_expired_token" },
        }),
        sendTelegramMessage(
          chatId,
          "Invalid or expired code. Please generate a new one from the website Settings page."
        ),
      ]);
      return NextResponse.json({ ok: true });
    }

    // Mark token as used
    await db
      .update(telegramLinkTokens)
      .set({ usedAt: now })
      .where(eq(telegramLinkTokens.id, linkToken.id));

    // Upsert telegram config
    await db
      .insert(telegramConfigs)
      .values({ userId: linkToken.userId, chatId, enabled: true })
      .onConflictDoUpdate({
        target: telegramConfigs.userId,
        set: { chatId, enabled: true },
      });

    await Promise.all([
      audit({
        userId: linkToken.userId,
        action: "telegram.link_completed",
        resource: "telegram_configs",
        detail: { chatId },
      }),
      sendTelegramMessage(
        chatId,
        "Linked! You'll now receive spending alerts here.\n\n" +
          "Commands:\n" +
          "/summary — Today's spending summary\n" +
          "/pause — Pause alerts\n" +
          "/resume — Resume alerts"
      ),
    ]);
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
        "You haven't linked your account yet. Log in at the website, go to Settings, and generate a link code."
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
