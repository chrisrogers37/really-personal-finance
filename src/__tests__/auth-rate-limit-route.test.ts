import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// The route imports @/lib/auth-rate-limit -> @/lib/rate-limit -> @/db; mock @/db
// so importOriginal of the real helper module doesn't call neon() at load.
vi.mock("@/db", () => ({ db: {} }));

const { handlersPost } = vi.hoisted(() => ({ handlersPost: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  handlers: { GET: vi.fn(), POST: handlersPost },
}));

// Keep the real pure helpers (emailRateLimitKey, tooManyRequestsResponse); stub
// only the DB-backed enforcer.
vi.mock("@/lib/auth-rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-rate-limit")>()),
  enforceAuthRateLimit: vi.fn(),
}));

import { POST } from "@/app/api/auth/[...nextauth]/route";
import { enforceAuthRateLimit } from "@/lib/auth-rate-limit";

const mockedEnforce = vi.mocked(enforceAuthRateLimit);

function signInPost(
  body: string,
  contentType = "application/x-www-form-urlencoded",
) {
  return new NextRequest("https://example.com/api/auth/signin/email", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  handlersPost.mockResolvedValue(
    NextResponse.json({ delegated: true }, { status: 200 }),
  );
});

describe("POST /api/auth — email-keyed sign-in rate limit (#109)", () => {
  it("delegates to NextAuth when under the limit, keyed by normalized email", async () => {
    mockedEnforce.mockResolvedValue(null);

    const res = await POST(signInPost("email=Foo%40Bar.com&csrfToken=x"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ delegated: true });
    expect(mockedEnforce).toHaveBeenCalledWith("auth:email:foo@bar.com");
    expect(handlersPost).toHaveBeenCalledTimes(1);
  });

  it("returns 429 with Retry-After and does NOT reach NextAuth when blocked", async () => {
    mockedEnforce.mockResolvedValue(30_000);

    const res = await POST(signInPost("email=spam%40x.com&csrfToken=x"));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(handlersPost).not.toHaveBeenCalled();
  });

  it("gives distinct emails independent keys", async () => {
    mockedEnforce.mockResolvedValue(null);

    await POST(signInPost("email=a%40x.com&csrfToken=x"));
    await POST(signInPost("email=b%40x.com&csrfToken=x"));

    expect(mockedEnforce).toHaveBeenNthCalledWith(1, "auth:email:a@x.com");
    expect(mockedEnforce).toHaveBeenNthCalledWith(2, "auth:email:b@x.com");
  });

  it("skips the email limit for OAuth POSTs (no email field) and delegates", async () => {
    mockedEnforce.mockResolvedValue(null);

    // A provider sign-in form carries csrfToken/callbackUrl but no email.
    const res = await POST(signInPost("csrfToken=x&callbackUrl=%2F"));

    expect(res.status).toBe(200);
    expect(mockedEnforce).not.toHaveBeenCalled();
    expect(handlersPost).toHaveBeenCalledTimes(1);
  });

  it("skips for non-form (JSON) bodies without consuming them", async () => {
    mockedEnforce.mockResolvedValue(null);

    const res = await POST(
      signInPost(JSON.stringify({ hi: true }), "application/json"),
    );

    expect(res.status).toBe(200);
    expect(mockedEnforce).not.toHaveBeenCalled();
  });

  it("leaves the request body intact for NextAuth (clone is read, not the original)", async () => {
    mockedEnforce.mockResolvedValue(null);
    // Prove NextAuth can still read the body our rate-limit code cloned.
    handlersPost.mockImplementation(async (req: NextRequest) => {
      const form = await req.formData();
      return NextResponse.json({ email: form.get("email") });
    });

    const res = await POST(signInPost("email=keep%40me.com&csrfToken=x"));

    expect(await res.json()).toEqual({ email: "keep@me.com" });
  });
});
