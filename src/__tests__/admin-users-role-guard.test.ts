import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @/db so importing the real rbac module (via importOriginal) does not
// trigger neon() at module load — no DATABASE_URL exists in the test env.
vi.mock("@/db", () => ({ db: {} }));

const requireAdmin = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  requireAdmin: (...a: unknown[]) => requireAdmin(...a),
  withErrorHandling: (fn: unknown) => fn,
}));

// Keep the real hasMinRole / outRanks (pure); stub the DB-backed helpers.
vi.mock("@/lib/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rbac")>()),
  getUserRole: vi.fn(),
  setUserRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { getUserRole, setUserRole } from "@/lib/rbac";
import { PATCH } from "@/app/api/admin/users/route";

const mockedGetRole = vi.mocked(getUserRole);
const mockedSetRole = vi.mocked(setUserRole);

function req(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/admin/users", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ session: { user: { id: "caller-1" } }, role: "admin" });
  // Stable default; each test overrides the target's current role as needed.
  mockedGetRole.mockResolvedValue("member");
});

describe("PATCH /api/admin/users — strict rank guard (#127)", () => {
  it("rejects a non-owner admin demoting an owner", async () => {
    mockedGetRole.mockResolvedValue("owner");
    const res = await PATCH(req({ targetUserId: "owner-9", role: "member" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it("rejects an admin demoting a peer admin", async () => {
    mockedGetRole.mockResolvedValue("admin");
    const res = await PATCH(req({ targetUserId: "admin-9", role: "viewer" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it("rejects changing your own role", async () => {
    const res = await PATCH(req({ targetUserId: "caller-1", role: "member" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it("allows an owner to demote an admin to member", async () => {
    requireAdmin.mockResolvedValueOnce({ session: { user: { id: "owner-1" } }, role: "owner" });
    mockedGetRole.mockResolvedValue("admin");
    const res = await PATCH(req({ targetUserId: "admin-9", role: "member" }));
    expect(res.status).toBe(200);
    expect(mockedSetRole).toHaveBeenCalledWith("admin-9", "member");
  });

  it("rejects an owner demoting a peer owner (protects the last owner too)", async () => {
    requireAdmin.mockResolvedValueOnce({ session: { user: { id: "owner-1" } }, role: "owner" });
    mockedGetRole.mockResolvedValue("owner");
    const res = await PATCH(req({ targetUserId: "owner-2", role: "member" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });
});
