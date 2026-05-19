import { describe, it, expect, vi, beforeEach } from "vitest";

const selectResult = vi.fn();
const insertResult = vi.fn();
const deleteResult = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => selectResult(),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => insertResult(),
        }),
      }),
    }),
    delete: () => ({
      where: () => deleteResult(),
    }),
  },
}));

import {
  checkRateLimit,
  recordFailure,
  resetAttempts,
  MAX_ATTEMPTS,
  LOCKOUT_MS,
} from "@/lib/rate-limit";

beforeEach(() => {
  selectResult.mockReset();
  insertResult.mockReset();
  deleteResult.mockReset();
  deleteResult.mockResolvedValue(undefined);
});

describe("checkRateLimit", () => {
  it("allows with full quota when no row exists", async () => {
    selectResult.mockResolvedValueOnce([]);

    const result = await checkRateLimit("k");

    expect(result).toEqual({ allowed: true, remaining: MAX_ATTEMPTS });
  });

  it("returns remaining = MAX - count when row exists without lockout", async () => {
    selectResult.mockResolvedValueOnce([
      { key: "k", count: 3, lockedUntil: null, lastAttempt: new Date() },
    ]);

    const result = await checkRateLimit("k");

    expect(result).toEqual({ allowed: true, remaining: MAX_ATTEMPTS - 3 });
  });

  it("blocks with retryAfterMs when lockout is in the future", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    selectResult.mockResolvedValueOnce([
      { key: "k", count: MAX_ATTEMPTS, lockedUntil, lastAttempt: new Date() },
    ]);

    const result = await checkRateLimit("k");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(LOCKOUT_MS);
  });

  it("clears the row and re-allows once lockout has passed", async () => {
    const lockedUntil = new Date(Date.now() - 1000);
    selectResult.mockResolvedValueOnce([
      { key: "k", count: MAX_ATTEMPTS, lockedUntil, lastAttempt: new Date() },
    ]);

    const result = await checkRateLimit("k");

    expect(result).toEqual({ allowed: true, remaining: MAX_ATTEMPTS });
    expect(deleteResult).toHaveBeenCalledTimes(1);
  });
});

describe("recordFailure", () => {
  it("returns remaining = MAX - returned count", async () => {
    insertResult.mockResolvedValueOnce([{ count: 2 }]);

    const result = await recordFailure("k");

    expect(result).toEqual({ remaining: MAX_ATTEMPTS - 2 });
  });

  it("clamps remaining at 0 when count >= MAX", async () => {
    insertResult.mockResolvedValueOnce([{ count: MAX_ATTEMPTS }]);

    const result = await recordFailure("k");

    expect(result).toEqual({ remaining: 0 });
  });

  it("uses a single upsert call (no SELECT-then-UPDATE TOCTOU window)", async () => {
    insertResult.mockResolvedValueOnce([{ count: 1 }]);

    await recordFailure("k");

    expect(insertResult).toHaveBeenCalledTimes(1);
    expect(selectResult).not.toHaveBeenCalled();
  });
});

describe("resetAttempts", () => {
  it("issues a delete for the key", async () => {
    await resetAttempts("k");

    expect(deleteResult).toHaveBeenCalledTimes(1);
  });
});
