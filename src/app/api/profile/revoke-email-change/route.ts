import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { withErrorHandling } from "@/lib/api-helpers";
import { db } from "@/db";
import { emailChangeTokens } from "@/db/schema";
import { audit } from "@/lib/audit";

function page(status: number, title: string, message: string): NextResponse {
  const html = `<!doctype html><html><head><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:4rem auto;padding:0 1rem;line-height:1.5}</style>
</head><body><h1>${title}</h1><p>${message}</p>
<p><a href="/dashboard">Return to dashboard</a></p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function _GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return page(400, "Revoke failed", "Missing token.");
  }

  const [row] = await db
    .select()
    .from(emailChangeTokens)
    .where(eq(emailChangeTokens.revokeToken, token))
    .limit(1);

  if (!row) {
    return page(400, "Revoke failed", "Invalid token.");
  }

  if (row.usedAt) {
    return page(
      400,
      "Cannot revoke",
      "This email change has already been confirmed. Sign in and change your email back, or contact support."
    );
  }

  if (row.cancelledAt) {
    return page(200, "Already cancelled", "This email change was already cancelled.");
  }

  const [marked] = await db
    .update(emailChangeTokens)
    .set({ cancelledAt: new Date() })
    .where(
      and(
        eq(emailChangeTokens.id, row.id),
        isNull(emailChangeTokens.usedAt),
        isNull(emailChangeTokens.cancelledAt)
      )
    )
    .returning();

  if (!marked) {
    return page(400, "Revoke failed", "Could not cancel — the request was already processed.");
  }

  await audit({
    userId: row.userId,
    action: "profile.email_change_cancelled",
    resource: "users",
    resourceId: row.userId,
    detail: { newEmail: row.newEmail },
    request,
  });

  return page(
    200,
    "Email change cancelled",
    "The pending email change has been cancelled. Your account email is unchanged."
  );
}

export const GET = withErrorHandling(_GET);
