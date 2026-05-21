import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { updateUserProfile } from "@/lib/scd2";
import { db } from "@/db";
import { emailChangeTokens } from "@/db/schema";
import {
  sendEmailChangeConfirmation,
  sendEmailChangeNotification,
} from "@/lib/email";
import { audit } from "@/lib/audit";
import { checkRateLimit, recordFailure } from "@/lib/rate-limit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function getBaseUrl(request: NextRequest): string {
  const env = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  return request.nextUrl.origin;
}

async function _GET() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  });
}

async function _PUT(request: NextRequest) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session, userId } = guard;

  const body = await request.json();
  const { name, email } = body;

  if (!name && !email) {
    return NextResponse.json(
      { error: "At least one field (name or email) must be provided" },
      { status: 400 }
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  const emailIsChanging = !!email && email !== session.user.email;

  if (emailIsChanging) {
    const rateKey = `email_change:${userId}`;
    const limit = await checkRateLimit(rateKey);
    if (!limit.allowed) {
      const retryAfter = Math.ceil((limit.retryAfterMs ?? 0) / 1000);
      return NextResponse.json(
        { error: "Too many email change attempts" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    await recordFailure(rateKey);

    const token = randomBytes(32).toString("hex");
    const revokeToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + TOKEN_TTL_MS);

    await db.insert(emailChangeTokens).values({
      userId,
      newEmail: email,
      token,
      revokeToken,
      expires,
    });

    const base = getBaseUrl(request);
    const confirmLink = `${base}/api/profile/confirm-email?token=${token}`;
    const revokeLink = `${base}/api/profile/revoke-email-change?token=${revokeToken}`;

    try {
      await sendEmailChangeConfirmation(email, confirmLink);
      if (session.user.email) {
        await sendEmailChangeNotification(
          session.user.email,
          email,
          revokeLink
        );
      }
    } catch (err) {
      console.error("[profile] Email send failed:", err);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    await audit({
      userId,
      action: "profile.email_change_requested",
      resource: "users",
      resourceId: userId,
      detail: { newEmail: email },
      request,
    });

    if (name) {
      await updateUserProfile(userId, { name });
    }

    return NextResponse.json({
      pendingEmailChange: true,
      message:
        "Confirmation email sent to the new address. Your email will not change until you confirm.",
    });
  }

  const updated = await updateUserProfile(userId, {
    name: name ?? undefined,
  });

  return NextResponse.json({
    user: {
      id: updated.userId,
      email: updated.email,
      name: updated.name,
    },
  });
}

export const GET = withErrorHandling(_GET);
export const PUT = withErrorHandling(_PUT);
