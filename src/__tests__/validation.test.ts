import { describe, it, expect } from "vitest";
import { isValidDateParam, clampInt, timingSafeCompare } from "@/lib/validation";

describe("isValidDateParam", () => {
  it("accepts valid dates", () => {
    expect(isValidDateParam("2024-01-15")).toBe(true);
    expect(isValidDateParam("2024-12-31")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDateParam("not-a-date")).toBe(false);
    expect(isValidDateParam("2024-1-1")).toBe(false);
    expect(isValidDateParam("2024-13-01")).toBe(false);
    expect(isValidDateParam("2024-00-01")).toBe(false);
    expect(isValidDateParam("24-01-01")).toBe(false);
    expect(isValidDateParam("")).toBe(false);
  });
});

describe("clampInt", () => {
  it("returns default for null input", () => {
    expect(clampInt(null, 100, 1, 200)).toBe(100);
  });

  it("returns default for NaN input", () => {
    expect(clampInt("abc", 100, 1, 200)).toBe(100);
  });

  it("clamps to min", () => {
    expect(clampInt("0", 100, 1, 200)).toBe(1);
    expect(clampInt("-5", 100, 1, 200)).toBe(1);
  });

  it("clamps to max", () => {
    expect(clampInt("999999", 100, 1, 200)).toBe(200);
  });

  it("passes through valid values", () => {
    expect(clampInt("50", 100, 1, 200)).toBe(50);
  });
});

describe("timingSafeCompare", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeCompare("secret", "secret")).toBe(true);
  });

  it("returns false for different strings", () => {
    expect(timingSafeCompare("secret", "wrong")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeCompare("short", "longer-string")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeCompare("", "")).toBe(true);
  });
});
