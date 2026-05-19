import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  getUserRole: vi.fn(),
  hasMinRole: vi.fn((role: string, min: string) => {
    const hierarchy: Record<string, number> = {
      owner: 40,
      admin: 30,
      member: 20,
      viewer: 10,
    };
    return (hierarchy[role] ?? 0) >= (hierarchy[min] ?? 0);
  }),
}));

import { auth } from "@/lib/auth";
import { getUserRole } from "@/lib/rbac";
import {
  requireUser,
  requireAdmin,
  requireRole,
  withErrorHandling,
} from "@/lib/api-helpers";

const mockedAuth = vi.mocked(auth);
const mockedGetUserRole = vi.mocked(getUserRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireUser", () => {
  it("returns guard when session has a user id", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c" },
      expires: "9999-12-31",
    } as never);

    const result = await requireUser();
    if (result instanceof NextResponse) throw new Error("expected guard");
    expect(result.userId).toBe("u1");
    expect(result.session.user.id).toBe("u1");
  });

  it("returns 401 NextResponse when session is null", async () => {
    mockedAuth.mockResolvedValueOnce(null as never);

    const result = await requireUser();
    expect(result).toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
    const body = await result.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when session has no user id", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { email: "a@b.c" },
      expires: "9999-12-31",
    } as never);

    const result = await requireUser();
    expect(result).toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
  });
});

describe("requireRole / requireAdmin", () => {
  it("returns guard with role when user meets minimum", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c" },
      expires: "9999-12-31",
    } as never);
    mockedGetUserRole.mockResolvedValueOnce("admin");

    const result = await requireAdmin();
    if (result instanceof NextResponse) throw new Error("expected guard");
    expect(result.userId).toBe("u1");
    expect(result.role).toBe("admin");
  });

  it("returns 403 when user lacks role", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c" },
      expires: "9999-12-31",
    } as never);
    mockedGetUserRole.mockResolvedValueOnce("member");

    const result = await requireAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
    const body = await result.json();
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("returns 401 when unauthenticated (short-circuits role check)", async () => {
    mockedAuth.mockResolvedValueOnce(null as never);

    const result = await requireAdmin();
    expect(result).toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(401);
    expect(mockedGetUserRole).not.toHaveBeenCalled();
  });

  it("requireRole('owner') rejects an admin", async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: "u1", email: "a@b.c" },
      expires: "9999-12-31",
    } as never);
    mockedGetUserRole.mockResolvedValueOnce("admin");

    const result = await requireRole("owner");
    expect(result).toBeInstanceOf(NextResponse);
    if (!(result instanceof NextResponse)) return;
    expect(result.status).toBe(403);
  });
});

describe("withErrorHandling", () => {
  it("returns handler's response on success", async () => {
    const handler = async (_req: Request): Promise<Response> =>
      NextResponse.json({ ok: true }, { status: 200 });
    const wrapped = withErrorHandling(handler);
    const req = new Request("https://example.com/api/x");
    const res = await wrapped(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("converts thrown errors to 500 without leaking the stack", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = async (_req: Request): Promise<Response> => {
      throw new Error("secret stack trace");
    };
    const wrapped = withErrorHandling(handler);
    const req = new Request("https://example.com/api/x");
    const res = await wrapped(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("converts thrown non-Error values to 500", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = async (_req: Request): Promise<Response> => {
      throw "string error";
    };
    const wrapped = withErrorHandling(handler);
    const req = new Request("https://example.com/api/x");
    const res = await wrapped(req);
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
