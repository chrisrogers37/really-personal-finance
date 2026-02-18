import { describe, it, expect } from "vitest";
import {
  validateAccountInput,
  VALID_ACCOUNT_TYPES,
} from "@/lib/validation";

describe("validateAccountInput", () => {
  it("accepts valid input with all fields", () => {
    const result = validateAccountInput({
      name: "Amex Platinum",
      type: "credit",
      subtype: "charge card",
      mask: "1234",
    });
    expect(result).toEqual({
      name: "Amex Platinum",
      type: "credit",
      subtype: "charge card",
      mask: "1234",
    });
  });

  it("accepts valid input with only required fields", () => {
    const result = validateAccountInput({
      name: "Checking",
      type: "checking",
    });
    expect(result).toEqual({
      name: "Checking",
      type: "checking",
      subtype: null,
      mask: null,
    });
  });

  it("trims whitespace from name", () => {
    const result = validateAccountInput({
      name: "  My Account  ",
      type: "savings",
    });
    expect("name" in result && result.name).toBe("My Account");
  });

  it("trims whitespace from subtype and mask", () => {
    const result = validateAccountInput({
      name: "Test",
      type: "credit",
      subtype: "  visa  ",
      mask: "  5678  ",
    });
    expect(result).toEqual({
      name: "Test",
      type: "credit",
      subtype: "visa",
      mask: "5678",
    });
  });

  it("returns null for empty optional string fields", () => {
    const result = validateAccountInput({
      name: "Test",
      type: "checking",
      subtype: "",
      mask: "   ",
    });
    expect(result).toEqual({
      name: "Test",
      type: "checking",
      subtype: null,
      mask: null,
    });
  });

  it("rejects empty name", () => {
    const result = validateAccountInput({ name: "", type: "credit" });
    expect(result).toEqual({ error: "Account name is required" });
  });

  it("rejects whitespace-only name", () => {
    const result = validateAccountInput({ name: "   ", type: "credit" });
    expect(result).toEqual({ error: "Account name is required" });
  });

  it("rejects missing name", () => {
    const result = validateAccountInput({ type: "credit" });
    expect(result).toEqual({ error: "Account name is required" });
  });

  it("rejects missing type", () => {
    const result = validateAccountInput({ name: "Test" });
    expect(result).toEqual({ error: "Account type is required" });
  });

  it("rejects invalid type", () => {
    const result = validateAccountInput({ name: "Test", type: "invalid" });
    expect(result).toEqual({
      error: `Invalid type. Must be one of: ${VALID_ACCOUNT_TYPES.join(", ")}`,
    });
  });

  it("rejects null input", () => {
    const result = validateAccountInput(null);
    expect(result).toEqual({ error: "Request body is required" });
  });

  it("accepts all valid account types", () => {
    for (const type of VALID_ACCOUNT_TYPES) {
      const result = validateAccountInput({ name: "Test", type });
      expect("name" in result).toBe(true);
    }
  });
});
