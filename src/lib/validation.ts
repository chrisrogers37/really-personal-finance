import { timingSafeEqual } from "crypto";

/**
 * ISO date format regex: YYYY-MM-DD
 */
const ISO_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates that a string is in YYYY-MM-DD format.
 */
export function isValidDateParam(value: string): boolean {
  return ISO_DATE_REGEX.test(value);
}

/**
 * Clamps a numeric value between min and max (inclusive).
 * If the parsed value is NaN, returns the defaultValue.
 */
export function clampInt(
  raw: string | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  const parsed = parseInt(raw || String(defaultValue), 10);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

/**
 * Valid account types for manual account creation.
 */
export const VALID_ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit",
  "investment",
  "other",
] as const;

export type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

interface AccountInputValid {
  name: string;
  type: AccountType;
  subtype: string | null;
  mask: string | null;
}

interface AccountInputError {
  error: string;
}

/**
 * Validates and normalizes account creation input.
 * Returns parsed fields on success, or an error message on failure.
 */
export function validateAccountInput(
  input: unknown
): AccountInputValid | AccountInputError {
  if (!input || typeof input !== "object") {
    return { error: "Request body is required" };
  }

  const { name, type, subtype, mask } = input as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return { error: "Account name is required" };
  }

  if (!type || typeof type !== "string") {
    return { error: "Account type is required" };
  }

  if (!VALID_ACCOUNT_TYPES.includes(type as AccountType)) {
    return {
      error: `Invalid type. Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    };
  }

  return {
    name: name.trim(),
    type: type as AccountType,
    subtype: typeof subtype === "string" && subtype.trim() ? subtype.trim() : null,
    mask: typeof mask === "string" && mask.trim() ? mask.trim() : null,
  };
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid early-exit timing leak
    const buf = Buffer.from(a);
    timingSafeEqual(buf, buf);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
