# Telegram Bot Guide

The application includes a Telegram bot that sends spending alerts and responds to commands. This document covers setup, architecture, commands, and how to extend the bot.

## Setup

### 1. Create the bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts (choose a name and username)
3. BotFather will give you a bot token like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
4. Set this as `TELEGRAM_BOT_TOKEN` in your `.env`

### 2. Generate a webhook secret

```bash
openssl rand -base64 32
```

Set the output as `TELEGRAM_WEBHOOK_SECRET` in your `.env`.

### 3. Register the webhook

After deploying (or using a tunnel like ngrok for local dev), register the webhook URL with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
  }'
```

You should get a response like:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

### 4. Verify the webhook

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

This shows the current webhook URL, pending update count, and any errors.

## Architecture

### Webhook Endpoint

**File:** `src/app/api/telegram/webhook/route.ts`

Telegram sends a POST request to this endpoint whenever someone messages the bot. The endpoint:

1. Verifies the `X-Telegram-Bot-Api-Secret-Token` header using timing-safe comparison
2. Parses the Telegram Update object from the request body
3. Extracts the chat ID and message text
4. Routes to the appropriate command handler
5. Returns `{ "ok": true }` (Telegram expects a 200 response)

### Message Sending

**File:** `src/lib/telegram.ts`

The `sendTelegramMessage()` function sends messages via the Telegram Bot API:

```typescript
async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML"
): Promise<boolean>
```

- Uses native `fetch()` to call `https://api.telegram.org/bot<token>/sendMessage`
- Returns `true` on success, `false` on failure
- Default parse mode is HTML (supports `<b>`, `<code>`, `<i>` tags)
- Logs errors to console on failure

### Alert Generation

**File:** `src/lib/alerts.ts`

Contains the logic for generating alert messages:

| Function | Description |
|----------|-------------|
| `getDailySummary(userId)` | Generates today's spending summary (total, transaction count, income, top 5 merchants) |
| `getWeeklyComparison(userId)` | Compares this week vs. last week spending (totals and percentage change) |
| `detectAnomalies(userId)` | Finds merchants where this week's spending is >2x the 4-week average and >$20 |
| `sendDailyAlerts()` | Sends daily summary + anomalies to all enabled users |
| `sendWeeklyAlerts()` | Sends weekly comparison to all enabled users |

## Bot Commands

### `/start <email>`

Links the user's Telegram account to their Really Personal Finance account.

**Behavior:**
1. Extracts the email from the message text
2. Looks up the user by email in the `users` table (current version only)
3. If found, upserts a row in `telegram_configs` with the chat ID and `enabled = true`
4. Sends a confirmation message with available commands

**If no email is provided** (`/start` alone): Sends a welcome message explaining how to link.

**If no user is found:** Sends an error message suggesting the user sign up first.

### `/pause`

Disables alerts for the current chat.

**Behavior:**
1. Updates `telegram_configs` where `chat_id` matches, setting `enabled = false`
2. Sends "Alerts paused. Send /resume to restart."

### `/resume`

Re-enables alerts for the current chat.

**Behavior:**
1. Updates `telegram_configs` where `chat_id` matches, setting `enabled = true`
2. Sends "Alerts resumed!"

### `/summary`

Sends an immediate daily spending summary for today.

**Behavior:**
1. Looks up the user by chat ID in `telegram_configs`
2. If not linked, sends an error message
3. Calls `getDailySummary(userId)` to generate the summary
4. Sends the summary message

### Unknown commands

Any unrecognized message gets a reply listing all available commands.

## Automated Alerts

### Daily Alerts (7:00 AM UTC)

Triggered by `GET /api/cron/send-alerts?type=daily` via Vercel Cron.

For each user with `telegram_configs.enabled = true`:

1. **Daily Summary** message:
   ```
   Daily Summary -- 2024-01-15

   Spent: $142.50 (5 transactions)
   Income: $0.00

   Top Spending:
     Uber Eats: $35.00
     Starbucks: $12.50
     Amazon: $95.00
   ```

2. **Anomaly Detection** (sent as a separate message, only if anomalies found):
   ```
   Unusual Spending Alert

   Amazon: $250.00 this week (avg: $62.50/week)
   ```

   An anomaly is flagged when:
   - This week's spending at a merchant is > 2x the 4-week weekly average
   - This week's spending at that merchant is > $20 (filters out noise)

### Weekly Alerts (Mondays at 8:00 AM UTC)

Triggered by `GET /api/cron/send-alerts?type=weekly` via Vercel Cron.

For each user with `telegram_configs.enabled = true`:

```
Weekly Comparison

This week: $523.40
Last week: $412.15

Up $111.25 (+27.0%) from last week
```

The week starts on Monday (`weekStartsOn: 1` in date-fns).

### Error Handling

Both `sendDailyAlerts()` and `sendWeeklyAlerts()` use `Promise.allSettled()` to process all users in parallel. If sending to one user fails (e.g., Telegram API error, invalid chat ID), it does not block alerts for other users. Failures are logged to the console.

## Database Table

**Table:** `telegram_configs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to users (unique -- one config per user) |
| `chat_id` | text | Telegram chat ID |
| `enabled` | boolean | Whether alerts are active (default: true) |
| `created_at` | timestamp | When the link was created |

The `user_id` column has a unique constraint, so each user can only have one Telegram configuration. The `/start` command uses `ON CONFLICT DO UPDATE` to handle re-linking (updates the chat ID and re-enables alerts).

## Adding a New Bot Command

To add a new command (e.g., `/weekly`):

1. **Edit** `src/app/api/telegram/webhook/route.ts`
2. Add a new `if (text === "/weekly")` block before the "unknown command" fallback
3. Implement the handler (query database, generate message, call `sendTelegramMessage()`)
4. Update the "unknown command" response to include the new command in the help text
5. Update the `/start` confirmation message to list the new command

Example:
```typescript
if (text === "/weekly") {
  const [config] = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.chatId, chatId))
    .limit(1);

  if (!config) {
    await sendTelegramMessage(chatId, "Link your account first with /start your@email.com");
    return NextResponse.json({ ok: true });
  }

  const { getWeeklyComparison } = await import("@/lib/alerts");
  const comparison = await getWeeklyComparison(config.userId);
  await sendTelegramMessage(chatId, comparison);
  return NextResponse.json({ ok: true });
}
```

## Adding a New Alert Type

To add a new automated alert (e.g., monthly summary):

1. **Create the generator** in `src/lib/alerts.ts` (e.g., `getMonthlySummary(userId)`)
2. **Create the sender** in `src/lib/alerts.ts` (e.g., `sendMonthlyAlerts()`)
3. **Add a cron trigger** in `vercel.json`:
   ```json
   {
     "path": "/api/cron/send-alerts?type=monthly",
     "schedule": "0 9 1 * *"
   }
   ```
4. **Handle the type** in `src/app/api/cron/send-alerts/route.ts`:
   ```typescript
   if (type === "monthly") {
     await sendMonthlyAlerts();
     return NextResponse.json({ success: true, type: "monthly" });
   }
   ```

## Local Development

For local testing of the Telegram webhook, you need a public URL. Options:

1. **ngrok:** `ngrok http 3000` -- gives you a public URL that tunnels to localhost
2. **Cloudflare Tunnel:** Similar to ngrok but with Cloudflare
3. **Manual testing:** Use curl to simulate Telegram webhook requests:

```bash
curl -X POST http://localhost:3000/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: <YOUR_SECRET>" \
  -d '{
    "message": {
      "chat": { "id": 123456789 },
      "text": "/summary",
      "from": { "id": 123456789, "first_name": "Test" }
    }
  }'
```

## Message Formatting

Messages use HTML parse mode by default. Supported tags:

| Tag | Renders as |
|-----|-----------|
| `<b>text</b>` | **bold** |
| `<i>text</i>` | *italic* |
| `<code>text</code>` | `monospace` |
| `<pre>text</pre>` | code block |
| `<a href="url">text</a>` | hyperlink |

See the [Telegram Bot API formatting docs](https://core.telegram.org/bots/api#html-style) for the full list.
