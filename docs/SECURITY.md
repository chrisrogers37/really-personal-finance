# Security Documentation

This document describes the security measures in the application, how sensitive data is protected, and what to be aware of when making changes.

## Overview of Security Layers

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Authentication | NextAuth email magic links | User identity |
| Session Management | Database-backed sessions with tokens | Session integrity |
| Route Protection | Next.js middleware | Unauthorized page access |
| API Authorization | Session checks in each route handler | Unauthorized API access |
| Cron Protection | Bearer token (CRON_SECRET) | Cron endpoints from public access |
| Webhook Protection | Timing-safe secret comparison | Telegram webhook from spoofing |
| Token Encryption | AES-256-GCM | Plaid access tokens at rest |
| Transport Security | HTTPS (enforced by Vercel) | Data in transit |

## Authentication

### Email Magic Links

The application uses NextAuth.js v5 with the email provider. No passwords are stored.

**Flow:**
1. User enters their email on `/auth/signin`
2. NextAuth generates a verification token and stores it in the `verification_tokens` table
3. An email containing a magic link is sent via SMTP
4. User clicks the link, which hits NextAuth's callback route
5. NextAuth verifies the token (and deletes it), creates a session, and redirects to the dashboard
6. If the user doesn't exist, a new user row is created (SCD2 initial version)

**Token lifecycle:** Verification tokens are single-use. They are deleted from the database immediately after being consumed. They also have an expiration time set by NextAuth.

### Session Management

Sessions are stored in the `sessions` table (not JWT-based). The session token is sent to the browser as a cookie and looked up in the database on each request via `auth()`.

**File:** `src/lib/auth.ts` (adapter methods: `createSession`, `getSessionAndUser`, `updateSession`, `deleteSession`)

## Route Protection

### Middleware

**File:** `src/middleware.ts`

The middleware intercepts requests to protected routes and enforces authentication:

```
/dashboard/*  --> Requires active session, redirects to /auth/signin if not logged in
/profile/*    --> Requires active session, redirects to /auth/signin if not logged in
/auth/*       --> If already logged in, redirects to /dashboard (prevents re-authentication)
/api/cron/*   --> Passes through (protected by CRON_SECRET instead)
/api/telegram/* --> Passes through (protected by webhook secret instead)
```

The middleware only runs on paths matching the `config.matcher` pattern: `/dashboard/:path*`, `/profile/:path*`, `/auth/:path*`.

### API Route Authorization

Every user-facing API route independently checks for a valid session:

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

All database queries are scoped to `session.user.id`, preventing users from accessing each other's data.

## Encryption: Plaid Access Tokens

**File:** `src/lib/encryption.ts`

Plaid access tokens are permanent credentials that grant access to a user's bank data. They are encrypted before being stored in the database.

### Algorithm: AES-256-GCM

- **AES-256:** 256-bit key, symmetric encryption
- **GCM (Galois/Counter Mode):** Provides both confidentiality and integrity (authenticated encryption)
- **Auth tag:** 16-byte authentication tag detects any tampering with the ciphertext

### Key Management

The encryption key is a 64-character hexadecimal string (32 bytes) stored in the `ENCRYPTION_KEY` environment variable. It is never committed to source control.

**Generating a key:**
```bash
openssl rand -hex 32
```

**Validation:** The `getKey()` function throws an error if:
- `ENCRYPTION_KEY` is not set
- `ENCRYPTION_KEY` is not exactly 64 characters long

### Ciphertext Format

Encrypted values are stored as a colon-separated string:

```
<iv_hex>:<auth_tag_hex>:<encrypted_data_hex>
```

- **IV (Initialization Vector):** 16 random bytes, unique per encryption. Ensures that encrypting the same plaintext produces different ciphertext each time.
- **Auth Tag:** 16-byte GCM authentication tag. Detects if the ciphertext has been modified.
- **Encrypted Data:** The AES-256-GCM encrypted plaintext.

### Encrypt/Decrypt Functions

```typescript
// Encrypting (done in /api/plaid/exchange-token)
const encrypted = encrypt(plaidAccessToken);
// Result: "a1b2c3....:d4e5f6....:789abc...."

// Decrypting (done in /api/cron/sync-transactions)
const accessToken = decrypt(encryptedValue);
```

### What happens if the ENCRYPTION_KEY changes

If you rotate the `ENCRYPTION_KEY`, all existing encrypted tokens become undecryptable. You would need to:
1. Decrypt all tokens with the old key
2. Re-encrypt with the new key
3. Update the database

There is no built-in key rotation mechanism. This is a known limitation.

## Cron Endpoint Protection

**Files:** `src/app/api/cron/sync-transactions/route.ts`, `src/app/api/cron/send-alerts/route.ts`

Cron endpoints are protected by a bearer token:

```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

Vercel automatically sends this header when invoking cron jobs defined in `vercel.json`. The `CRON_SECRET` is set as an environment variable in the Vercel project settings.

**Note:** The comparison here uses simple string equality (`!==`), not timing-safe comparison. This is acceptable because CRON_SECRET is a server-to-server secret that isn't exposed to timing attacks from the public internet in practice (Vercel handles the request internally).

## Telegram Webhook Protection

**File:** `src/app/api/telegram/webhook/route.ts`

The Telegram webhook is protected by a secret token:

```typescript
const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!secretToken || !timingSafeCompare(secretToken, expectedSecret)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Timing-Safe Comparison

**File:** `src/lib/validation.ts`

The `timingSafeCompare()` function prevents timing attacks:

```typescript
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid early-exit timing leak
    const buf = Buffer.from(a);
    timingSafeEqual(buf, buf);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

**Why this matters:** A naive `===` comparison can leak information about how many characters match through response timing differences. An attacker could guess the secret one character at a time. Timing-safe comparison ensures constant-time execution regardless of how many characters match.

**When lengths differ:** The function still performs a comparison operation (`timingSafeEqual(buf, buf)`) to maintain consistent timing, then returns `false`.

### Setting Up the Webhook Secret

When registering the webhook with Telegram, include the `secret_token` parameter:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>"
  }'
```

Telegram will include this secret in the `X-Telegram-Bot-Api-Secret-Token` header of every webhook request.

## Input Validation

**File:** `src/lib/validation.ts`

### Date Parameters

All API routes that accept date parameters validate them against the `YYYY-MM-DD` regex pattern:

```typescript
const ISO_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
```

Invalid dates return a `400` error.

### Integer Clamping

Pagination parameters (`limit`, `offset`) are clamped to safe ranges:

```typescript
const limit = clampInt(searchParams.get("limit"), 100, 1, 200);
const offset = clampInt(searchParams.get("offset"), 0, 0, 100000);
```

This prevents:
- Negative values
- Extremely large values (resource exhaustion)
- Non-numeric input (defaults to a safe value)

### Email Validation

Profile updates validate email format with a basic regex:

```typescript
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
}
```

## Secrets Management

All secrets are stored in environment variables and never committed to source control.

| Secret | Env Variable | Purpose |
|--------|-------------|---------|
| Database password | `DATABASE_URL` | Embedded in connection string |
| Session encryption | `NEXTAUTH_SECRET` | Encrypts NextAuth internal tokens |
| SMTP credentials | `EMAIL_SERVER` | Embedded in SMTP connection string |
| Plaid API credentials | `PLAID_CLIENT_ID`, `PLAID_SECRET` | Plaid API access |
| Telegram bot token | `TELEGRAM_BOT_TOKEN` | Telegram Bot API access |
| Webhook secret | `TELEGRAM_WEBHOOK_SECRET` | Telegram webhook verification |
| Token encryption key | `ENCRYPTION_KEY` | AES-256 key for Plaid token encryption |
| Cron secret | `CRON_SECRET` | Cron endpoint authorization |

**Files:**
- `.env.example` -- Template with placeholder values (committed to repo)
- `.env` -- Actual values (in `.gitignore`, never committed)

## Security Checklist for New Features

When adding new functionality, verify:

- [ ] API endpoints check `auth()` session (unless intentionally public)
- [ ] Database queries are scoped to the authenticated user's ID
- [ ] User input is validated before use (dates, numbers, strings)
- [ ] No secrets are logged or included in API responses
- [ ] Sensitive data (tokens, passwords) is encrypted before storage
- [ ] New public-facing endpoints (cron, webhook) have their own authentication
- [ ] No raw user input is interpolated into SQL (use Drizzle's parameterized queries)
