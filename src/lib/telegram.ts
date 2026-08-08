const TELEGRAM_API = "https://api.telegram.org/bot";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

/**
 * A Telegram chat id encodes the kind of chat: a private chat's id is the user's
 * own id and is positive, while groups, supergroups and channels are negative.
 *
 * That makes "is this private?" decidable from a stored `chat_id` alone, which
 * the outbound paths need — a scheduled push has no inbound update to read
 * `chat.type` from, so the webhook's guard is unavailable to it.
 *
 * Anything not purely numeric — a leading `-`, an empty string, junk — is not
 * private. Fails closed.
 */
export function isPrivateChatId(chatId: string): boolean {
  return /^\d+$/.test(chatId.trim());
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
  options: { allowNonPrivateChat?: boolean } = {}
): Promise<boolean> {
  // Default-deny at the transmission choke point. Every message this app sends
  // goes through here, so a send site added later is safe without anyone
  // remembering to guard it — which is the failure this is fixing: the inbound
  // webhook was guarded while the scheduled alert push kept delivering the same
  // summaries to the same group chats, unprompted and with no asker to
  // authenticate.
  //
  // The single legitimate exception is telling a group that the bot will not
  // work there, which carries no user data and must reach the group to be read.
  if (!options.allowNonPrivateChat && !isPrivateChatId(chatId)) {
    console.error("Telegram send refused: chat id is not a private chat");
    return false;
  }

  const token = getBotToken();
  const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  if (!response.ok) {
    // Log status only — the response body can echo message/chat content (PII).
    console.error(`Telegram send failed: HTTP ${response.status}`);
    return false;
  }
  return true;
}
