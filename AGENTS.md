# AGENTS.md

## Cursor Cloud specific instructions

This section captures non-obvious, durable context for running **really-personal-finance**
(a Next.js 16 personal-finance tracker) inside a Cursor Cloud VM. Standard commands
live in `package.json` and `docs/DEVELOPMENT.md`; only the non-obvious bits are here.

### What's already provisioned in the VM image

- **Node** deps: `npm install` (run automatically by the startup update script).
- **PostgreSQL 16** installed and running as cluster `main` on `127.0.0.1:5432`, with a
  role/db `neondb` / `neondb` (password `neondb`). Local HBA auth is set to `password`
  (see gotcha below).
- **Local Neon proxy** at `/home/ubuntu/neon-local-proxy/` — emulates Neon's serverless
  HTTP/WebSocket endpoint on `https://localhost:443` and forwards to local Postgres.
- **Local SMTP sink** at `/home/ubuntu/neon-local-proxy/smtp-sink.js` — captures NextAuth
  magic-link emails (there is no real SMTP configured locally).
- `~/.bashrc` exports `NODE_EXTRA_CA_CERTS=/home/ubuntu/neon-local-proxy/cert.pem` so Node
  (both `next` and `drizzle-kit`) trusts the proxy's self-signed cert.
- `/workspace/.env` is created for local dev (gitignored). Real secrets for Plaid, Google
  OAuth, Telegram, and SMTP are placeholders — those integrations are the only features
  that won't work out of the box.

### Why the local Neon proxy exists (key gotcha)

The DB client (`src/db/index.ts`) uses `@neondatabase/serverless` (`drizzle-orm/neon-http`),
which does NOT speak plain Postgres — it POSTs SQL to `https://<DATABASE_URL-host>/sql`.
The driver leaves **single-label hosts unmodified**, so `DATABASE_URL` must use host
`localhost` (e.g. `postgresql://neondb:neondb@localhost:5432/neondb`). Do NOT add
`?sslmode=require` and do NOT use a dotted host — either breaks local dev.

- App runtime uses the **HTTP** path (`POST /sql`), handled by the proxy.
- `drizzle-kit push`/`studio` use the **WebSocket** path (`wss://localhost/v2`), also handled
  by the proxy (raw pg protocol tunneled to Postgres).
- Postgres local HBA is set to `password` (not `scram-sha-256`) because the neon driver
  pipelines a cleartext password message; SCRAM causes a `08P01` protocol error over the
  tunnel.

### Starting the services

Run the helper (idempotent; starts Postgres + proxy + SMTP sink in tmux):

```bash
/home/ubuntu/neon-local-proxy/start.sh
```

Then start the app from `/workspace`:

```bash
npm run dev        # http://localhost:3000
```

Schema changes: `npm run db:push` (goes through the WS proxy). Tables already exist in the
`neondb` database.

### Logging in (no real email/OAuth)

Auth is NextAuth v5 (email magic link + Google). Locally, use the magic-link flow and read
the captured email:

1. Submit an email at `/auth/signin` (or POST the NextAuth `signin/email` endpoint with a
   CSRF token).
2. The SMTP sink writes the message to `/home/ubuntu/neon-local-proxy/last-email.txt` and
   prints the link in its tmux pane (`tmux -f /exec-daemon/tmux.portal.conf capture-pane -p -t smtp-sink:0.0`).
   The URL is quoted-printable encoded — decode `=3D` → `=` (e.g. with `python3 -c "import quopri;..."`).
3. Open the decoded `/api/auth/callback/email?...` URL to complete sign-in.

### Lint / test / build

- `npm test` — Vitest, 248 tests, no services needed (this is what CI runs).
- `npm run lint` — ESLint. Note: `main` currently has pre-existing lint errors/warnings that
  are unrelated to environment setup; a non-zero lint exit is expected on an unmodified tree.
- `npm run build` — `next build` (needs the DB + proxy up because it prerenders some routes).

### Manual test data

`test_data/american_express/activity.csv` and `test_data/bank_of_america/` are recognized by
the CSV auto-detector — good for exercising the Import flow.
