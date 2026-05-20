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

export function evaluateGate({
  pathname,
  isLoggedIn,
  mfaEnabled,
  mfaVerifiedAt,
}: GateInput): GateAction {
  const isAuthPage = pathname.startsWith("/auth");
  const isMfaPage = pathname.startsWith("/auth/mfa");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isProfilePage = pathname.startsWith("/profile");
  const isAdminRoute = pathname.startsWith("/api/admin");
  const isCronRoute = pathname.startsWith("/api/cron");
  const isTelegramRoute = pathname.startsWith("/api/telegram");

  if (isCronRoute || isTelegramRoute) {
    return { type: "next" };
  }

  if (isAuthPage && isLoggedIn && !isMfaPage) {
    return { type: "redirect", path: "/dashboard" };
  }

  if ((isDashboardPage || isProfilePage || isAdminRoute) && !isLoggedIn) {
    if (isAdminRoute) {
      return { type: "json", status: 401, body: { error: "Unauthorized" } };
    }
    return { type: "redirect", path: "/auth/signin" };
  }

  if (isLoggedIn && mfaEnabled && !mfaVerifiedAt && !isMfaPage) {
    if (isAdminRoute) {
      return { type: "json", status: 401, body: { error: "MFA required" } };
    }
    if (isDashboardPage || isProfilePage) {
      return { type: "redirect", path: "/auth/mfa" };
    }
  }

  return { type: "next" };
}
