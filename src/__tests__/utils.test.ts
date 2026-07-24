import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, cn, sanitizeCallbackUrl } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats positive amounts", () => {
    expect(formatCurrency(42.5)).toBe("$42.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-10.99);
    // Intl.NumberFormat may use different minus sign formats
    expect(result).toContain("10.99");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });
});

describe("formatDate", () => {
  it("formats a date string", () => {
    // Use T12:00:00 to avoid timezone-related day shifts
    const result = formatDate("2024-01-15T12:00:00");
    expect(result).toBe("Jan 15, 2024");
  });

  it("formats a Date object", () => {
    const result = formatDate(new Date(2024, 11, 25));
    expect(result).toBe("Dec 25, 2024");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("handles falsy values", () => {
    const result = cn("base", false, null, undefined, "extra");
    expect(result).toBe("base extra");
  });
});

describe("sanitizeCallbackUrl (#131)", () => {
  it("allows a same-origin absolute path", () => {
    expect(sanitizeCallbackUrl("/dashboard/settings")).toBe("/dashboard/settings");
  });

  it("rejects protocol-relative //host", () => {
    expect(sanitizeCallbackUrl("//evil.com")).toBe("/dashboard");
  });

  it("rejects an absolute URL", () => {
    expect(sanitizeCallbackUrl("https://evil.com")).toBe("/dashboard");
  });

  it("rejects backslash tricks", () => {
    expect(sanitizeCallbackUrl("/\\evil.com")).toBe("/dashboard");
  });

  it("falls back on null/empty", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/dashboard");
    expect(sanitizeCallbackUrl("")).toBe("/dashboard");
  });
});
