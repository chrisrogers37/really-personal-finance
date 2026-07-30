export type GateAction =
  | { type: "next" }
  | { type: "redirect"; path: string }
  | { type: "json"; status: number; body: { error: string } };

export interface GateInput {
  pathname: string;
  isLoggedIn: boolean;
  mfaEnabled: boolean;
  mfaVerifiedAt: Date | string | null | undefined;
}

/**
 * Public API routes that must never require a session. Everything else under
 * /api/* is protected by default (#111): the security model is "default-deny
 * with an explicit allowlist", not "opt-in per handler". Auth/cron routes match
 * by prefix; the rest are exact — note only /api/telegram/webhook is public
 * (secret-authed), while /api/telegram/{config,link-token,test} are user routes.
 */
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/cron"];
const PUBLIC_API_EXACT = [
  "/api/telegram/webhook",
  "/api/profile/confirm-email",
  "/api/profile/revoke-email-change",
];

function isPublicApiRoute(pathname: string): boolean {
  return (
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PUBLIC_API_EXACT.includes(pathname)
  );
}

export function evaluateGate({
  pathname,
  isLoggedIn,
  mfaEnabled,
  mfaVerifiedAt,
}: GateInput): GateAction {
  const isApiRoute = pathname.startsWith("/api");

  // Allowlisted public API routes short-circuit before any auth check.
  if (isApiRoute && isPublicApiRoute(pathname)) {
    return { type: "next" };
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isMfaPage = pathname.startsWith("/auth/mfa");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isProfilePage = pathname.startsWith("/profile");

  // Any non-allowlisted API route is protected; API failures return JSON (not a
  // redirect) so fetch callers get a real 401. App pages redirect to sign-in/MFA.
  const isProtectedApi = isApiRoute; // public ones already returned above
  const isProtectedPage = isDashboardPage || isProfilePage;

  if (isAuthPage && isLoggedIn && !isMfaPage) {
    return { type: "redirect", path: "/dashboard" };
  }

  if (!isLoggedIn) {
    if (isProtectedApi) {
      return { type: "json", status: 401, body: { error: "Unauthorized" } };
    }
    if (isProtectedPage) {
      return { type: "redirect", path: "/auth/signin" };
    }
  }

  if (isLoggedIn && mfaEnabled && !mfaVerifiedAt && !isMfaPage) {
    if (isProtectedApi) {
      return { type: "json", status: 401, body: { error: "MFA required" } };
    }
    if (isProtectedPage) {
      return { type: "redirect", path: "/auth/mfa" };
    }
  }

  return { type: "next" };
}
