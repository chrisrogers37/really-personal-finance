import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Parse a raw currency string (strip $, commas, whitespace) into a number. Returns NaN on failure. */
export function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[\s,$]/g, ""));
}

/** Format a Plaid category string for display (e.g., FOOD_AND_DRINK → Food And Drink). */
export function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Return a safe, same-origin relative redirect path. Accepts only values that
 * begin with a single "/" (no "//" protocol-relative, no "/\" backslash trick,
 * no absolute URLs). Falls back to `fallback` otherwise. Guards against open
 * redirects after trusted flows such as MFA.
 */
export function sanitizeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw || typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  return raw;
}
