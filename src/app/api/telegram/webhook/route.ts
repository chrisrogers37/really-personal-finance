import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramConfigs, telegramLinkTokens } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";
import { timingSafeCompare } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-helpers";

interface TelegramUpdate {
  message?: {
    chat: { id: number; type?: string };
    text?: string;
    from?: { id: number; first_name: string };
  };
}

async function _POST(request: NextRequest) {
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

  // Private chats only, and this is a delivery property rather than an
  // authorization one. Every reply below is sent to the chat that asked, so in a
  // group each member sees a summary regardless of who typed the command.
  // Identifying the sender would not fix that -- the delivery is the leak, and
  // there is no way to address a reply to one member of a group. The bot
  // therefore has no safe behaviour in a group, so it declines to act in one.
  //
  // Deliberately fails closed on a missing `type`: an update we cannot classify
  // is not treated as private.
  if (update.message.chat.type !== "private") {
    // The one message allowed to reach a non-private chat: it carries no user
    // data and has to be readable in the group to be of any use.
    await sendTelegramMessage(
      chatId,
      "For your security this bot only works in a direct message. " +
        "Open a private chat with me and send /start YOUR_CODE there.",
      "HTML",
      { allowNonPrivateChat: true }
    );
    return NextResponse.json({ ok: true });
  }

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

    // Rate limit failed /start attempts per chatId
    const rateLimitKey = `telegram-link:${chatId}`;
    const limit = await checkRateLimit(rateLimitKey);
    if (!limit.allowed) {
      await sendTelegramMessage(chatId, "Too many attempts. Try again later.");
      return NextResponse.json({ ok: true });
    }

    // Atomic: validate + mark as used in a single UPDATE...RETURNING to prevent TOCTOU races
    const now = new Date();
    const result = await db
      .update(telegramLinkTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(telegramLinkTokens.token, code),
          gt(telegramLinkTokens.expires, now),
          isNull(telegramLinkTokens.usedAt)
        )
      )
      .returning({ id: telegramLinkTokens.id, userId: telegramLinkTokens.userId });

    if (result.length === 0) {
      await recordFailure(rateLimitKey);
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

    const { userId } = result[0];
    await resetAttempts(rateLimitKey);

    // Upsert telegram config
    await db
      .insert(telegramConfigs)
      .values({ userId, chatId, enabled: true })
      .onConflictDoUpdate({
        target: telegramConfigs.userId,
        set: { chatId, enabled: true },
      });

    await Promise.all([
      audit({
        userId,
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

export const POST = withErrorHandling(_POST);
