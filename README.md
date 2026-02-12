# Really Personal Finance

A personal finance tracker that connects to your real bank accounts, syncs transactions daily, and gives you spending insights via a web dashboard and Telegram alerts.

## Features

- **Bank Connection** — Securely connect bank accounts via Plaid (checking, savings, credit cards)
- **Transaction Sync** — Daily automated sync with up to 5 years of historical data
- **Dashboard** — Transaction list, spending by category (pie chart), spending by merchant (bar chart), income vs. spending (monthly)
- **Telegram Alerts** — Daily spending summaries, weekly comparisons, and anomaly detection pushed to your Telegram
- **Profile Management** — SCD2 (Slowly Changing Dimension Type 2) user profiles with full change history

## Privacy Notice

**By signing up, your bank transactions will be stored in the application's database.** Plaid access tokens are encrypted at rest using AES-256-GCM. This is an open-source project — review the code or self-host if you prefer.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Database**: Neon Postgres (via Vercel)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth.js v5 (email magic link)
- **Banking**: Plaid API
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Alerts**: Telegram Bot API
- **Hosting**: Vercel
- **Cron**: Vercel Cron Jobs

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- A [Plaid](https://plaid.com) developer account
- A Telegram bot (create via [@BotFather](https://t.me/BotFather))
- An SMTP email service (for magic links)

### Setup

1. Clone the repo:

```bash
git clone https://github.com/chrisrogers37/really-personal-finance.git
cd really-personal-finance
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

3. Push the database schema:

```bash
npx drizzle-kit push
```

4. Run the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram and create a new bot
2. Copy the bot token to `TELEGRAM_BOT_TOKEN` in your `.env`
3. Set the webhook URL (replace with your domain):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-domain.com/api/telegram/webhook"
```

4. Users link their accounts by messaging the bot: `/start their@email.com`

### Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy — cron jobs are configured in `vercel.json`

## Cron Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Transaction Sync | Daily at 6:00 AM UTC | Pulls new transactions from Plaid |
| Daily Alerts | Daily at 7:00 AM UTC | Sends spending summaries via Telegram |
| Weekly Alerts | Monday at 8:00 AM UTC | Sends week-over-week comparisons |

## Database Schema

The app uses SCD2 (Slowly Changing Dimension Type 2) for the users table, meaning profile updates create new versioned rows rather than overwriting. This provides a full audit trail of changes.

Key tables: `users`, `accounts`, `transactions`, `telegram_configs`, `sessions`, `verification_tokens`.

See `src/db/schema.ts` for the complete schema.

## License

MIT
