import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { evaluateGate } from "@/lib/middleware-gate";

// Use the lightweight auth config (no Email provider / nodemailer)
// so middleware can run in the Edge Runtime.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const user = req.auth?.user as
    | { mfaEnabled?: boolean; mfaVerifiedAt?: Date | string | null }
    | undefined;

  const action = evaluateGate({
    pathname: req.nextUrl.pathname,
    isLoggedIn: !!req.auth,
    mfaEnabled: !!user?.mfaEnabled,
    mfaVerifiedAt: user?.mfaVerifiedAt ?? null,
  });

  switch (action.type) {
    case "next":
      return NextResponse.next();
    case "redirect":
      return NextResponse.redirect(new URL(action.path, req.nextUrl));
    case "json":
      return NextResponse.json(action.body, { status: action.status });
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/auth/:path*", "/api/admin/:path*"],
};
