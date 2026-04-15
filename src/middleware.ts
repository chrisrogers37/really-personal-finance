import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Use the lightweight auth config (no Email provider / nodemailer)
// so middleware can run in the Edge Runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth");
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");
  const isProfilePage = req.nextUrl.pathname.startsWith("/profile");
  const isAdminRoute = req.nextUrl.pathname.startsWith("/api/admin");
  const isCronRoute = req.nextUrl.pathname.startsWith("/api/cron");
  const isTelegramRoute = req.nextUrl.pathname.startsWith("/api/telegram");

  // Allow cron and telegram webhook routes through (have their own auth)
  if (isCronRoute || isTelegramRoute) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages to dashboard
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Protect dashboard, profile, and admin routes
  if ((isDashboardPage || isProfilePage || isAdminRoute) && !isLoggedIn) {
    if (isAdminRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/auth/:path*", "/api/admin/:path*"],
};
