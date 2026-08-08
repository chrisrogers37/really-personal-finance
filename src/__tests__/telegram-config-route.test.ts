import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @/db: the route selects the caller's config. `insert` is mocked so the
// tests can assert it is never reached — a chat binding must not originate here.
vi.mock("@/db", () => {
  const limit = vi.fn().mockResolvedValue([
    { id: "cfg-1", chatId: "-1001111111111", enabled: true },
  ]);
  const selectWhere = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));

  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));

  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));

  return { db: { select, update, insert } };
});

const requireUser = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  requireUser: (...a: unknown[]) => requireUser(...a),
  withErrorHandling: (fn: unknown) => fn,
}));

import { db } from "@/db";
import { PUT } from "@/app/api/telegram/config/route";

function putReq(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/telegram/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUser.mockResolvedValue({
    userId: "user-1",
    session: { user: { id: "user-1" } },
  });
});

describe("PUT /api/telegram/config — chat binding requires the link-code flow (#132)", () => {
  it("rejects an unverified chatId", async () => {
    const res = await PUT(putReq({ chatId: "-1009999999999" }));
    expect(res.status).toBe(400);
  });

  it("does not write when an unverified chatId is supplied", async () => {
    // The status code alone is not enough: a route that returned 400 *after*
    // persisting would still leak alerts to the attacker-chosen chat.
    await PUT(putReq({ chatId: "-1009999999999" }));
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects a chatId even when paired with a valid enabled flag", async () => {
    // Guard against a fix that only inspects the body when chatId is the sole key.
    const res = await PUT(putReq({ chatId: "-1009999999999", enabled: true }));
    expect(res.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects an empty-string chatId without writing", async () => {
    // NOT evidence for the guard above: an empty chatId was already refused by
    // the length validation this replaced, so this case passes against the
    // vulnerable route too. It pins that behaviour survived the rewrite.
    const res = await PUT(putReq({ chatId: "" }));
    expect(res.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("still allows toggling enabled, which is what the settings page sends", async () => {
    const res = await PUT(putReq({ enabled: false }));
    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("still rejects a non-boolean enabled", async () => {
    const res = await PUT(putReq({ enabled: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 without a session", async () => {
    const { NextResponse } = await import("next/server");
    requireUser.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await PUT(putReq({ enabled: false }));
    expect(res.status).toBe(401);
    expect(db.update).not.toHaveBeenCalled();
  });
});
