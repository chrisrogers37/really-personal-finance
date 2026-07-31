import { NextResponse } from "next/server";
import { checkRateLimit, recordFailure, AUTH_MAX_ATTEMPTS } from "./rate-limit";

/**
 * Rate-limiting for the auth sign-in surface (#109). Two layers share this
 * module: an email-keyed limit at the NextAuth route and an IP-keyed limit in
 * middleware. Both count every *attempt* (not just failures) and never reset on
 * success — resetting would leak which emails exist (enumeration).
 */

/**
 * Auth entrypoints that get IP-based rate limiting. Deliberately narrow: only the
 * sign-in initiation and OAuth callback — never the high-frequency polling routes
 * (/api/auth/session, /csrf, /providers), which would break the app if throttled.
 */
export function isRateLimitedAuthPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth/signin") ||
    pathname.startsWith("/api/auth/callback")
  );
}

/** Client IP from the first X-Forwarded-For hop, then x-real-ip, else "unknown". */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Normalize an email for use as a rate-limit key (case/space-insensitive). */
export function emailRateLimitKey(email: string): string {
  return `auth:email:${email.trim().toLowerCase()}`;
}

/** Rate-limit key for a client IP. Keeps the `auth:*` namespace in one place. */
export function ipRateLimitKey(ip: string): string {
  return `auth:ip:${ip}`;
}

/**
 * Count one attempt against `key`. Returns `retryAfterMs` (>= 0) when the key is
 * already over the limit and the caller should reject with 429, or `null` when
 * the attempt is allowed (and has been recorded).
 */
export async function enforceAuthRateLimit(key: string): Promise<number | null> {
  const { allowed, retryAfterMs } = await checkRateLimit(key, AUTH_MAX_ATTEMPTS);
  if (!allowed) return retryAfterMs ?? 0;
  await recordFailure(key, AUTH_MAX_ATTEMPTS);
  return null;
}

/** Shared 429 response with a Retry-After header (seconds) when known. */
export function tooManyRequestsResponse(retryAfterMs: number | null): NextResponse {
  const headers = new Headers();
  if (retryAfterMs && retryAfterMs > 0) {
    headers.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  }
  return NextResponse.json(
    { error: "Too many sign-in attempts. Please try again later." },
    { status: 429, headers },
  );
}
