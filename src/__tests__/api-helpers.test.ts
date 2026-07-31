import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextResponse, NextRequest } from "next/server";

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
  requireCronAuth,
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

describe("requireCronAuth (#128 — fail closed on unset secret)", () => {
  const realSecret = process.env.CRON_SECRET;

  function cronRequest(authHeader?: string): NextRequest {
    const headers = new Headers();
    if (authHeader !== undefined) headers.set("authorization", authHeader);
    return new NextRequest("https://example.com/api/cron/sync-transactions", {
      headers,
    });
  }

  afterEach(() => {
    if (realSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = realSecret;
  });

  it("fails CLOSED with 500 when CRON_SECRET is unset — even for 'Bearer undefined'", async () => {
    delete process.env.CRON_SECRET;
    // Pre-fix, `expected` becomes the literal "Bearer undefined" and this header
    // passes the timing-safe compare. The guard must reject it before comparing.
    const res = requireCronAuth(cronRequest("Bearer undefined"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(500);
    expect(await res?.json()).toEqual({ error: "Server misconfiguration" });
  });

  it("fails CLOSED with 500 when CRON_SECRET is unset and no header is sent", async () => {
    delete process.env.CRON_SECRET;
    const res = requireCronAuth(cronRequest());
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(500);
  });

  it("authorizes (null) when the secret is set and the Bearer token matches", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    const res = requireCronAuth(cronRequest("Bearer s3cr3t-value"));
    expect(res).toBeNull();
  });

  it("returns 401 when the secret is set but the token is wrong", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    const res = requireCronAuth(cronRequest("Bearer wrong"));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(401);
  });

  it("returns 401 when the secret is set but no header is sent", () => {
    process.env.CRON_SECRET = "s3cr3t-value";
    const res = requireCronAuth(cronRequest());
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(401);
  });
});
