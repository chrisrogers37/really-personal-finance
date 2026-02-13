# Phase 03: Security Hardening -- Telegram Webhook Auth + API Input Validation

## PR Metadata

| Field | Value |
|-------|-------|
| **PR Title** | `security: add Telegram webhook auth and API input validation` |
| **Risk Level** | **Medium** -- Security fix, but additive guards (not business logic refactors) |
| **Estimated Effort** | 2-3 hours implementation + 1 hour manual testing |
| **Files Modified** | 6 existing files + 1 new file |
| **New Files** | `src/lib/validation.ts` |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/validation.ts` | **NEW** -- shared validation utilities |
| `src/app/api/telegram/webhook/route.ts` | Add webhook secret verification |
| `src/app/api/transactions/route.ts` | Clamp limit/offset, validate dates |
| `src/app/api/analytics/spending-by-category/route.ts` | Validate dates |
| `src/app/api/analytics/spending-by-merchant/route.ts` | Clamp limit, validate dates |
| `src/app/api/analytics/income-vs-spending/route.ts` | Validate dates |
| `.env.example` | Add `TELEGRAM_WEBHOOK_SECRET` |

## Dependencies and Blocks

- **Blocks:** Nothing
- **Blocked by:** Nothing
- **Can run in parallel with:** Phase 01, Phase 02
- **Deployment requirement:** `TELEGRAM_WEBHOOK_SECRET` env var MUST be set BEFORE deploying. If missing, the webhook returns 500 (fail closed), breaking Telegram bot functionality.
- **Post-deploy requirement:** Re-register Telegram webhook with `secret_token` parameter.

---

## Step-by-Step Implementation

### Step 1: Create `src/lib/validation.ts`

**NEW FILE** -- create at `src/lib/validation.ts`:

```typescript
import { timingSafeEqual } from "crypto";

/**
 * ISO date format regex: YYYY-MM-DD
 */
const ISO_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates that a string is in YYYY-MM-DD format.
 */
export function isValidDateParam(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

/**
 * Clamps a numeric value between min and max (inclusive).
 * If the parsed value is NaN, returns the defaultValue.
 */
export function clampInt(
  raw: string | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  const parsed = parseInt(raw || String(defaultValue), 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
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

### Step 2: Add `TELEGRAM_WEBHOOK_SECRET` to `.env.example`

**File:** `.env.example`

**BEFORE** (lines 17-18):
```
# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

**AFTER** (lines 17-19):
```
# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_SECRET=generate-a-random-secret-here
```

### Step 3: Add webhook auth to Telegram route

**File:** `src/app/api/telegram/webhook/route.ts`

**BEFORE** (lines 1-16):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { telegramConfigs, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";

interface TelegramUpdate {
  message?: {
    chat: { id: number };
    text?: string;
    from?: { id: number; first_name: string };
  };
}

export async function POST(request: NextRequest) {
  const update: TelegramUpdate = await request.json();
```

**AFTER** (lines 1-33):
```typescript
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
```

Lines 33 onward are unchanged.

### Step 4: Add validation to transactions route

**File:** `src/app/api/transactions/route.ts`

**BEFORE** (lines 1-20):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { eq, and, gte, lte, ilike, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");
  const merchant = searchParams.get("merchant");
  const accountId = searchParams.get("accountId");
  const limit = parseInt(searchParams.get("limit") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");
```

**AFTER** (lines 1-31):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { eq, and, gte, lte, ilike, desc } from "drizzle-orm";
import { clampInt, isValidDateParam } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const category = searchParams.get("category");
  const merchant = searchParams.get("merchant");
  const accountId = searchParams.get("accountId");

  // Clamp limit to [1, 200], default 100
  const limit = clampInt(searchParams.get("limit"), 100, 1, 200);
  // Clamp offset to [0, 100000], default 0
  const offset = clampInt(searchParams.get("offset"), 0, 0, 100000);

  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
```

Lines 32 onward are unchanged.

### Step 5: Add validation to spending-by-category route

**File:** `src/app/api/analytics/spending-by-category/route.ts`

Add import on line 6:
```typescript
import { isValidDateParam } from "@/lib/validation";
```

Insert after line 15 (after extracting `endDate`), before the `conditions` array:
```typescript
  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
```

### Step 6: Add validation to spending-by-merchant route

**File:** `src/app/api/analytics/spending-by-merchant/route.ts`

Add import on line 6:
```typescript
import { clampInt, isValidDateParam } from "@/lib/validation";
```

Replace line 16:
```typescript
// BEFORE:
const limit = parseInt(searchParams.get("limit") || "20");

// AFTER:
const limit = clampInt(searchParams.get("limit"), 20, 1, 100);
```

Insert date validation after the limit line:
```typescript
  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
```

### Step 7: Add validation to income-vs-spending route

**File:** `src/app/api/analytics/income-vs-spending/route.ts`

Add import on line 6:
```typescript
import { isValidDateParam } from "@/lib/validation";
```

Insert date validation after extracting `endDate` (line 15), before the `conditions` array:
```typescript
  if (startDate && !isValidDateParam(startDate)) {
    return NextResponse.json({ error: "Invalid startDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
  if (endDate && !isValidDateParam(endDate)) {
    return NextResponse.json({ error: "Invalid endDate format. Use YYYY-MM-DD." }, { status: 400 });
  }
```

### Step 8: Re-register Telegram webhook (post-deploy)

After deploying and setting the `TELEGRAM_WEBHOOK_SECRET` env var:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR_DOMAIN>/api/telegram/webhook",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET>"
  }'
```

---

## Verification Checklist

### Telegram Webhook Auth
- [ ] **Missing env var:** Remove `TELEGRAM_WEBHOOK_SECRET`. POST to webhook. Expect HTTP 500.
- [ ] **No header:** Set env var. POST without `x-telegram-bot-api-secret-token` header. Expect HTTP 401.
- [ ] **Wrong header:** POST with wrong secret. Expect HTTP 401.
- [ ] **Correct header:** POST with correct secret + valid body. Expect HTTP 200.
- [ ] `/start`, `/pause`, `/resume`, `/summary` all still work with correct header.

### Limit/Offset Clamping
- [ ] `GET /api/transactions?limit=0` -- uses limit=1 (clamped)
- [ ] `GET /api/transactions?limit=999999` -- returns at most 200 rows
- [ ] `GET /api/transactions?limit=-5` -- uses limit=1
- [ ] `GET /api/transactions?limit=abc` -- uses limit=100 (default)
- [ ] `GET /api/transactions?offset=-1` -- uses offset=0
- [ ] `GET /api/analytics/spending-by-merchant?limit=999` -- returns at most 100

### Date Validation (all 4 routes)
- [ ] `?startDate=2024-01-15` -- accepted
- [ ] `?startDate=not-a-date` -- HTTP 400
- [ ] `?endDate=2024-13-01` -- HTTP 400 (month 13 invalid)
- [ ] `?endDate=2024-1-1` -- HTTP 400 (must be zero-padded)
- [ ] No date params -- accepted (optional)

---

## What NOT To Do

1. **Do NOT use `zod` or add npm dependencies.** The 3 validation functions are under 10 lines each.

2. **Do NOT move auth to Next.js middleware.** The middleware runs on Edge runtime which may lack `crypto.timingSafeEqual`. Keep auth co-located with the route handler.

3. **Do NOT use `===` for webhook secret comparison.** Always use `timingSafeCompare`. The existing cron routes use `===` -- that is separate tech debt, not a pattern to follow.

4. **Do NOT return 403 for webhook auth failure.** Return 401. A 403 leaks information that the endpoint exists.

5. **Do NOT validate calendar correctness of dates.** The `YYYY-MM-DD` regex is sufficient. Invalid dates like Feb 30 will return zero rows.

6. **Do NOT deploy without setting the env var first.** The code returns 500 if the secret is missing (fail closed).

7. **Do NOT log the secret token value.** The `console.error` says "not configured" -- never log the actual value.

8. **Do NOT "fix" the cron route `===` comparisons in this PR.** That is separate tech debt.

9. **Do NOT change the error response shape.** Use `{ error: "message" }` consistently.
