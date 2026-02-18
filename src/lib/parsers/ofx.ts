import type { ParsedTransaction, ParseResult } from "./types";

/** YYYYMMDD... → YYYY-MM-DD (OFX date format, may have timezone suffix) */
function parseOFXDate(date: string): string {
  const clean = date.substring(0, 8);
  return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
}

/**
 * Extract a tag value from an OFX block.
 * Supports both XML-style (<TAG>value</TAG>) and SGML-style (<TAG>value\n).
 */
function extractTag(block: string, tag: string): string | undefined {
  // Try XML-style first: <TAG>value</TAG>
  const xmlMatch = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  if (xmlMatch) return xmlMatch[1].trim();

  // Fall back to SGML-style: <TAG>value (terminated by newline or next tag)
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^\\n<]+)`));
  if (sgmlMatch) return sgmlMatch[1].trim();

  return undefined;
}

export function parseOFX(content: string): ParseResult {
  if (!content.trim()) {
    return { format: "ofx", transactions: [], errors: ["Empty file"] };
  }

  const errors: string[] = [];

  // Extract account ID
  const accountHint = extractTag(content, "ACCTID");

  // Extract all STMTTRN blocks
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const transactions: ParsedTransaction[] = [];
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1];

    const dateRaw = extractTag(block, "DTPOSTED");
    const amountRaw = extractTag(block, "TRNAMT");
    const fitId = extractTag(block, "FITID");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");
    const trnType = extractTag(block, "TRNTYPE");

    if (!dateRaw || !amountRaw) {
      errors.push(
        `Skipped transaction with missing date or amount (FITID: ${fitId ?? "unknown"})`
      );
      continue;
    }

    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) {
      errors.push(`Invalid amount "${amountRaw}" (FITID: ${fitId ?? "unknown"})`);
      continue;
    }

    transactions.push({
      date: parseOFXDate(dateRaw),
      description: name ?? "",
      // OFX: negative = charge (outflow) → negate to match Plaid (positive = outflow)
      amount: (-amount).toFixed(2),
      externalId: fitId,
      memo,
      type: trnType,
    });
  }

  if (transactions.length === 0 && !content.includes("<STMTTRN>")) {
    errors.push("No transaction blocks found in OFX file");
  }

  return { format: "ofx", accountHint, transactions, errors };
}
