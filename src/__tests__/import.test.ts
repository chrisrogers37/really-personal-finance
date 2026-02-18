import { describe, it, expect } from "vitest";
import { generateImportId, validateConfirmInput } from "@/lib/import";
import type { ParsedTransaction } from "@/lib/parsers/types";

describe("generateImportId", () => {
  it("returns fitid prefix for transactions with externalId", () => {
    const txn: ParsedTransaction = {
      date: "2026-01-15",
      description: "AMAZON.COM",
      amount: "42.99",
      externalId: "320260450232984846",
    };
    expect(generateImportId(txn)).toBe("fitid:320260450232984846");
  });

  it("returns hash prefix for transactions without externalId", () => {
    const txn: ParsedTransaction = {
      date: "2026-01-15",
      description: "AMAZON.COM",
      amount: "42.99",
    };
    const result = generateImportId(txn);
    expect(result).toMatch(/^hash:[a-f0-9]{32}$/);
  });

  it("is deterministic — same inputs produce same output", () => {
    const txn: ParsedTransaction = {
      date: "2026-01-15",
      description: "WHOLE FOODS",
      amount: "67.23",
    };
    expect(generateImportId(txn)).toBe(generateImportId(txn));
  });

  it("produces different hashes for different amounts", () => {
    const base: ParsedTransaction = {
      date: "2026-01-15",
      description: "WHOLE FOODS",
      amount: "67.23",
    };
    const different: ParsedTransaction = { ...base, amount: "67.24" };
    expect(generateImportId(base)).not.toBe(generateImportId(different));
  });

  it("produces different hashes for different dates", () => {
    const base: ParsedTransaction = {
      date: "2026-01-15",
      description: "WHOLE FOODS",
      amount: "67.23",
    };
    const different: ParsedTransaction = { ...base, date: "2026-01-16" };
    expect(generateImportId(base)).not.toBe(generateImportId(different));
  });

  it("normalizes description whitespace and case", () => {
    const a: ParsedTransaction = {
      date: "2026-01-15",
      description: "  Amazon.com  ",
      amount: "42.99",
    };
    const b: ParsedTransaction = {
      date: "2026-01-15",
      description: "amazon.com",
      amount: "42.99",
    };
    expect(generateImportId(a)).toBe(generateImportId(b));
  });
});

describe("validateConfirmInput", () => {
  const validTransaction = {
    date: "2026-01-15",
    description: "AMAZON.COM",
    amount: "42.99",
    importId: "hash:abc123",
  };

  it("accepts valid input with all fields", () => {
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [
        { ...validTransaction, merchantName: "Amazon" },
      ],
    });
    expect("accountId" in result).toBe(true);
    if ("accountId" in result) {
      expect(result.accountId).toBe("acc-123");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].merchantName).toBe("Amazon");
    }
  });

  it("accepts valid input with only required fields", () => {
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [validTransaction],
    });
    expect("accountId" in result).toBe(true);
    if ("accountId" in result) {
      expect(result.transactions[0].merchantName).toBeUndefined();
    }
  });

  it("trims merchantName whitespace", () => {
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [{ ...validTransaction, merchantName: "  Amazon  " }],
    });
    expect("accountId" in result).toBe(true);
    if ("accountId" in result) {
      expect(result.transactions[0].merchantName).toBe("Amazon");
    }
  });

  it("treats empty merchantName as undefined", () => {
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [{ ...validTransaction, merchantName: "   " }],
    });
    expect("accountId" in result).toBe(true);
    if ("accountId" in result) {
      expect(result.transactions[0].merchantName).toBeUndefined();
    }
  });

  it("rejects null input", () => {
    expect(validateConfirmInput(null)).toEqual({
      error: "Request body is required",
    });
  });

  it("rejects missing accountId", () => {
    expect(
      validateConfirmInput({ transactions: [validTransaction] })
    ).toEqual({ error: "accountId is required" });
  });

  it("rejects empty transactions array", () => {
    expect(
      validateConfirmInput({ accountId: "acc-123", transactions: [] })
    ).toEqual({
      error: "transactions array is required and must not be empty",
    });
  });

  it("rejects non-array transactions", () => {
    expect(
      validateConfirmInput({ accountId: "acc-123", transactions: "invalid" })
    ).toEqual({
      error: "transactions array is required and must not be empty",
    });
  });

  it("rejects transaction missing date", () => {
    const { date: _, ...noDate } = validTransaction;
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [noDate],
    });
    expect(result).toEqual({
      error: "Transaction at index 0: date is required",
    });
  });

  it("rejects transaction missing description", () => {
    const { description: _, ...noDesc } = validTransaction;
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [noDesc],
    });
    expect(result).toEqual({
      error: "Transaction at index 0: description is required",
    });
  });

  it("rejects transaction missing amount", () => {
    const { amount: _, ...noAmount } = validTransaction;
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [noAmount],
    });
    expect(result).toEqual({
      error: "Transaction at index 0: amount is required",
    });
  });

  it("rejects transaction missing importId", () => {
    const { importId: _, ...noImportId } = validTransaction;
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [noImportId],
    });
    expect(result).toEqual({
      error: "Transaction at index 0: importId is required",
    });
  });

  it("reports correct index for invalid transaction in middle of array", () => {
    const { date: _, ...invalid } = validTransaction;
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [validTransaction, validTransaction, invalid],
    });
    expect(result).toEqual({
      error: "Transaction at index 2: date is required",
    });
  });

  it("validates multiple transactions successfully", () => {
    const result = validateConfirmInput({
      accountId: "acc-123",
      transactions: [
        validTransaction,
        { ...validTransaction, importId: "hash:def456", amount: "100.00" },
      ],
    });
    expect("accountId" in result).toBe(true);
    if ("accountId" in result) {
      expect(result.transactions).toHaveLength(2);
    }
  });
});
