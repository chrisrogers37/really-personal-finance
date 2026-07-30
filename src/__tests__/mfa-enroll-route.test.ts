import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @/db so the api-helpers → rbac → @/db import chain does not trigger
// neon() at module load (no DATABASE_URL in the test env). The enroll route
// never calls the db directly.
vi.mock("@/db", () => ({ db: {} }));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/mfa", () => ({
  enrollMfa: vi.fn(),
  hasMfaEnabled: vi.fn(),
  verifyMfaCode: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  recordFailure: vi.fn(),
  resetAttempts: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from "@/lib/auth";
import { enrollMfa, hasMfaEnabled, verifyMfaCode } from "@/lib/mfa";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";
import { POST } from "@/app/api/mfa/enroll/route";

const mockedAuth = vi.mocked(auth);
const mockedEnroll = vi.mocked(enrollMfa);
const mockedHasMfa = vi.mocked(hasMfaEnabled);
const mockedVerify = vi.mocked(verifyMfaCode);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedRecordFailure = vi.mocked(recordFailure);
const mockedResetAttempts = vi.mocked(resetAttempts);

function req(body: Record<string, unknown> = {}) {
  return new Request("https://example.com/api/mfa/enroll", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.c" }, expires: "9999-12-31" } as never);
  mockedEnroll.mockResolvedValue({ uri: "otpauth://x", secret: "S", recoveryCodes: ["r1"] });
  mockedCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
  mockedRecordFailure.mockResolvedValue({ remaining: 4 });
});

describe("POST /api/mfa/enroll — step-up on re-enrollment (#125)", () => {
  it("allows first-time enrollment (no verified credential)", async () => {
    mockedHasMfa.mockResolvedValueOnce(false);
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mockedEnroll).toHaveBeenCalledTimes(1);
  });

  it("rejects re-enrollment with no current code and does NOT overwrite the secret", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mockedEnroll).not.toHaveBeenCalled();
  });

  it("rejects re-enrollment with an invalid current code", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(false);
    const res = await POST(req({ currentCode: "000000" }));
    expect(res.status).toBe(403);
    expect(mockedEnroll).not.toHaveBeenCalled();
  });

  it("allows re-enrollment after a valid current code", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(true);
    const res = await POST(req({ currentCode: "123456" }));
    expect(res.status).toBe(200);
    expect(mockedEnroll).toHaveBeenCalledTimes(1);
  });

  // Finding A: the step-up code check must be rate-limited (shared mfa:${userId}
  // bucket) so a first-factor-only session can't brute-force it.
  it("rate-limits re-enrollment attempts (429, no verify or enroll)", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterMs: 60_000 });
    const res = await POST(req({ currentCode: "123456" }));
    expect(res.status).toBe(429);
    expect(mockedVerify).not.toHaveBeenCalled();
    expect(mockedEnroll).not.toHaveBeenCalled();
  });

  it("records a rate-limit failure on an invalid step-up code", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(false);
    await POST(req({ currentCode: "000000" }));
    expect(mockedRecordFailure).toHaveBeenCalledWith("mfa:u1");
  });

  it("resets rate-limit attempts after a valid step-up", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(true);
    await POST(req({ currentCode: "123456" }));
    expect(mockedResetAttempts).toHaveBeenCalledWith("mfa:u1");
  });
});
