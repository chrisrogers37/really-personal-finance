import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @/db: the deprovision branch calls db.update(users).set().where() directly.
vi.mock("@/db", () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { db: { update } };
});

const requireAdmin = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  requireAdmin: (...a: unknown[]) => requireAdmin(...a),
  withErrorHandling: (fn: unknown) => fn,
}));

// Keep the real pure helpers (hasMinRole/outRanks); stub the DB-backed ones.
vi.mock("@/lib/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rbac")>()),
  getUserRole: vi.fn(),
  setUserRole: vi.fn().mockResolvedValue(undefined),
  countCurrentOwners: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { getUserRole, countCurrentOwners } from "@/lib/rbac";
import { PATCH } from "@/app/api/admin/users/route";

const mockedGetRole = vi.mocked(getUserRole);
const mockedCountOwners = vi.mocked(countCurrentOwners);

function deprovisionReq(targetUserId: string) {
  return new NextRequest("https://example.com/api/admin/users", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetUserId, action: "deprovision" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Deprovision requires owner; caller is owner-1 by default.
  requireAdmin.mockResolvedValue({ session: { user: { id: "owner-1" } }, role: "owner" });
  mockedGetRole.mockResolvedValue("member");
  mockedCountOwners.mockResolvedValue(2);
});

describe("PATCH /api/admin/users deprovision — self & last-owner guards (#139)", () => {
  it("rejects deprovisioning yourself (self-lockout)", async () => {
    mockedGetRole.mockResolvedValue("owner");
    const res = await PATCH(deprovisionReq("owner-1")); // target === caller
    expect(res.status).toBe(403);
  });

  it("rejects deprovisioning the last remaining owner", async () => {
    mockedGetRole.mockResolvedValue("owner");
    mockedCountOwners.mockResolvedValue(1); // target is the only current owner
    const res = await PATCH(deprovisionReq("owner-2"));
    expect(res.status).toBe(403);
  });

  it("allows deprovisioning a peer owner when another owner remains", async () => {
    mockedGetRole.mockResolvedValue("owner");
    mockedCountOwners.mockResolvedValue(2);
    const res = await PATCH(deprovisionReq("owner-2"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deprovisioned: true });
  });

  it("allows deprovisioning a lower-ranked user (owner count not consulted)", async () => {
    mockedGetRole.mockResolvedValue("member");
    const res = await PATCH(deprovisionReq("member-9"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deprovisioned: true });
  });

  it("still rejects a non-owner caller (existing owner gate)", async () => {
    requireAdmin.mockResolvedValue({ session: { user: { id: "admin-1" } }, role: "admin" });
    const res = await PATCH(deprovisionReq("member-9"));
    expect(res.status).toBe(403);
  });
});
