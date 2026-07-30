import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  recordFailure: vi.fn().mockResolvedValue({ remaining: 0 }),
  AUTH_MAX_ATTEMPTS: 10,
}));

import { checkRateLimit, recordFailure } from "@/lib/rate-limit";
import {
  isRateLimitedAuthPath,
  clientIpFromHeaders,
  emailRateLimitKey,
  enforceAuthRateLimit,
  tooManyRequestsResponse,
} from "@/lib/auth-rate-limit";

const mockedCheck = vi.mocked(checkRateLimit);
const mockedRecord = vi.mocked(recordFailure);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isRateLimitedAuthPath", () => {
  it("limits sign-in and callback entrypoints", () => {
    expect(isRateLimitedAuthPath("/api/auth/signin")).toBe(true);
    expect(isRateLimitedAuthPath("/api/auth/signin/email")).toBe(true);
    expect(isRateLimitedAuthPath("/api/auth/callback/google")).toBe(true);
  });

  it("does NOT limit high-frequency polling routes (would break the app)", () => {
    expect(isRateLimitedAuthPath("/api/auth/session")).toBe(false);
    expect(isRateLimitedAuthPath("/api/auth/csrf")).toBe(false);
    expect(isRateLimitedAuthPath("/api/auth/providers")).toBe(false);
  });
});

describe("clientIpFromHeaders", () => {
  it("takes the first X-Forwarded-For hop", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIpFromHeaders(h)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.4" });
    expect(clientIpFromHeaders(h)).toBe("198.51.100.4");
  });

  it("returns 'unknown' when no IP header is present", () => {
    expect(clientIpFromHeaders(new Headers())).toBe("unknown");
  });
});

describe("emailRateLimitKey", () => {
  it("lowercases and trims so keys are case/space-insensitive", () => {
    expect(emailRateLimitKey("  Foo@Bar.COM ")).toBe("auth:email:foo@bar.com");
  });
});

describe("enforceAuthRateLimit", () => {
  it("records the attempt and returns null when allowed", async () => {
    mockedCheck.mockResolvedValueOnce({ allowed: true, remaining: 9 });

    const result = await enforceAuthRateLimit("auth:email:a@b.c");

    expect(result).toBeNull();
    expect(mockedCheck).toHaveBeenCalledWith("auth:email:a@b.c", 10);
    expect(mockedRecord).toHaveBeenCalledWith("auth:email:a@b.c", 10);
  });

  it("returns retryAfterMs and does NOT record when blocked", async () => {
    mockedCheck.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 42_000,
    });

    const result = await enforceAuthRateLimit("auth:ip:1.2.3.4");

    expect(result).toBe(42_000);
    expect(mockedRecord).not.toHaveBeenCalled();
  });
});

describe("tooManyRequestsResponse", () => {
  it("is a 429 with a Retry-After header (seconds, rounded up)", async () => {
    const res = tooManyRequestsResponse(42_000);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(await res.json()).toEqual({
      error: "Too many sign-in attempts. Please try again later.",
    });
  });

  it("omits Retry-After when the wait is unknown", () => {
    const res = tooManyRequestsResponse(null);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeNull();
  });
});
