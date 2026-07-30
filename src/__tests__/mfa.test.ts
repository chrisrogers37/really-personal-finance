import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as OTPAuth from "otpauth";

// ─── Mocked infrastructure ───────────────────────────────────────────────────
// Chained Drizzle builders, mirroring src/__tests__/mfa-verify-route.test.ts:
//   select().from().where().limit()
//   update().set().where()
//   insert().values().onConflictDoUpdate()
const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));

const updateWhere = vi.fn().mockResolvedValue(undefined);
const updateSet = vi.fn(() => ({ where: updateWhere }));

const insertOnConflict = vi.fn(
  (_arg: { set: Record<string, unknown> }): Promise<void> => Promise.resolve(),
);
const insertValues = vi.fn((_values: Record<string, unknown>) => ({
  onConflictDoUpdate: insertOnConflict,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({ from: selectFrom })),
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
  },
}));

// Deterministic, reversible stand-ins so we can assert on stored material.
vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((s: string) => `enc(${s})`),
  decrypt: vi.fn((s: string) => s.replace(/^enc\(/, "").replace(/\)$/, "")),
}));

// Deterministic bcrypt: hash(code) === `hash:${code}`; compare is exact match.
// Lets us assert (a) hashes are stored instead of plaintext and (b) the verify
// loop runs one compare per stored hash regardless of match position.
vi.mock("bcryptjs", () => {
  const hash = vi.fn(async (code: string) => `hash:${code}`);
  const compare = vi.fn(async (code: string, stored: string) => stored === `hash:${code}`);
  return { default: { hash, compare }, hash, compare };
});

import bcrypt from "bcryptjs";
import { enrollMfa, verifyMfaCode, confirmMfaEnrollment } from "@/lib/mfa";

// A valid base32 secret; verifyMfaCode decrypts totpSecret then Secret.fromBase32.
const SECRET_B32 = "JBSWY3DPEHPK3PXP";

// Generate a real TOTP for SECRET_B32 at a specific wall-clock time (ms).
function totpToken(atMs: number): string {
  const totp = new OTPAuth.TOTP({
    issuer: "ReallyPersonalFinance",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(SECRET_B32),
  });
  return totp.generate({ timestamp: atMs });
}

function credRow(overrides: Record<string, unknown> = {}) {
  return {
    userId: "u1",
    totpSecret: `enc(${SECRET_B32})`,
    recoveryCodes: null,
    recoveryCodeHashes: null,
    lastTotpStep: null,
    verified: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enrollMfa — stores bcrypt hashes, not plaintext recovery codes (#78)", () => {
  it("hashes every recovery code and writes no plaintext blob", async () => {
    const result = await enrollMfa("u1", "a@b.c");

    expect(result.recoveryCodes).toHaveLength(8);
    // One hash per code, computed via bcrypt.
    expect(bcrypt.hash).toHaveBeenCalledTimes(8);

    const values = insertValues.mock.calls[0][0];
    expect(values.recoveryCodeHashes).toEqual(
      result.recoveryCodes.map((c) => `hash:${c}`),
    );
    // The reversible plaintext column is no longer written.
    expect(values.recoveryCodes).toBeNull();
    // No plaintext recovery code is present in the stored hashes.
    for (const code of result.recoveryCodes) {
      expect(values.recoveryCodeHashes).not.toContain(code);
    }
  });

  it("clears legacy blob and last-used step on re-enrollment", async () => {
    await enrollMfa("u1", "a@b.c");
    const conflictSet = insertOnConflict.mock.calls[0][0];
    expect(conflictSet.set.recoveryCodes).toBeNull();
    expect(conflictSet.set.lastTotpStep).toBeNull();
    expect(conflictSet.set.verified).toBe(false);
  });
});

describe("verifyMfaCode — recovery codes via bcrypt (#78)", () => {
  it("accepts a valid recovery code once and persists the remaining hashes", async () => {
    selectLimit.mockResolvedValue([
      credRow({ recoveryCodeHashes: ["hash:aaa", "hash:bbb", "hash:ccc"] }),
    ]);

    const ok = await verifyMfaCode("u1", "bbb");

    expect(ok).toBe(true);
    // The consumed hash is spliced out; the rest are persisted.
    expect(updateSet).toHaveBeenCalledWith({
      recoveryCodeHashes: ["hash:aaa", "hash:ccc"],
    });
  });

  it("rejects a recovery code not present in the stored hashes (reuse/invalid)", async () => {
    selectLimit.mockResolvedValue([
      credRow({ recoveryCodeHashes: ["hash:aaa", "hash:ccc"] }),
    ]);

    const ok = await verifyMfaCode("u1", "bbb");

    expect(ok).toBe(false);
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("compares against every stored hash regardless of match position (constant loop)", async () => {
    selectLimit.mockResolvedValue([
      credRow({ recoveryCodeHashes: ["hash:a", "hash:b", "hash:c", "hash:d"] }),
    ]);

    // "a" matches the FIRST hash — a naive early-return would compare once.
    await verifyMfaCode("u1", "a");

    expect(bcrypt.compare).toHaveBeenCalledTimes(4);
  });

  it("falls back to the legacy encrypted blob when no hashes exist (un-backfilled row)", async () => {
    const legacyBlob = `enc(${JSON.stringify(["leg1", "leg2"])})`;
    selectLimit.mockResolvedValue([
      credRow({ recoveryCodeHashes: null, recoveryCodes: legacyBlob }),
    ]);

    const ok = await verifyMfaCode("u1", "leg1");

    expect(ok).toBe(true);
    // Legacy path uses the encrypted blob, not bcrypt.
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(updateSet).toHaveBeenCalledWith({
      recoveryCodes: `enc(${JSON.stringify(["leg2"])})`,
    });
  });

  it("treats an empty hash array as un-backfilled and falls back to legacy", async () => {
    const legacyBlob = `enc(${JSON.stringify(["only"])})`;
    selectLimit.mockResolvedValue([
      credRow({ recoveryCodeHashes: [], recoveryCodes: legacyBlob }),
    ]);

    const ok = await verifyMfaCode("u1", "only");

    expect(ok).toBe(true);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});

describe("single-use TOTP replay guard (#130)", () => {
  const FIXED = Date.UTC(2026, 6, 30, 12, 0, 0); // 2026-07-30T12:00:00Z
  const STEP = Math.floor(FIXED / 1000 / 30);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifyMfaCode accepts a fresh TOTP and persists the consumed step", async () => {
    selectLimit.mockResolvedValue([credRow({ lastTotpStep: null })]);

    const ok = await verifyMfaCode("u1", totpToken(FIXED));

    expect(ok).toBe(true);
    expect(updateSet).toHaveBeenCalledWith({ lastTotpStep: STEP });
  });

  it("verifyMfaCode rejects the same TOTP replayed within the window", async () => {
    selectLimit.mockResolvedValue([credRow({ lastTotpStep: STEP })]);

    const ok = await verifyMfaCode("u1", totpToken(FIXED));

    expect(ok).toBe(false);
    expect(updateSet).not.toHaveBeenCalled();
  });

  it("verifyMfaCode rejects a code from an already-consumed earlier step", async () => {
    // lastTotpStep is ahead of this code's step → replay.
    selectLimit.mockResolvedValue([credRow({ lastTotpStep: STEP + 5 })]);

    const ok = await verifyMfaCode("u1", totpToken(FIXED));

    expect(ok).toBe(false);
  });

  it("confirmMfaEnrollment persists the consumed step on first verification", async () => {
    selectLimit.mockResolvedValue([
      credRow({ verified: false, lastTotpStep: null }),
    ]);

    const ok = await confirmMfaEnrollment("u1", totpToken(FIXED));

    expect(ok).toBe(true);
    expect(updateSet).toHaveBeenCalledWith({ verified: true, lastTotpStep: STEP });
  });
});
