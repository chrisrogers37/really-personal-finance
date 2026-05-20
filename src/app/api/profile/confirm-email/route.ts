import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { withErrorHandling } from "@/lib/api-helpers";
import { updateUserProfile } from "@/lib/scd2";
import { db } from "@/db";
import { emailChangeTokens, sessions } from "@/db/schema";
import { audit } from "@/lib/audit";

function errorPage(message: string): NextResponse {
  const html = `<!doctype html><html><head><title>Email Change</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:4rem auto;padding:0 1rem;line-height:1.5}</style>
</head><body><h1>Email change failed</h1><p>${message}</p>
<p><a href="/dashboard">Return to dashboard</a></p></body></html>`;
  return new NextResponse(html, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function successPage(newEmail: string): NextResponse {
  const html = `<!doctype html><html><head><title>Email Change</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:4rem auto;padding:0 1rem;line-height:1.5}</style>
</head><body><h1>Email changed</h1>
<p>Your account email is now <strong>${newEmail}</strong>. For security, all other sessions have been signed out.</p>
<p><a href="/dashboard">Return to dashboard</a></p></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function _GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return errorPage("Missing token.");
  }

  const [row] = await db
    .select()
    .from(emailChangeTokens)
    .where(eq(emailChangeTokens.token, token))
    .limit(1);

  if (!row) {
    return errorPage("Invalid or expired token.");
  }

  if (row.usedAt) {
    return errorPage("This confirmation link has already been used.");
  }

  if (row.cancelledAt) {
    return errorPage("This email change was cancelled.");
  }

  if (row.expires.getTime() < Date.now()) {
    return errorPage("This confirmation link has expired.");
  }

  // Atomically mark the token used so a concurrent request cannot
  // double-spend it.
  const [marked] = await db
    .update(emailChangeTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailChangeTokens.id, row.id),
        isNull(emailChangeTokens.usedAt),
        isNull(emailChangeTokens.cancelledAt)
      )
    )
    .returning();

  if (!marked) {
    return errorPage("This confirmation link has already been used.");
  }

  await updateUserProfile(row.userId, {
    email: row.newEmail,
    emailVerified: new Date(),
  });

  // Sign out all sessions for this user. If an attacker initiated the
  // change from a hijacked session, this cuts them off immediately.
  await db.delete(sessions).where(eq(sessions.userId, row.userId));

  await audit({
    userId: row.userId,
    action: "profile.email_change_completed",
    resource: "users",
    resourceId: row.userId,
    detail: { newEmail: row.newEmail },
    request,
  });

  return successPage(row.newEmail);
}

export const GET = withErrorHandling(_GET);
