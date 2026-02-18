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
  const isCronRoute = req.nextUrl.pathname.startsWith("/api/cron");
  const isTelegramRoute = req.nextUrl.pathname.startsWith("/api/telegram");

  // Allow cron and telegram webhook routes through
  if (isCronRoute || isTelegramRoute) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages to dashboard
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Protect dashboard and profile routes
  if ((isDashboardPage || isProfilePage) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/auth/:path*"],
};
