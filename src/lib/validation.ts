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
