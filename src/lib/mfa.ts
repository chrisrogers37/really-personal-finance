import * as OTPAuth from "otpauth";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { mfaCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

const ISSUER = "ReallyPersonalFinance";
const RECOVERY_CODE_COUNT = 8;
const TOTP_CONFIG = { issuer: ISSUER, algorithm: "SHA1", digits: 6, period: 30 } as const;

function buildTotp(secret: OTPAuth.Secret) {
  return new OTPAuth.TOTP({ ...TOTP_CONFIG, secret });
}

export async function enrollMfa(userId: string, userEmail: string) {
  const totp = new OTPAuth.TOTP({
    ...TOTP_CONFIG,
    label: userEmail,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(4).toString("hex")
  );

  const encryptedSecret = encrypt(totp.secret.base32);
  const encryptedCodes = encrypt(JSON.stringify(recoveryCodes));

  await db
    .insert(mfaCredentials)
    .values({
      userId,
      totpSecret: encryptedSecret,
      recoveryCodes: encryptedCodes,
      verified: false,
    })
    .onConflictDoUpdate({
      target: mfaCredentials.userId,
      set: {
        totpSecret: encryptedSecret,
        recoveryCodes: encryptedCodes,
        verified: false,
      },
    });

  return {
    uri: totp.toString(),
    secret: totp.secret.base32,
    recoveryCodes,
  };
}

export async function confirmMfaEnrollment(userId: string, code: string): Promise<boolean> {
  const [cred] = await db
    .select()
    .from(mfaCredentials)
    .where(eq(mfaCredentials.userId, userId))
    .limit(1);

  if (!cred) return false;

  const totp = buildTotp(OTPAuth.Secret.fromBase32(decrypt(cred.totpSecret)));
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return false;

  await Promise.all([
    db.update(mfaCredentials).set({ verified: true }).where(eq(mfaCredentials.userId, userId)),
    db.update(users).set({ mfaEnabled: true }).where(and(eq(users.userId, userId), eq(users.isCurrent, true))),
  ]);

  return true;
}

export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  const [cred] = await db
    .select()
    .from(mfaCredentials)
    .where(and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.verified, true)))
    .limit(1);

  if (!cred) return false;

  const totp = buildTotp(OTPAuth.Secret.fromBase32(decrypt(cred.totpSecret)));
  const delta = totp.validate({ token: code, window: 1 });
  if (delta !== null) return true;

  // Check recovery codes
  const recoveryCodes: string[] = JSON.parse(decrypt(cred.recoveryCodes));
  const codeIndex = recoveryCodes.indexOf(code);
  if (codeIndex === -1) return false;

  recoveryCodes.splice(codeIndex, 1);
  await db
    .update(mfaCredentials)
    .set({ recoveryCodes: encrypt(JSON.stringify(recoveryCodes)) })
    .where(eq(mfaCredentials.userId, userId));

  return true;
}

export async function hasMfaEnabled(userId: string): Promise<boolean> {
  const [cred] = await db
    .select({ verified: mfaCredentials.verified })
    .from(mfaCredentials)
    .where(and(eq(mfaCredentials.userId, userId), eq(mfaCredentials.verified, true)))
    .limit(1);

  return !!cred;
}

export async function disableMfa(userId: string): Promise<void> {
  await Promise.all([
    db.delete(mfaCredentials).where(eq(mfaCredentials.userId, userId)),
    db.update(users).set({ mfaEnabled: false }).where(and(eq(users.userId, userId), eq(users.isCurrent, true))),
  ]);
}
