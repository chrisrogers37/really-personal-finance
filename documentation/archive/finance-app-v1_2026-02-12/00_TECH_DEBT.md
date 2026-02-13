# Tech Debt Inventory: Really Personal Finance

**Session:** finance-app-v1
**Date:** 2026-02-12
**Codebase:** Next.js 16 + Drizzle ORM + Neon Postgres personal finance tracker

---

## Executive Summary

41 source files scanned. 17 findings across 3 severity levels. Zero test coverage is the single biggest gap. Two data-corruption risks exist in the SCD2 update logic. The Telegram webhook is unauthenticated. Several code duplication patterns exist across frontend pages and backend utilities.

---

## Complete Inventory

### HIGH PRIORITY (5 findings)

| # | Finding | Blast Radius | Files Affected | Remediation |
|---|---------|-------------|----------------|-------------|
| H1 | **Zero test coverage** | All code | 0 test files exist | `05_test-infrastructure.md` |
| H2 | **SCD2 updates not in DB transactions** | User data corruption | `src/lib/scd2.ts`, `src/lib/auth.ts` | `01_db-transaction-safety.md` |
| H3 | **No error handling in transaction sync cron** | All users lose daily sync | `src/app/api/cron/sync-transactions/route.ts` | `02_cron-resilience.md` |
| H4 | **Telegram webhook unauthenticated** | Arbitrary DB writes | `src/app/api/telegram/webhook/route.ts` | `03_security-hardening.md` |
| H5 | **No bounds checking on limit/offset** | Memory exhaustion | `src/app/api/transactions/route.ts` | `03_security-hardening.md` |

### MEDIUM PRIORITY (8 findings)

| # | Finding | Files Affected | Remediation |
|---|---------|----------------|-------------|
| M1 | Duplicated SCD2 update logic | `auth.ts`, `scd2.ts` | `01_db-transaction-safety.md` |
| M2 | Duplicated `formatCurrency` function | `utils.ts`, `telegram.ts` | `04_code-deduplication.md` |
| M3 | Duplicated `Transaction` interface | `transaction-table.tsx`, `transactions/page.tsx` | `04_code-deduplication.md` |
| M4 | Duplicated date filter UI | `categories/page.tsx`, `merchants/page.tsx` | `04_code-deduplication.md` |
| M5 | Sequential alert processing (timeout risk) | `src/lib/alerts.ts` | `02_cron-resilience.md` |
| M6 | N+1 insert pattern in transaction sync | `sync-transactions/route.ts` | `02_cron-resilience.md` |
| M7 | Dead code: `GET_HISTORY` stub | `src/app/api/profile/route.ts` | `04_code-deduplication.md` |
| M8 | PlaidLink side effect during render | `src/components/plaid-link.tsx` | `04_code-deduplication.md` |

### LOW PRIORITY (4 findings)

| # | Finding | Notes |
|---|---------|-------|
| L1 | `next-auth` beta version (5.0.0-beta.30) | Monitor for stable release |
| L2 | Duplicated CategoryData/MerchantData interfaces | Addressed in `04_code-deduplication.md` |
| L3 | Hardcoded USD currency | Future internationalization concern |
| L4 | Dependencies not installed (node_modules missing) | Run `npm install` |

---

## Severity Scoring

| Factor | H1 | H2 | H3 | H4 | H5 |
|--------|----|----|----|----|-----|
| Blast Radius | 5 | 4 | 4 | 3 | 2 |
| Complexity to Fix | 4 | 2 | 3 | 2 | 1 |
| Risk if Unfixed | 5 | 5 | 4 | 4 | 3 |
| **Total** | **14** | **11** | **11** | **9** | **6** |

Scale: 1 (low) to 5 (high)

---

## Prioritized Remediation Order

| Phase | Plan Document | Addresses | Est. Effort | Risk |
|-------|--------------|-----------|-------------|------|
| 01 | `01_db-transaction-safety.md` | H2, M1 | 2-3 hrs | Medium |
| 02 | `02_cron-resilience.md` | H3, M5, M6 | 3-4 hrs | Medium |
| 03 | `03_security-hardening.md` | H4, H5 | 2-3 hrs | Medium |
| 04 | `04_code-deduplication.md` | M2, M3, M4, M7, M8, L2 | 2-3 hrs | Low |
| 05 | `05_test-infrastructure.md` | H1 | 3-4 hrs | Low |

---

## Dependency Matrix

```
01_db-transaction-safety
  blocks: nothing
  blocked by: nothing

02_cron-resilience
  blocks: nothing
  blocked by: nothing

03_security-hardening
  blocks: nothing
  blocked by: nothing

04_code-deduplication
  blocks: nothing
  blocked by: 01 (scd2.ts changes must merge first)

05_test-infrastructure
  blocks: nothing
  blocked by: 01, 04 (tests should target final code shape)
```

## Parallelization Guide

```
Can run in parallel:
  - 01, 02, 03 (touch disjoint file sets)

Must be sequential:
  - 04 after 01 (both modify src/lib/scd2.ts and src/lib/auth.ts)
  - 05 after 01 and 04 (tests should cover final code)
```

---

## File Impact Matrix

Shows which phases modify which files. Ensures no parallel conflicts.

| File | 01 | 02 | 03 | 04 | 05 |
|------|----|----|----|----|-----|
| `src/lib/scd2.ts` | W | | | | |
| `src/lib/auth.ts` | W | | | | |
| `src/app/api/cron/sync-transactions/route.ts` | | W | | | |
| `src/app/api/cron/send-alerts/route.ts` | | W | | | |
| `src/lib/alerts.ts` | | W | W* | | |
| `src/app/api/telegram/webhook/route.ts` | | | W | | |
| `src/app/api/transactions/route.ts` | | | W | | |
| `src/app/api/analytics/*.ts` (3 files) | | | W | | |
| `src/lib/validation.ts` | | | **NEW** | | |
| `.env.example` | | | W | | |
| `src/lib/telegram.ts` | | | | W | |
| `src/lib/utils.ts` | | | | | |
| `src/types/index.ts` | | | | **NEW** | |
| `src/components/date-range-filter.tsx` | | | | **NEW** | |
| `src/components/plaid-link.tsx` | | | | W | |
| `src/components/transaction-table.tsx` | | | | W | |
| `src/app/dashboard/categories/page.tsx` | | | | W | |
| `src/app/dashboard/merchants/page.tsx` | | | | W | |
| `src/app/dashboard/transactions/page.tsx` | | | | W | |
| `src/app/api/profile/route.ts` | | | | W | |
| `vitest.config.ts` | | | | | **NEW** |
| `src/__tests__/*.test.ts` | | | | | **NEW** |
| `package.json` | | | | | W |

W = modified, NEW = created, W* = import change only
