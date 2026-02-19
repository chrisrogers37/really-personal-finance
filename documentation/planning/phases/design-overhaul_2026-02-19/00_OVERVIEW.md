# Design Overhaul — Overview

**Session:** design-overhaul
**Date:** 2026-02-19
**Scope:** Whole-app design review and UI/UX overhaul
**App URL:** https://really-personal-finance-chrisrogers37.vercel.app/
**Screenshots:** `/tmp/design-review/`

---

## Design Intent

Transform the app from a generic light-mode "AI vibe-coded" template to a sleek, cutting-edge fintech aesthetic inspired by Robinhood/Public.com but distinctly its own.

**Target palette:** Near-black (#0c0a14) + Indigo (#6366f1) / Violet accents
**Mode:** Dark-first (dark is the only mode)
**Effects:** Glassmorphism cards, animations, micro-interactions
**Feel:** Minimal, clean, high-tech, cutting edge, sleek, trustworthy

---

## Phase Documents

| Phase | Document | Summary | Impact | Effort |
|-------|----------|---------|--------|--------|
| 01 | `01_dark-first-design-system.md` | ✅ COMPLETE — Establish CSS tokens + dark palette. Replace all hardcoded light-mode colors across every file. | High | High |
| 02 | `02_glassmorphism-cards.md` | ✅ COMPLETE — Glassmorphism cards with backdrop-blur, updated tokens, auth variant. | High | Low-Med |
| 03 | `03_landing-page-redesign.md` | ✅ COMPLETE (PR #14) — Complete landing page rewrite. Gradient hero, Lucide icons, glassmorphism feature cards, trust section. | High | Medium |
| 04 | `04_auth-pages-redesign.md` | ✅ COMPLETE (PR #15) — Restyle signin, verify, error pages. Replace emoji icons with Lucide SVGs. Fix mobile overflow. | Medium | Low |
| 05 | `05_dark-themed-charts.md` | ✅ COMPLETE (PR #16) — Retheme all Recharts components for dark backgrounds. Dark grids, styled tooltips, themed axes. | High | Medium |
| 06 | `06_responsive-sidebar.md` | ✅ COMPLETE (PR #17) — Collapsible sidebar with mobile drawer navigation. Hamburger menu, slide-out overlay. | High | Medium |
| 07 | `07_animations-micro-interactions.md` | CSS keyframe animations, page entrance effects, card hover glow, button press feedback, shimmer loaders. | Medium | Medium |

---

## Dependency Graph

```
Phase 01 (design tokens + dark palette)
  ├── Phase 02 (glassmorphism cards)
  │     ├── Phase 03 (landing page redesign)
  │     └── Phase 04 (auth pages redesign)
  ├── Phase 05 (dark-themed charts)
  ├── Phase 06 (responsive sidebar)
  └── Phase 07 (animations)
```

**Phase 01** must be completed first — everything depends on the dark palette being in place.

**Phase 02** depends on Phase 01 (needs dark backgrounds for glass effect to work).

**Phases 03 & 04** depend on Phase 01 + 02 (use both the palette and glassmorphism pattern).

**Phases 05 & 06** depend on Phase 01 only (charts and sidebar don't require glassmorphism to land).

**Phase 07** depends on Phase 01, ideally after Phase 02 (animations apply to glass cards).

---

## Parallel Execution

Phases that touch **disjoint files** and can safely run in parallel after their dependencies are met:

- **Phase 03** (landing page: `src/app/page.tsx`) and **Phase 04** (auth pages: `src/app/auth/**`) touch completely different files.
- **Phase 05** (chart components: `src/components/*-chart.tsx`) and **Phase 06** (sidebar: `src/app/dashboard/layout.tsx`) touch completely different files.
- **Phase 07** (animations: `globals.css` + class additions) touches many files and should run last.

**Recommended execution order:**
1. Phase 01 (foundation)
2. Phase 02 (glassmorphism)
3. Phases 03 + 04 in parallel (landing + auth pages)
4. Phases 05 + 06 in parallel (charts + sidebar)
5. Phase 07 (animations — touches many files, run last)

---

## Total Effort Summary

- **Files modified:** ~21 files across all phases
- **New dependencies:** None (all icons from existing lucide-react, all CSS-only animations)
- **Risk:** Low across all phases (purely visual changes, no logic modifications)
- **Phases:** 7 PRs

---

## Archive Convention

When all phases are complete, move this directory:
```bash
git mv documentation/planning/phases/design-overhaul_2026-02-19/ documentation/archive/design-overhaul_2026-02-19/
```

This is handled by `/implement-plan` — this overview only documents plans.
