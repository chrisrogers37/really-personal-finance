# Transaction Import Feature — Overview

**Session:** transaction-import
**Date:** 2026-02-17
**Scope:** CSV and OFX/QFX import as a first-class alternative to Plaid
**Status:** ✅ COMPLETE

## Context

Plaid sandbox works but production approval is uncertain for a personal-use app. Users need a way to import real transaction data from bank exports. Target banks: American Express and Bank of America. Feature should be permanent and robust — not throwaway.

## User Intent

- First-class feature alongside Plaid, also serves as bridge until Plaid production
- Ad-hoc import frequency (no automation)
- Drag-and-drop upload with smart format detection
- Preview before import with duplicate detection + user confirmation
- Transactions tagged with source (Plaid vs Import)
- Parse bank-provided categories where available

## Supported Formats (from real export samples)

| Source | Format | Key Fields | Dedup Strategy |
|--------|--------|-----------|----------------|
| Amex CSV | `Date,Description,Amount` | MM/DD/YYYY, positive=charge | date+desc+amount hash |
| Amex QFX/QBO | OFX XML with `<STMTTRN>` | FITID (unique ID), YYYYMMDD | FITID (reliable) |
| BofA CSV | `Date,Description,Amount,Running Bal.` | MM/DD/YYYY, 5-line header to skip | date+desc+amount hash |

## Phase Docs

| # | Phase | PR Scope | Effort | Dependencies |
|---|-------|----------|--------|-------------|
| 01 | Schema Evolution | Add `source` column, make `plaidTransactionId` nullable, add manual accounts support | Low | None | ✅ PR #7 |
| 02 | File Parsers | CSV + OFX parser library with format auto-detection | Medium | None | ✅ PR #8 |
| 03 | Manual Accounts | API + UI for creating non-Plaid accounts | Low | Phase 01 | ✅ PR #9 |
| 04 | Import API + Dedup | Upload endpoint, preview, duplicate detection, confirm+insert | Medium | Phases 01, 02, 03 | ✅ PR #10 |
| 05 | Import UI | Drag-and-drop upload component, preview table, dedup confirmation | Medium | Phase 04 | ✅ PR #11 |

## Dependency Graph

```
Phase 01 (schema) ──┬──> Phase 03 (manual accounts) ──┐
                    │                                   ├──> Phase 04 (import API) ──> Phase 05 (import UI)
Phase 02 (parsers) ─┴──────────────────────────────────┘
```

**Phases 01 and 02 can run in parallel** (they touch disjoint files).

## Total Estimated Effort

~3-4 focused sessions across all 5 phases.
