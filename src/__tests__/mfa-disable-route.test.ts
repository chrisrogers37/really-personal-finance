import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/db", () => ({ db: {} }));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mfa", () => ({
  disableMfa: vi.fn(),
  verifyMfaCode: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  recordFailure: vi.fn(),
  resetAttempts: vi.fn().mockResolvedValue(undefined),
}));

import { auth } from "@/lib/auth";
import { disableMfa, verifyMfaCode } from "@/lib/mfa";
import { checkRateLimit, recordFailure, resetAttempts } from "@/lib/rate-limit";
import { POST } from "@/app/api/mfa/disable/route";

const mockedAuth = vi.mocked(auth);
const mockedDisable = vi.mocked(disableMfa);
const mockedVerify = vi.mocked(verifyMfaCode);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedRecordFailure = vi.mocked(recordFailure);
const mockedResetAttempts = vi.mocked(resetAttempts);

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/mfa/disable", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({
    user: { id: "u1", email: "a@b.c" },
    expires: "9999-12-31",
  } as never);
  mockedCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
});

describe("POST /api/mfa/disable — rate limits MFA code attempts", () => {
  it("returns 429 and does NOT verify or disable when rate limited", async () => {
    mockedCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 60_000,
    });

    const res = await POST(makeRequest({ code: "123456" }));

    expect(res.status).toBe(429);
    expect(mockedVerify).not.toHaveBeenCalled();
    expect(mockedDisable).not.toHaveBeenCalled();
  });

  it("returns 400 and records a failure on an invalid code", async () => {
    mockedVerify.mockResolvedValueOnce(false);
    mockedRecordFailure.mockResolvedValueOnce({ remaining: 4 });

    const res = await POST(makeRequest({ code: "wrongcode" }));

    expect(res.status).toBe(400);
    expect(mockedRecordFailure).toHaveBeenCalledTimes(1);
    expect(mockedDisable).not.toHaveBeenCalled();
  });

  it("disables MFA and resets attempts on a valid code", async () => {
    mockedVerify.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({ code: "123456" }));

    expect(res.status).toBe(200);
    expect(mockedDisable).toHaveBeenCalledWith("u1");
    expect(mockedResetAttempts).toHaveBeenCalledTimes(1);
  });
});
