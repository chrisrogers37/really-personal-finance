import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseTransactionFile } from "@/lib/parsers";

const TEST_DATA = join(process.cwd(), "test_data");

function readTestFile(relativePath: string): string {
  return readFileSync(join(TEST_DATA, relativePath), "utf-8");
}

describe("Amex CSV parser", () => {
  const content = readTestFile("american_express/activity.csv");
  const result = parseTransactionFile(content, "activity.csv");

  it("detects amex-csv format", () => {
    expect(result.format).toBe("amex-csv");
  });

  it("parses all 40 transactions", () => {
    expect(result.transactions).toHaveLength(40);
  });

  it("has no parse errors", () => {
    expect(result.errors).toHaveLength(0);
  });

  it("converts dates to YYYY-MM-DD", () => {
    // First row: 02/14/2026 → 2026-02-14
    expect(result.transactions[0].date).toBe("2026-02-14");
  });

  it("keeps positive charges as positive (Plaid convention)", () => {
    // DELTA AIR LINES: 35.00 charge → positive outflow
    expect(result.transactions[0].amount).toBe("35.00");
  });

  it("keeps negative credits as negative (Plaid convention)", () => {
    // Platinum Walmart+ Credit: -14.10
    const credit = result.transactions.find((t) =>
      t.description.includes("Platinum Walmart+ Credit")
    );
    expect(credit).toBeDefined();
    expect(credit!.amount).toBe("-14.10");
  });

  it("preserves description text", () => {
    expect(result.transactions[0].description).toBe(
      "DELTA AIR LINES     ATLANTA"
    );
  });
});

describe("Amex QFX parser", () => {
  const content = readTestFile("american_express/activity.qfx");
  const result = parseTransactionFile(content, "activity.qfx");

  it("detects ofx format", () => {
    expect(result.format).toBe("ofx");
  });

  it("parses same count as CSV (40)", () => {
    expect(result.transactions).toHaveLength(40);
  });

  it("has no parse errors", () => {
    expect(result.errors).toHaveLength(0);
  });

  it("extracts FITID as externalId", () => {
    expect(result.transactions[0].externalId).toBe("320260450232984846");
  });

  it("negates OFX amounts to match Plaid convention", () => {
    // OFX: <TRNAMT>-35.00 (charge) → positive 35.00 after negation
    expect(result.transactions[0].amount).toBe("35.00");
  });

  it("converts OFX dates to YYYY-MM-DD", () => {
    // 20260214000000.000[-7:MST] → 2026-02-14
    expect(result.transactions[0].date).toBe("2026-02-14");
  });

  it("extracts accountHint from ACCTID", () => {
    expect(result.accountHint).toBeDefined();
    expect(result.accountHint!.length).toBeGreaterThan(0);
  });

  it("extracts TRNTYPE", () => {
    expect(result.transactions[0].type).toBe("DEBIT");
  });
});

describe("Amex QBO parser", () => {
  const content = readTestFile("american_express/activity.qbo");
  const result = parseTransactionFile(content, "activity.qbo");

  it("detects ofx format", () => {
    expect(result.format).toBe("ofx");
  });

  it("parses same count as QFX (40)", () => {
    expect(result.transactions).toHaveLength(40);
  });

  it("produces identical output to QFX", () => {
    const qfxContent = readTestFile("american_express/activity.qfx");
    const qfxResult = parseTransactionFile(qfxContent, "activity.qfx");

    // Same transactions, same amounts, same FITIDs
    expect(result.transactions.length).toBe(qfxResult.transactions.length);
    for (let i = 0; i < result.transactions.length; i++) {
      expect(result.transactions[i].amount).toBe(
        qfxResult.transactions[i].amount
      );
      expect(result.transactions[i].externalId).toBe(
        qfxResult.transactions[i].externalId
      );
      expect(result.transactions[i].date).toBe(qfxResult.transactions[i].date);
    }
  });
});

describe("BofA CSV parser", () => {
  const content = readTestFile("bank_of_america/stmt.csv");
  const result = parseTransactionFile(content, "stmt.csv");

  it("detects bofa-csv format", () => {
    expect(result.format).toBe("bofa-csv");
  });

  it("skips summary header rows", () => {
    expect(result.skippedRows).toBe(6); // 5 summary lines + 1 blank
  });

  it("skips Beginning balance row", () => {
    const beginningBalance = result.transactions.find((t) =>
      t.description.toLowerCase().includes("beginning balance")
    );
    expect(beginningBalance).toBeUndefined();
  });

  it("parses 16 real transactions", () => {
    expect(result.transactions).toHaveLength(16);
  });

  it("has no parse errors", () => {
    expect(result.errors).toHaveLength(0);
  });

  it("negates amounts to match Plaid convention", () => {
    // BofA: -50.00 (debit/outflow) → positive 50.00 after negation
    const transfer = result.transactions.find((t) =>
      t.description.includes("Online scheduled transfer")
    );
    expect(transfer).toBeDefined();
    expect(transfer!.amount).toBe("50.00");
  });

  it("handles credit amounts with comma thousands separator", () => {
    // BofA: 3,247.50 (credit/inflow) → negative -3247.50 after negation
    const zelle = result.transactions.find((t) =>
      t.description.includes("Zelle payment")
    );
    expect(zelle).toBeDefined();
    expect(zelle!.amount).toBe("-3247.50");
  });

  it("converts dates to YYYY-MM-DD", () => {
    expect(result.transactions[0].date).toBe("2026-01-02");
  });
});

describe("Auto-detection", () => {
  it("routes .qfx to OFX parser", () => {
    const content = readTestFile("american_express/activity.qfx");
    const result = parseTransactionFile(content, "export.qfx");
    expect(result.format).toBe("ofx");
  });

  it("routes .qbo to OFX parser", () => {
    const content = readTestFile("american_express/activity.qbo");
    const result = parseTransactionFile(content, "export.qbo");
    expect(result.format).toBe("ofx");
  });

  it("routes .csv to CSV parser", () => {
    const content = readTestFile("american_express/activity.csv");
    const result = parseTransactionFile(content, "export.csv");
    expect(result.format).toBe("amex-csv");
  });

  it("detects OFX by content when extension is ambiguous", () => {
    const content = readTestFile("american_express/activity.qfx");
    const result = parseTransactionFile(content, "export.txt");
    expect(result.format).toBe("ofx");
  });
});

describe("Edge cases", () => {
  it("returns error for empty file", () => {
    const result = parseTransactionFile("", "empty.csv");
    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toContain("Empty file");
  });

  it("returns error for empty OFX file", () => {
    const result = parseTransactionFile("", "empty.ofx");
    expect(result.transactions).toHaveLength(0);
    expect(result.errors).toContain("Empty file");
  });

  it("returns error for unknown CSV format", () => {
    const result = parseTransactionFile(
      "Foo,Bar,Baz\n1,2,3",
      "unknown.csv"
    );
    expect(result.transactions).toHaveLength(0);
    expect(result.errors[0]).toContain("Unknown CSV format");
  });

  it("handles truncated OFX gracefully", () => {
    const truncated =
      '<?xml version="1.0"?><OFX><STMTTRN><DTPOSTED>20260214</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>123</FITID><NAME>TEST</NAME></STMTTRN>';
    const result = parseTransactionFile(truncated, "partial.ofx");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount).toBe("10.00");
  });
});
