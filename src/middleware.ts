import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Use the lightweight auth config (no Email provider / nodemailer)
// so middleware can run in the Edge Runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isMfaPage = req.nextUrl.pathname.startsWith("/auth/mfa");
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");
  const isProfilePage = req.nextUrl.pathname.startsWith("/profile");
  const isAdminRoute = req.nextUrl.pathname.startsWith("/api/admin");
  const isCronRoute = req.nextUrl.pathname.startsWith("/api/cron");
  const isTelegramRoute = req.nextUrl.pathname.startsWith("/api/telegram");

  // Allow cron and telegram webhook routes through (have their own auth)
  if (isCronRoute || isTelegramRoute) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages to dashboard.
  // Exception: /auth/mfa is the MFA challenge page — keep it reachable.
  if (isAuthPage && isLoggedIn && !isMfaPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Protect dashboard, profile, and admin routes
  if ((isDashboardPage || isProfilePage || isAdminRoute) && !isLoggedIn) {
    if (isAdminRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl));
  }

  // MFA enforcement: logged in with MFA enabled but session not yet verified.
  if (isLoggedIn) {
    const user = req.auth?.user as
      | { mfaEnabled?: boolean; mfaVerifiedAt?: Date | string | null }
      | undefined;
    const mfaRequired = !!user?.mfaEnabled && !user?.mfaVerifiedAt;
    if (mfaRequired && !isMfaPage) {
      if (isAdminRoute) {
        return NextResponse.json({ error: "MFA required" }, { status: 401 });
      }
      if (isDashboardPage || isProfilePage) {
        return NextResponse.redirect(new URL("/auth/mfa", req.nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/auth/:path*", "/api/admin/:path*"],
};
