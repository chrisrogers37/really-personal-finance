import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
const updateFrom = vi.fn(() => ({ set: updateSet }));

vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({ set: updateSet })),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/mfa", () => ({
  confirmMfaEnrollment: vi.fn(),
  verifyMfaCode: vi.fn(),
  hasMfaEnabled: vi.fn(),
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
import { confirmMfaEnrollment, verifyMfaCode, hasMfaEnabled } from "@/lib/mfa";
import { checkRateLimit, recordFailure } from "@/lib/rate-limit";
import { db } from "@/db";
import { POST } from "@/app/api/mfa/verify/route";

const mockedAuth = vi.mocked(auth);
const mockedConfirm = vi.mocked(confirmMfaEnrollment);
const mockedVerify = vi.mocked(verifyMfaCode);
const mockedHasMfa = vi.mocked(hasMfaEnabled);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedRecordFailure = vi.mocked(recordFailure);
const mockedDbUpdate = vi.mocked(db.update);

function makeRequest(body: Record<string, unknown>, sessionCookie?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sessionCookie) {
    headers["cookie"] = `authjs.session-token=${sessionCookie}`;
  }
  return new NextRequest("https://example.com/api/mfa/verify", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  updateSet.mockReturnValue({ where: updateWhere });
  updateWhere.mockResolvedValue(undefined);
  updateFrom.mockReturnValue({ set: updateSet });
  mockedDbUpdate.mockReturnValue({ set: updateSet } as never);
  mockedAuth.mockResolvedValue({
    user: { id: "u1", email: "a@b.c" },
    expires: "9999-12-31",
  } as never);
  mockedCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
});

describe("POST /api/mfa/verify — marks session mfa_verified_at", () => {
  it("UPDATEs sessions on successful login-phase verify", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({ code: "123456" }, "tok-login"));

    expect(res.status).toBe(200);
    expect(mockedDbUpdate).toHaveBeenCalledTimes(1);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ mfaVerifiedAt: expect.any(Date) }),
    );
  });

  it("UPDATEs sessions on successful enrollment-phase verify", async () => {
    mockedHasMfa.mockResolvedValueOnce(false);
    mockedConfirm.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({ code: "123456" }, "tok-enroll"));

    expect(res.status).toBe(200);
    expect(mockedDbUpdate).toHaveBeenCalledTimes(1);
  });

  it("does NOT UPDATE sessions when verify fails", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(false);
    mockedRecordFailure.mockResolvedValueOnce({ remaining: 4 });

    const res = await POST(makeRequest({ code: "wrongcode" }, "tok-bad"));

    expect(res.status).toBe(400);
    expect(mockedDbUpdate).not.toHaveBeenCalled();
  });

  it("does NOT UPDATE sessions when rate limited (no verify attempted)", async () => {
    mockedCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 60_000,
    });

    const res = await POST(makeRequest({ code: "123456" }, "tok-blocked"));

    expect(res.status).toBe(429);
    expect(mockedDbUpdate).not.toHaveBeenCalled();
    expect(mockedVerify).not.toHaveBeenCalled();
    expect(mockedConfirm).not.toHaveBeenCalled();
  });

  it("succeeds without UPDATE when no session cookie is present", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({ code: "123456" }));

    expect(res.status).toBe(200);
    expect(mockedDbUpdate).not.toHaveBeenCalled();
  });

  it("reads the __Secure- cookie variant when present", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(true);

    const req = new NextRequest("https://example.com/api/mfa/verify", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: "__Secure-authjs.session-token=secure-tok",
      },
      body: JSON.stringify({ code: "123456" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockedDbUpdate).toHaveBeenCalledTimes(1);
  });
});
