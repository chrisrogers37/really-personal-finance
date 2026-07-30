/**
 * One-time backfill for #78: convert each mfa_credentials row's reversible,
 * AES-GCM-encrypted recovery-code blob (recovery_codes) into one-way bcrypt
 * hashes (recovery_code_hashes).
 *
 * Safe to re-run: rows that already have hashes are skipped. Rows with no
 * legacy blob (new enrollments) are left untouched. The legacy recovery_codes
 * column is NOT cleared here — it is dropped in a separate follow-up once this
 * backfill is verified in production.
 *
 * Requires DATABASE_URL and ENCRYPTION_KEY in the environment (the same
 * ENCRYPTION_KEY the app used to encrypt the codes — a mismatch fails loudly on
 * decrypt rather than corrupting data). Imports are relative on purpose so the
 * script runs under plain `tsx`, which does not resolve the `@/` path alias.
 *
 * Usage (always dry-run first — see the Part B migration runbook):
 *   npx tsx --env-file=.env.branch scripts/backfill-recovery-hashes.ts --dry-run
 *   npx tsx --env-file=.env.branch scripts/backfill-recovery-hashes.ts
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { mfaCredentials } from "../src/db/schema";
import { decrypt } from "../src/lib/encryption";

const BCRYPT_COST = 10;
const DRY_RUN = process.argv.includes("--dry-run");

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is required");
  if (!process.env.ENCRYPTION_KEY) fail("ENCRYPTION_KEY is required");

  // Deferred so the env checks above run before neon() connects at import.
  const { db } = await import("../src/db/index");

  const rows = await db
    .select({
      userId: mfaCredentials.userId,
      recoveryCodes: mfaCredentials.recoveryCodes,
      recoveryCodeHashes: mfaCredentials.recoveryCodeHashes,
    })
    .from(mfaCredentials);

  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}Scanning ${rows.length} mfa_credentials row(s)…\n`,
  );

  let converted = 0;
  let alreadyHashed = 0;
  let noCodes = 0;

  for (const row of rows) {
    if (row.recoveryCodeHashes && row.recoveryCodeHashes.length > 0) {
      alreadyHashed++;
      continue;
    }
    if (!row.recoveryCodes) {
      noCodes++;
      continue;
    }

    const codes: string[] = JSON.parse(decrypt(row.recoveryCodes));
    const hashes = await Promise.all(
      codes.map((code) => bcrypt.hash(code, BCRYPT_COST)),
    );

    if (!DRY_RUN) {
      await db
        .update(mfaCredentials)
        .set({ recoveryCodeHashes: hashes })
        .where(eq(mfaCredentials.userId, row.userId));
    }

    converted++;
    console.log(
      `${DRY_RUN ? "[dry-run] would hash" : "✓ hashed"} ${hashes.length} code(s) for user ${row.userId}`,
    );
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] " : ""}Done — converted ${converted}, already-hashed ${alreadyHashed}, no-codes ${noCodes} (of ${rows.length}).`,
  );
  if (DRY_RUN && converted > 0) {
    console.log("Re-run without --dry-run to write the hashes.");
  }
}

main().catch((err) => {
  console.error("✗ Backfill failed:", err);
  process.exit(1);
});
