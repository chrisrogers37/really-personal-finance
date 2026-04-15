import { db } from "@/db";
import { consentRecords } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export type ConsentType = "plaid_data_access" | "privacy_policy" | "tos";
export const VALID_CONSENT_TYPES: readonly ConsentType[] = ["plaid_data_access", "privacy_policy", "tos"];

export async function grantConsent(
  userId: string,
  consentType: ConsentType,
  version: string,
  ipAddress?: string | null,
): Promise<void> {
  // Revoke any existing active consent of the same type before granting new
  await db
    .update(consentRecords)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.consentType, consentType),
        isNull(consentRecords.revokedAt),
      )
    );

  await db.insert(consentRecords).values({
    userId,
    consentType,
    version,
    ipAddress: ipAddress ?? null,
  });
}

export async function revokeConsent(
  userId: string,
  consentType: ConsentType,
): Promise<void> {
  await db
    .update(consentRecords)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.consentType, consentType),
        isNull(consentRecords.revokedAt),
      )
    );
}

export async function getActiveConsents(userId: string) {
  return db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        isNull(consentRecords.revokedAt),
      )
    );
}

export async function getConsentHistory(userId: string) {
  return db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, userId));
}

export async function hasActiveConsent(
  userId: string,
  consentType: ConsentType,
): Promise<boolean> {
  const [consent] = await db
    .select({ id: consentRecords.id })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.consentType, consentType),
        isNull(consentRecords.revokedAt),
      )
    )
    .limit(1);

  return !!consent;
}
