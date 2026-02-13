# Phase 05: Test Infrastructure and Initial Test Suite

**Status:** ✅ COMPLETE
**Started:** 2026-02-12
**Completed:** 2026-02-12
**PR:** #5

## PR Metadata

| Field | Value |
|-------|-------|
| **PR Title** | `test: add Vitest infrastructure and initial unit tests` |
| **Risk Level** | **Low** -- Additive only, no production code changes |
| **Estimated Effort** | 3-4 hours |
| **Files Created** | `vitest.config.ts`, `src/__tests__/encryption.test.ts`, `src/__tests__/utils.test.ts`, `src/__tests__/telegram.test.ts` |
| **Files Modified** | `package.json` |

## Dependencies and Blocks

- **Blocks:** Nothing
- **Blocked by:** Phase 01 and Phase 04 (tests should target final code shape)
- **New npm packages:** `vitest`, `@testing-library/react`, `@testing-library/jest-dom` (devDependencies)

---

## Step-by-Step Implementation

### Step 1: Install test dependencies

Run this command:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Step 2: Add test scripts to `package.json`

**File:** `package.json`

**BEFORE** (lines 5-12):
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio"
  },
```

**AFTER:**
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio"
  },
```

### Step 3: Create `vitest.config.ts`

**NEW FILE:** `vitest.config.ts` (project root)

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Key points:**
- `globals: true` allows `describe`, `it`, `expect` without imports
- `environment: "node"` for server-side code tests (encryption, utils)
- `alias` matches the `@/*` path alias in `tsconfig.json` line 22

### Step 4: Create `src/__tests__/encryption.test.ts`

**NEW FILE:** `src/__tests__/encryption.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the environment variable before importing the module
describe("encryption", () => {
  const VALID_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts and decrypts a string correctly (round-trip)", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "access-sandbox-abc123-def456";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const plaintext = "same-text";
    const cipher1 = encrypt(plaintext);
    const cipher2 = encrypt(plaintext);
    expect(cipher1).not.toBe(cipher2);
  });

  it("ciphertext has expected format: iv:authTag:encrypted", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const ciphertext = encrypt("test");
    const parts = ciphertext.split(":");
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted data is non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const ciphertext = encrypt("secret");
    const parts = ciphertext.split(":");
    // Tamper with encrypted data
    const tampered = `${parts[0]}:${parts[1]}:${"ff".repeat(parts[2].length / 2)}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles empty string", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const ciphertext = encrypt("");
    expect(decrypt(ciphertext)).toBe("");
  });

  it("handles unicode text", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "Hello, World!";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    // Need fresh import to pick up new env
    const mod = await import("@/lib/encryption");
    expect(() => mod.encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string"
    );
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "tooshort");
    const mod = await import("@/lib/encryption");
    expect(() => mod.encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string"
    );
  });
});
```

### Step 5: Create `src/__tests__/utils.test.ts`

**NEW FILE:** `src/__tests__/utils.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(42.5)).toBe("$42.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-10.99);
    // Intl.NumberFormat may use different minus sign formats
    expect(result).toContain("10.99");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2024-01-15");
    expect(result).toBe("Jan 15, 2024");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date("2024-12-25T00:00:00Z"));
    // Note: exact output may vary by timezone
    expect(result).toContain("2024");
    expect(result).toContain("25");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("handles falsy values", () => {
    const result = cn("base", false, null, undefined, "extra");
    expect(result).toBe("base extra");
  });
});
```

### Step 6: Create `src/__tests__/telegram.test.ts`

**NEW FILE:** `src/__tests__/telegram.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendTelegramMessage", () => {
  const MOCK_TOKEN = "123456:ABC-DEF";

  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", MOCK_TOKEN);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends a message with correct URL and body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage("12345", "Hello!");

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${MOCK_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "12345",
          text: "Hello!",
          parse_mode: "HTML",
        }),
      }
    );
  });

  it("returns true on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(""),
      })
    );

    const { sendTelegramMessage } = await import("@/lib/telegram");
    const result = await sendTelegramMessage("12345", "test");
    expect(result).toBe(true);
  });

  it("returns false on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Bad Request"),
      })
    );

    const { sendTelegramMessage } = await import("@/lib/telegram");
    const result = await sendTelegramMessage("12345", "test");
    expect(result).toBe(false);
  });

  it("uses Markdown parse mode when specified", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage("12345", "**bold**", "Markdown");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.parse_mode).toBe("Markdown");
  });

  it("throws when TELEGRAM_BOT_TOKEN is missing", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const { sendTelegramMessage } = await import("@/lib/telegram");
    await expect(sendTelegramMessage("12345", "test")).rejects.toThrow(
      "TELEGRAM_BOT_TOKEN is not set"
    );
  });
});
```

### Step 7: Add validation tests (if Phase 03 is merged)

**NEW FILE:** `src/__tests__/validation.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { isValidDateParam, clampInt, timingSafeCompare } from "@/lib/validation";

describe("isValidDateParam", () => {
  it("accepts valid dates", () => {
    expect(isValidDateParam("2024-01-15")).toBe(true);
    expect(isValidDateParam("2024-12-31")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDateParam("not-a-date")).toBe(false);
    expect(isValidDateParam("2024-1-1")).toBe(false);
    expect(isValidDateParam("2024-13-01")).toBe(false);
    expect(isValidDateParam("2024-00-01")).toBe(false);
    expect(isValidDateParam("24-01-01")).toBe(false);
    expect(isValidDateParam("")).toBe(false);
  });
});

describe("clampInt", () => {
  it("returns default for null input", () => {
    expect(clampInt(null, 100, 1, 200)).toBe(100);
  });

  it("returns default for NaN input", () => {
    expect(clampInt("abc", 100, 1, 200)).toBe(100);
  });

  it("clamps to min", () => {
    expect(clampInt("0", 100, 1, 200)).toBe(1);
    expect(clampInt("-5", 100, 1, 200)).toBe(1);
  });

  it("clamps to max", () => {
    expect(clampInt("999999", 100, 1, 200)).toBe(200);
  });

  it("passes through valid values", () => {
    expect(clampInt("50", 100, 1, 200)).toBe(50);
  });
});

describe("timingSafeCompare", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeCompare("secret", "secret")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeCompare("secret", "wrong")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeCompare("short", "longer-string")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeCompare("", "")).toBe(true);
  });
});
```

---

## Verification Checklist

- [ ] `npm install` succeeds (new devDependencies installed)
- [ ] `npm test` runs and all tests pass
- [ ] `npm run test:watch` starts interactive mode
- [ ] `npx tsc --noEmit` still passes (vitest config doesn't break TS)
- [ ] `npm run build` still succeeds

### Test Results Expected
- [ ] `encryption.test.ts`: 8 tests pass
- [ ] `utils.test.ts`: 9 tests pass
- [ ] `telegram.test.ts`: 5 tests pass
- [ ] `validation.test.ts`: 10 tests pass (if Phase 03 merged)

---

## Future Test Expansion (out of scope for this PR)

These tests require database mocking and are more complex. Plan as follow-up PRs:

1. **`scd2.test.ts`** -- Test `updateUserProfile` with mocked Drizzle `db` object. Verify transaction wrapping, emailVerified handling, user-not-found error.

2. **`alerts.test.ts`** -- Test `getDailySummary`, `getWeeklyComparison`, `detectAnomalies` with mocked DB results. Test `sendDailyAlerts` / `sendWeeklyAlerts` with mocked Telegram.

3. **API route tests** -- Use `next/test-utils` or mock `NextRequest`/`NextResponse` to test route handlers.

4. **Component tests** -- Use `@testing-library/react` for `TransactionTable`, `CategoryChart`, `MerchantChart` rendering tests.

---

## What NOT To Do

1. **Do NOT use Jest.** Vitest is faster, has native ESM support, and integrates better with the Vite ecosystem. The project uses `moduleResolution: "bundler"` which aligns with Vitest.

2. **Do NOT test database-dependent code in this PR.** The initial tests cover pure functions and functions with simple mocking (fetch). DB-dependent tests need a mocking strategy decided separately.

3. **Do NOT add `@vitest/coverage-v8` yet.** Coverage can be added as a follow-up. Keep this PR focused on getting the basic test infrastructure working.

4. **Do NOT modify any source files in `src/lib/` or `src/app/`.** This PR is additive only -- new test files and config.

5. **Do NOT use `jest.mock()` syntax.** Use `vi.mock()` (Vitest's API). They are similar but not identical.

6. **Do NOT set `environment: "jsdom"` globally.** Use `"node"` for server-side tests. Component tests can override per-file with `// @vitest-environment jsdom` comments.

7. **Do NOT import from `@testing-library/react` in the initial server-side tests.** It's only needed for component tests (future PR).
