import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";
import {
  emailRateLimitKey,
  enforceAuthRateLimit,
  tooManyRequestsResponse,
} from "@/lib/auth-rate-limit";

export const { GET } = handlers;

/**
 * Email-keyed rate limit on sign-in POSTs (#109). The email is read from a clone
 * so NextAuth still receives an unconsumed request body. OAuth POSTs carry no
 * email field → they fall through untouched (the middleware IP layer covers them).
 */
export async function POST(request: NextRequest): Promise<Response> {
  const email = await extractSignInEmail(request);
  if (email) {
    const retryAfterMs = await enforceAuthRateLimit(emailRateLimitKey(email));
    if (retryAfterMs !== null) return tooManyRequestsResponse(retryAfterMs);
  }
  return handlers.POST(request);
}

async function extractSignInEmail(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";
  const isForm =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");
  if (!isForm) return null;
  try {
    const form = await request.clone().formData();
    const email = form.get("email");
    return typeof email === "string" && email.trim() ? email : null;
  } catch {
    return null;
  }
}
