import { parseCSV } from "./csv";
import { parseOFX } from "./ofx";
import type { ParseResult } from "./types";

export type { ParsedTransaction, ParseResult } from "./types";

/**
 * Auto-detect file format and parse transactions.
 * Detection priority:
 * 1. File extension (.qfx, .qbo, .ofx → OFX parser)
 * 2. Content sniffing (starts with "<?xml" or contains "<OFX>" → OFX parser)
 * 3. Default to CSV parser
 */
export function parseTransactionFile(
  content: string,
  filename: string
): ParseResult {
  const ext = filename.toLowerCase().split(".").pop();

  // OFX-family by extension
  if (ext === "qfx" || ext === "qbo" || ext === "ofx") {
    return parseOFX(content);
  }

  // OFX-family by content sniffing
  const trimmed = content.trimStart();
  if (trimmed.startsWith("<?xml") || trimmed.includes("<OFX>")) {
    return parseOFX(content);
  }

  // CSV
  return parseCSV(content, filename);
}
