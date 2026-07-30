import * as OTPAuth from "otpauth";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { mfaCredentials, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

const ISSUER = "ReallyPersonalFinance";
const RECOVERY_CODE_COUNT = 8;
const BCRYPT_COST = 10;
const TOTP_CONFIG = { issuer: ISSUER, algorithm: "SHA1", digits: 6, period: 30 } as const;

function buildTotp(secret: OTPAuth.Secret) {
  return new OTPAuth.TOTP({ ...TOTP_CONFIG, secret });
}

/** Absolute TOTP timestep for the current wall-clock time (RFC 6238 counter). */
function currentTotpStep(): number {
  return Math.floor(Date.now() / 1000 / TOTP_CONFIG.period);
}

/**
 * The timestep a just-validated TOTP (offset `delta` from now) consumes, or null
 * if it replays an already-consumed step. Single-sources the #130 replay rule
 * shared by confirmMfaEnrollment and verifyMfaCode so the two can't drift.
 */
function nextTotpStep(delta: number, lastStep: number | null): number | null {
  const step = currentTotpStep() + delta;
  if (lastStep != null && step <= lastStep) return null;
  return step;
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
  // Store one-way bcrypt hashes, never the reversible codes (#78). The plaintext
  // codes are returned to the caller once, here, and never persisted.
  const recoveryCodeHashes = await Promise.all(
    recoveryCodes.map((code) => bcrypt.hash(code, BCRYPT_COST))
  );

  // Reset legacy plaintext blob and the replay guard on (re-)enrollment: this is
  // a brand-new secret, so no prior timestep has been consumed.
  const credential = {
    totpSecret: encryptedSecret,
    recoveryCodeHashes,
    recoveryCodes: null,
    lastTotpStep: null,
    verified: false,
  };

  await db
    .insert(mfaCredentials)
    .values({ userId, ...credential })
    .onConflictDoUpdate({
      target: mfaCredentials.userId,
      set: credential,
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

  // #130: record the consumed timestep so this same code can't be replayed at
  // login immediately after enrollment.
  const step = nextTotpStep(delta, cred.lastTotpStep);
  if (step === null) return false;

  await Promise.all([
    db.update(mfaCredentials).set({ verified: true, lastTotpStep: step }).where(eq(mfaCredentials.userId, userId)),
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
  if (delta !== null) {
    // #130: a TOTP is single-use. Reject any step at or below the last one we
    // consumed — covers replay of the same code and any older in-window code.
    const step = nextTotpStep(delta, cred.lastTotpStep);
    if (step === null) return false;
    await db
      .update(mfaCredentials)
      .set({ lastTotpStep: step })
      .where(eq(mfaCredentials.userId, userId));
    return true;
  }

  return verifyRecoveryCode(userId, code, cred);
}

/**
 * Verify and consume a single-use recovery code. A non-null recoveryCodeHashes
 * array is the authoritative signal that the row is on the bcrypt scheme (#78) —
 * set once at enrollment or backfill; null only on rows that predate the
 * backfill, which still read the legacy encrypted-JSON blob.
 */
async function verifyRecoveryCode(
  userId: string,
  code: string,
  cred: { recoveryCodeHashes: string[] | null; recoveryCodes: string | null },
): Promise<boolean> {
  // Use the hash scheme whenever it's present — even when the array is empty
  // (all codes consumed), which yields no match. We must NOT fall back to the
  // legacy blob here: the backfill leaves recovery_codes populated for rollback
  // safety, so falling back would resurrect codes already spent via the hashes.
  if (cred.recoveryCodeHashes !== null) {
    const hashes = cred.recoveryCodeHashes;
    // Compare against EVERY stored hash with no early break, so response timing
    // doesn't leak which code matched (or how far down the list it was).
    let matchIndex = -1;
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(code, hashes[i])) matchIndex = i;
    }
    if (matchIndex === -1) return false;

    const remaining = hashes.filter((_, i) => i !== matchIndex);
    await db
      .update(mfaCredentials)
      .set({ recoveryCodeHashes: remaining })
      .where(eq(mfaCredentials.userId, userId));
    return true;
  }

  // Legacy fallback: reversible encrypted blob, for rows not yet backfilled to
  // hashes. Removed once the backfill + column drop land (see migration runbook).
  if (cred.recoveryCodes) {
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

  return false;
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
