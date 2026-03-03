# Branding Polish — Overview

**Date:** 2026-03-02
**Scope:** Visual consistency, color palette, landing page, import UX, sign-in polish
**App URL:** https://really-personal-finance.vercel.app

## Design Goals (from user)
- Replace red/green income/spending colors with shaded purples matching the home page palette
- Sleeker CTAs on the import/upload page
- Clean up the import page overall
- Better branding on the landing page
- The indigo/violet palette on the home page is the north star

## Phase Docs

| Phase | Title | Impact | Effort | Status |
|-------|-------|--------|--------|--------|
| 01 | Purple palette for income/spending | High | Low | COMPLETE (PR #20) |
| 02 | Elevate the import page UX | High | Medium | COMPLETE (PR #21) |
| 03 | Enrich the landing page | High | Medium | COMPLETE (PR #22) |
| 04 | Polish the sign-in page | Medium | Low | COMPLETE (PR #23) |

## Dependency Graph

```
01 (Purple Palette)  ──┐
                       ├──> 02 (Import Page) depends on 01 for new color tokens
                       │
03 (Landing Page)      │   independent — can run in parallel with 01 or 02
04 (Sign-in Polish)    │   independent — can run in parallel with anything
```

- **Phase 01** must be completed first — it introduces the `--color-income` and `--color-spending` tokens used by Phase 02.
- **Phases 03 and 04** touch completely separate files and can run in parallel with each other or with 01/02.

## Parallel-Safe Groups
- Group A: Phase 01 -> Phase 02 (sequential)
- Group B: Phase 03 (independent)
- Group C: Phase 04 (independent)

## Total Estimated Effort
~4 PRs, each small-to-medium. Phase 01 is the smallest (token + class changes). Phase 03 is the largest (new landing page sections).
