import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/api-helpers";
import { db } from "@/db";
import { telegramLinkTokens } from "@/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { audit } from "@/lib/audit";

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateLinkCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(request: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const now = new Date();
  const existing = await db
    .select({ token: telegramLinkTokens.token, expires: telegramLinkTokens.expires })
    .from(telegramLinkTokens)
    .where(
      and(
        eq(telegramLinkTokens.userId, session.user.id),
        gt(telegramLinkTokens.expires, now),
        isNull(telegramLinkTokens.usedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({
      token: existing[0].token,
      expiresAt: existing[0].expires.toISOString(),
    });
  }

  const token = generateLinkCode();
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await Promise.all([
    db.insert(telegramLinkTokens).values({
      userId: session.user.id,
      token,
      expires,
    }),
    audit({
      userId: session.user.id,
      action: "telegram.link_initiated",
      resource: "telegram_link_tokens",
      request,
    }),
  ]);

  return NextResponse.json({
    token,
    expiresAt: expires.toISOString(),
  });
}
