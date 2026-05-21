import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────
const insertValues = vi.fn();
const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere, returning: vi.fn() }));
const deleteWhere = vi.fn();
const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    delete: vi.fn(() => ({ where: deleteWhere })),
    select: vi.fn(() => ({ from: selectFrom })),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/scd2", () => ({
  updateUserProfile: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmailChangeConfirmation: vi.fn().mockResolvedValue(undefined),
  sendEmailChangeNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  recordFailure: vi.fn().mockResolvedValue({ remaining: 4 }),
}));

import { auth } from "@/lib/auth";
import { updateUserProfile } from "@/lib/scd2";
import {
  sendEmailChangeConfirmation,
  sendEmailChangeNotification,
} from "@/lib/email";
import { audit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { PUT } from "@/app/api/profile/route";
import { GET as CONFIRM } from "@/app/api/profile/confirm-email/route";
import { GET as REVOKE } from "@/app/api/profile/revoke-email-change/route";

const mockedAuth = vi.mocked(auth);
const mockedUpdateProfile = vi.mocked(updateUserProfile);
const mockedSendConfirm = vi.mocked(sendEmailChangeConfirmation);
const mockedSendNotify = vi.mocked(sendEmailChangeNotification);
const mockedAudit = vi.mocked(audit);
const mockedCheckRateLimit = vi.mocked(checkRateLimit);
const mockedDbInsert = vi.mocked(db.insert);
const mockedDbUpdate = vi.mocked(db.update);
const mockedDbDelete = vi.mocked(db.delete);

function loggedIn(email = "old@example.com") {
  mockedAuth.mockResolvedValue({
    user: { id: "user-1", email, name: "Test" },
    expires: "9999-12-31",
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  insertValues.mockResolvedValue(undefined);
  updateWhere.mockResolvedValue(undefined);
  updateSet.mockReturnValue({ where: updateWhere, returning: vi.fn().mockResolvedValue([{ id: "ec-1" }]) });
  deleteWhere.mockResolvedValue(undefined);
  selectLimit.mockResolvedValue([]);
  selectFrom.mockReturnValue({ where: selectWhere });
  selectWhere.mockReturnValue({ limit: selectLimit });
  mockedDbInsert.mockReturnValue({ values: insertValues } as never);
  mockedDbUpdate.mockReturnValue({ set: updateSet } as never);
  mockedDbDelete.mockReturnValue({ where: deleteWhere } as never);
  mockedCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 5 });
});

function putReq(body: Record<string, unknown>) {
  return new NextRequest("https://app.example.com/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/profile — email change request flow", () => {
  it("requires auth", async () => {
    mockedAuth.mockResolvedValue(null as never);
    const res = await PUT(putReq({ email: "new@example.com" }));
    expect(res.status).toBe(401);
  });

  it("creates pending email-change row + sends both emails + audits + does NOT call updateUserProfile", async () => {
    loggedIn();
    const res = await PUT(putReq({ email: "new@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pendingEmailChange).toBe(true);

    expect(mockedDbInsert).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        newEmail: "new@example.com",
        token: expect.any(String),
        revokeToken: expect.any(String),
        expires: expect.any(Date),
      }),
    );

    expect(mockedSendConfirm).toHaveBeenCalledWith(
      "new@example.com",
      expect.stringContaining("/api/profile/confirm-email?token="),
    );
    expect(mockedSendNotify).toHaveBeenCalledWith(
      "old@example.com",
      "new@example.com",
      expect.stringContaining("/api/profile/revoke-email-change?token="),
    );

    expect(mockedAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "profile.email_change_requested" }),
    );

    // The user record itself must NOT be touched for an email change.
    expect(mockedUpdateProfile).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: expect.any(String) }),
    );
  });

  it("name-only update goes directly through updateUserProfile (no pending row)", async () => {
    loggedIn();
    mockedUpdateProfile.mockResolvedValueOnce({
      userId: "user-1",
      email: "old@example.com",
      name: "New Name",
    } as never);
    const res = await PUT(putReq({ name: "New Name" }));
    expect(res.status).toBe(200);
    expect(mockedDbInsert).not.toHaveBeenCalled();
    expect(mockedSendConfirm).not.toHaveBeenCalled();
    expect(mockedUpdateProfile).toHaveBeenCalledWith("user-1", { name: "New Name" });
  });

  it("same-email is not treated as a change", async () => {
    loggedIn("same@example.com");
    mockedUpdateProfile.mockResolvedValueOnce({
      userId: "user-1",
      email: "same@example.com",
      name: "Test",
    } as never);
    const res = await PUT(putReq({ email: "same@example.com", name: "Test" }));
    expect(res.status).toBe(200);
    expect(mockedDbInsert).not.toHaveBeenCalled();
    expect(mockedSendConfirm).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited and does NOT send mail or insert a token", async () => {
    loggedIn();
    mockedCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 60_000,
    });
    const res = await PUT(putReq({ email: "new@example.com" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(mockedDbInsert).not.toHaveBeenCalled();
    expect(mockedSendConfirm).not.toHaveBeenCalled();
  });

  it("rejects invalid email format", async () => {
    loggedIn();
    const res = await PUT(putReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/profile/confirm-email", () => {
  function confirmReq(token: string | null) {
    const url = token
      ? `https://app.example.com/api/profile/confirm-email?token=${token}`
      : "https://app.example.com/api/profile/confirm-email";
    return new NextRequest(url);
  }

  it("400 when no token", async () => {
    const res = await CONFIRM(confirmReq(null));
    expect(res.status).toBe(400);
  });

  it("400 when token not found", async () => {
    selectLimit.mockResolvedValueOnce([]);
    const res = await CONFIRM(confirmReq("nope"));
    expect(res.status).toBe(400);
  });

  it("400 when token already used", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() + 60_000),
        usedAt: new Date(),
        cancelledAt: null,
      },
    ]);
    const res = await CONFIRM(confirmReq("t"));
    expect(res.status).toBe(400);
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("400 when token cancelled", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() + 60_000),
        usedAt: null,
        cancelledAt: new Date(),
      },
    ]);
    const res = await CONFIRM(confirmReq("t"));
    expect(res.status).toBe(400);
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("400 when token expired", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() - 60_000),
        usedAt: null,
        cancelledAt: null,
      },
    ]);
    const res = await CONFIRM(confirmReq("t"));
    expect(res.status).toBe(400);
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
  });

  it("on success: marks used, updates profile with emailVerified=now, deletes all sessions, audits", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() + 60_000),
        usedAt: null,
        cancelledAt: null,
      },
    ]);
    updateSet.mockReturnValueOnce({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "ec-1" }]) })),
    });
    mockedUpdateProfile.mockResolvedValueOnce({} as never);

    const res = await CONFIRM(confirmReq("t"));
    expect(res.status).toBe(200);

    expect(mockedUpdateProfile).toHaveBeenCalledWith("user-1", {
      email: "new@example.com",
      emailVerified: expect.any(Date),
    });
    expect(mockedDbDelete).toHaveBeenCalledTimes(1);
    expect(mockedAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "profile.email_change_completed" }),
    );
  });

  it("400 if concurrent request already consumed the token (atomic mark-used fails)", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() + 60_000),
        usedAt: null,
        cancelledAt: null,
      },
    ]);
    updateSet.mockReturnValueOnce({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
    });

    const res = await CONFIRM(confirmReq("t"));
    expect(res.status).toBe(400);
    expect(mockedUpdateProfile).not.toHaveBeenCalled();
    expect(mockedDbDelete).not.toHaveBeenCalled();
  });
});

describe("GET /api/profile/revoke-email-change", () => {
  function revokeReq(token: string | null) {
    const url = token
      ? `https://app.example.com/api/profile/revoke-email-change?token=${token}`
      : "https://app.example.com/api/profile/revoke-email-change";
    return new NextRequest(url);
  }

  it("400 when no token", async () => {
    const res = await REVOKE(revokeReq(null));
    expect(res.status).toBe(400);
  });

  it("400 when already confirmed", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() + 60_000),
        usedAt: new Date(),
        cancelledAt: null,
      },
    ]);
    const res = await REVOKE(revokeReq("r"));
    expect(res.status).toBe(400);
  });

  it("marks cancelledAt + audits on valid revoke", async () => {
    selectLimit.mockResolvedValueOnce([
      {
        id: "ec-1",
        userId: "user-1",
        newEmail: "new@example.com",
        token: "t",
        revokeToken: "r",
        expires: new Date(Date.now() + 60_000),
        usedAt: null,
        cancelledAt: null,
      },
    ]);
    updateSet.mockReturnValueOnce({
      where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "ec-1" }]) })),
    });

    const res = await REVOKE(revokeReq("r"));
    expect(res.status).toBe(200);
    expect(mockedAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "profile.email_change_cancelled" }),
    );
  });
});
