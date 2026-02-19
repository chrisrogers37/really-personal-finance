

I'll start by reading the current globals.css and exploring the key component files to understand the current state of animations and the app structure.

Now let me read the remaining component files and layout files.

Now let me read the layout files and remaining pages.

Now let me read the remaining auth pages and the profile page.

Let me check if there's a tailwind config or postcss config, and also verify the Tailwind version in use.

I now have a thorough understanding of the entire codebase, its current animation state, all component files, and the Tailwind 4 configuration approach. Let me compile the complete implementation plan.

---

# Phase 07 -- Animations and Micro-Interactions

**Status:** ✅ COMPLETE
**Started:** 2026-02-19
**Completed:** 2026-02-19
**PR:** #18

**PR Title:** `feat: add animations and micro-interactions for polished UX`

**Risk:** Medium -- animations can cause performance regressions (layout jank, paint storms) and accessibility violations if `prefers-reduced-motion` is not respected.

**Effort:** Medium -- primarily CSS additions to `globals.css` plus class-string changes across 15 files. No new dependencies. No new components.

**Files Modified (15):**
1. `src/app/globals.css`
2. `src/app/page.tsx`
3. `src/app/layout.tsx`
4. `src/app/dashboard/layout.tsx`
5. `src/app/dashboard/page.tsx`
6. `src/app/dashboard/transactions/page.tsx`
7. `src/app/dashboard/categories/page.tsx`
8. `src/app/dashboard/merchants/page.tsx`
9. `src/app/dashboard/import/page.tsx`
10. `src/app/auth/signin/page.tsx`
11. `src/app/auth/verify/page.tsx`
12. `src/app/auth/error/page.tsx`
13. `src/app/profile/page.tsx`
14. `src/components/transaction-table.tsx`
15. `src/components/file-dropzone.tsx`

---

## 1. Context

The app currently has almost no motion: a single `animate-pulse` on skeleton loaders in `transaction-table.tsx`, a `transition-colors duration-200` on the file dropzone, and `transition-colors` on the sidebar nav items. Every other interaction is instant -- no entrance animations, no hover feedback, no press states.

Motion design is what separates a template from a product. Subtle, well-timed animations communicate that the interface is alive and responsive. The target is not flashy or distracting -- it is precise, GPU-accelerated transitions that make the app feel crafted. Every animation uses only `transform` and `opacity` (compositable properties), ensuring 60fps performance even on low-end devices.

---

## 2. Visual Specification

### 2.1 Keyframe Animations

| Name | Duration | Easing | Trigger | Applied To |
|------|----------|--------|---------|------------|
| `fadeInUp` | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Mount / page load | Main content wrappers on every page |
| `fadeIn` | 300ms | `ease-out` | Mount / data load | Chart containers, overlays, success/error banners |
| `scaleIn` | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Mount | Auth cards, profile card, summary cards |
| `shimmer` | 1.5s | `linear` (infinite) | While loading | Skeleton loaders (replaces `animate-pulse`) |
| `glow` | 2s | `ease-in-out` (infinite) | Always | Accent elements (optional, used sparingly) |

### 2.2 Transition Effects

| Effect | Duration | Easing | Trigger | Applied To |
|--------|----------|--------|---------|------------|
| Card hover lift | 200ms | `ease-out` | `hover` | All glass/content cards |
| Card hover glow | 200ms | `ease-out` | `hover` | Interactive cards (summary cards) |
| Button press | 150ms | `ease-out` | `active` | All buttons |
| CTA hover glow | 200ms | `ease-out` | `hover` | Primary action buttons |
| Nav item transition | 150ms | default | `hover` / active state | Sidebar nav links |
| Table row hover | 150ms | default | `hover` | Transaction/merchant/category table rows |
| Dropzone state change | 200ms | default | drag enter/leave | File dropzone border + background |

### 2.3 Stagger Delays

The 4 summary cards on the dashboard page use `animation-delay` to create a staggered entrance. Each card gets `animate-scale-in` with delays of `0ms`, `75ms`, `150ms`, `225ms`. The `animation-fill-mode` is `backwards` so cards are invisible before their delay fires.

---

## 3. Dependencies

- **Depends on:** Phase 01 (dark palette), Phase 02 (glassmorphism cards). ✅ All dependencies merged.
- **All prior phases (01-06) are complete.** The file-by-file changes in Section 4.2 were written pre-Phase 01 and reference stale light-mode classes. Implementation uses the CURRENT dark-theme codebase as the baseline.

**Challenge Round Resolutions (2026-02-19):**
- Card hover: Use `hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5` (glass brightening) instead of `hover:shadow-md` (invisible on dark backgrounds)
- Glow keyframe: Include in globals.css for future accent use, even though no element applies it yet
- Dashboard layout: Apply `animate-fade-in-up` per-page (not on layout `<main>`) since Phase 06 rewrote the layout
- `src/app/layout.tsx`: Dropped from file list (no changes needed)
- All "before" code in Section 4.2 is stale — implementation references current codebase directly

---

## 4. Detailed Implementation Plan

### 4.1 globals.css -- Keyframes and Utility Definitions

This is the core of the phase. All animations are defined here and consumed via Tailwind utility classes.

**Current file** (`/Users/chris/Projects/really-personal-finance/src/app/globals.css`) is 27 lines. The additions go after the existing content.

#### 4.1.1 Add keyframes inside a `prefers-reduced-motion` media query

All keyframes are wrapped in `@media (prefers-reduced-motion: no-preference)` so that users who prefer reduced motion see no animations at all. A fallback `@media (prefers-reduced-motion: reduce)` block sets all custom animation utilities to `animation: none`.

```css
/* ============================================
   Phase 07: Animations & Micro-Interactions
   ============================================ */

/* Keyframes — only active when user has no motion preference */
@media (prefers-reduced-motion: no-preference) {
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 8px rgba(99, 102, 241, 0.15);
    }
    50% {
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
    }
  }
}
```

#### 4.1.2 Add Tailwind animation utilities via `@theme inline`

Tailwind CSS 4 uses `@theme inline` to register custom theme tokens. The existing `@theme inline` block at line 8 of `globals.css` should be extended with animation tokens.

Add these properties inside the existing `@theme inline { ... }` block:

```css
@theme inline {
  /* existing tokens */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Phase 07: Animation tokens */
  --animate-fade-in-up: fadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-fade-in: fadeIn 300ms ease-out both;
  --animate-scale-in: scaleIn 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
  --animate-shimmer: shimmer 1.5s linear infinite;
  --animate-glow: glow 2s ease-in-out infinite;
}
```

This registers `animate-fade-in-up`, `animate-fade-in`, `animate-scale-in`, `animate-shimmer`, and `animate-glow` as valid Tailwind classes.

#### 4.1.3 Add a shimmer utility class

The shimmer animation requires a specific background-gradient setup that cannot be expressed purely through Tailwind utility composition. Define a utility:

```css
@utility shimmer-bg {
  background: linear-gradient(
    90deg,
    rgb(255 255 255 / 0.03) 25%,
    rgb(255 255 255 / 0.08) 50%,
    rgb(255 255 255 / 0.03) 75%
  );
  background-size: 200% 100%;
}
```

**Note:** For the current light theme, use:

```css
@utility shimmer-bg {
  background: linear-gradient(
    90deg,
    rgb(0 0 0 / 0.03) 25%,
    rgb(0 0 0 / 0.06) 50%,
    rgb(0 0 0 / 0.03) 75%
  );
  background-size: 200% 100%;
}
```

#### 4.1.4 Reduced motion override

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up,
  .animate-fade-in,
  .animate-scale-in,
  .animate-shimmer,
  .animate-glow {
    animation: none !important;
  }
}
```

### 4.2 File-by-File Component Changes

---

#### 4.2.1 `src/app/page.tsx` -- Landing Page

**Goal:** Hero fades in from below on mount. Feature cards stagger their entrance. CTA button gets press feedback and glow.

**Changes:**

**Line 21** -- Main content wrapper `<div className="text-center max-w-2xl mx-auto">`:
- Add `animate-fade-in-up` to this div.
- **Before:** `className="text-center max-w-2xl mx-auto"`
- **After:** `className="text-center max-w-2xl mx-auto animate-fade-in-up"`

**Line 31** -- "Get Started" CTA button:
- Add `transition-all duration-150 active:scale-95 hover:shadow-lg` to the existing classes.
- **Before:** `className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"`
- **After:** `className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium transition-all duration-150 active:scale-95 hover:shadow-lg"`

**Line 12** -- Header "Sign in" button:
- Add `transition-all duration-150 active:scale-95`.
- **Before:** `className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"`
- **After:** `className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all duration-150 active:scale-95"`

**Lines 39, 49, 59** -- The 3 feature cards (`<div className="bg-white p-6 rounded-xl border shadow-sm">`):
- Add `animate-scale-in` with staggered delays, plus hover transition.
- Card 1: `className="bg-white p-6 rounded-xl border shadow-sm animate-scale-in transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"` with inline `style={{ animationDelay: "100ms" }}`
- Card 2: same with `style={{ animationDelay: "175ms" }}`
- Card 3: same with `style={{ animationDelay: "250ms" }}`

**Line 70** -- Privacy notice card:
- Add `animate-fade-in` with a delay.
- `className="mt-20 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center animate-fade-in"` with `style={{ animationDelay: "400ms" }}`

---

#### 4.2.2 `src/app/dashboard/layout.tsx` -- Sidebar Navigation

**Goal:** Smooth nav transitions. Active state has a polished transition. Sign-out button has hover transition.

**Changes:**

**Line 54** -- Nav link `cn(...)` call. The existing `transition-colors` becomes `transition-all duration-150`:
- **Before:** `"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"`
- **After:** `"flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"`

**Line 70** -- Profile link:
- Add `transition-all duration-150`.
- **Before:** `className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"`
- **After:** `className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all duration-150"`

**Line 77** -- Sign out button:
- Add `transition-all duration-150`.
- **Before:** `className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 w-full"`
- **After:** `className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 w-full transition-all duration-150"`

**Line 86** -- Main content area:
- Add `animate-fade-in-up` to the main content wrapper so page content animates in when navigating between dashboard sections.
- **Before:** `<main className="flex-1 p-8 overflow-auto">{children}</main>`
- **After:** `<main className="flex-1 p-8 overflow-auto animate-fade-in-up">{children}</main>`

**Note:** Because this is a layout component and `children` change via client-side navigation, the `animate-fade-in-up` on `<main>` will fire on initial mount only. This is the desired behavior -- a single entrance animation when the dashboard loads, not on every sub-page navigation. If per-page entrance animation is desired, apply `animate-fade-in-up` to each page's root wrapper instead (covered below).

**Revised approach:** Remove `animate-fade-in-up` from the layout `<main>` and instead apply it to each individual page's outermost wrapper div. This ensures the animation replays on each client-side navigation because the page component remounts.

---

#### 4.2.3 `src/app/dashboard/page.tsx` -- Dashboard Overview

**Goal:** Page fades in. Summary cards stagger. Chart container fades in when data loads.

**Changes:**

**Line 41** -- Root wrapper `<div className="space-y-8">`:
- **After:** `className="space-y-8 animate-fade-in-up"`

**Lines 52-83** -- The 4 summary cards. Each `<div className="bg-white p-6 rounded-xl border shadow-sm">` gets:
- `animate-scale-in transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`
- Staggered via inline `style`:
  - Card 1 (This Month Income, line 52): `style={{ animationDelay: "50ms" }}`
  - Card 2 (This Month Spending, line 58): `style={{ animationDelay: "125ms" }}`
  - Card 3 (This Month Net, line 64): `style={{ animationDelay: "200ms" }}`
  - Card 4 (All-Time Net, line 74): `style={{ animationDelay: "275ms" }}`

**Example card (line 52):**
- **Before:** `<div className="bg-white p-6 rounded-xl border shadow-sm">`
- **After:** `<div className="bg-white p-6 rounded-xl border shadow-sm animate-scale-in transition-all duration-200 hover:shadow-md hover:-translate-y-0.5" style={{ animationDelay: "50ms" }}>`

**Line 87** -- Chart container `<div className="bg-white p-6 rounded-xl border shadow-sm">`:
- Add `animate-fade-in transition-all duration-200 hover:shadow-md`.
- **After:** `className="bg-white p-6 rounded-xl border shadow-sm animate-fade-in transition-all duration-200 hover:shadow-md"` with `style={{ animationDelay: "350ms" }}`

---

#### 4.2.4 `src/app/dashboard/transactions/page.tsx` -- Transactions Page

**Goal:** Page entrance animation. Filter card and table card get hover transitions. Pagination buttons get press feedback.

**Changes:**

**Line 45** -- Root wrapper `<div className="space-y-6">`:
- **After:** `className="space-y-6 animate-fade-in-up"`

**Line 52** -- Filter card `<div className="bg-white p-4 rounded-xl border shadow-sm">`:
- Add `transition-all duration-200 hover:shadow-md`.
- **After:** `className="bg-white p-4 rounded-xl border shadow-sm transition-all duration-200"`

**Line 116** -- Table card `<div className="bg-white rounded-xl border shadow-sm p-4">`:
- Add `animate-fade-in`.
- **After:** `className="bg-white rounded-xl border shadow-sm p-4 animate-fade-in"`

**Lines 122, 132** -- "Previous" and "Next" pagination buttons:
- Add `transition-all duration-150 active:scale-95` to both.
- **Before (line 124):** `className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"`
- **After:** `className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"`

---

#### 4.2.5 `src/app/dashboard/categories/page.tsx` -- Categories Page

**Changes:**

**Line 43** -- Root wrapper `<div className="space-y-6">`:
- **After:** `className="space-y-6 animate-fade-in-up"`

**Line 61** -- Chart card `<div className="bg-white p-6 rounded-xl border shadow-sm">`:
- Add `animate-fade-in transition-all duration-200 hover:shadow-md`.
- **After:** `className="bg-white p-6 rounded-xl border shadow-sm animate-fade-in transition-all duration-200 hover:shadow-md"` with `style={{ animationDelay: "100ms" }}`

---

#### 4.2.6 `src/app/dashboard/merchants/page.tsx` -- Merchants Page

**Changes:**

**Line 44** -- Root wrapper `<div className="space-y-6">`:
- **After:** `className="space-y-6 animate-fade-in-up"`

**Line 62** -- Chart card `<div className="bg-white p-6 rounded-xl border shadow-sm">`:
- Add `animate-fade-in transition-all duration-200 hover:shadow-md`.
- **After:** `className="bg-white p-6 rounded-xl border shadow-sm animate-fade-in transition-all duration-200 hover:shadow-md"` with `style={{ animationDelay: "100ms" }}`

---

#### 4.2.7 `src/app/dashboard/import/page.tsx` -- Import Page

**Changes:**

**Line 124** -- Root wrapper `<div className="max-w-4xl mx-auto">`:
- **After:** `className="max-w-4xl mx-auto animate-fade-in-up"`

**Line 132** -- Error banner `<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">`:
- Add `animate-fade-in`.
- **After:** `className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 animate-fade-in"`

**Line 224** -- Success state `<div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">`:
- Add `animate-scale-in`.
- **After:** `className="bg-green-50 border border-green-200 p-6 rounded-xl text-center animate-scale-in"`

**Line 203** -- Create account button:
- Add `transition-all duration-150 active:scale-95`.
- **Before:** `className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50"`
- **After:** `className="px-4 py-2 bg-gray-800 text-white rounded disabled:opacity-50 transition-all duration-150 active:scale-95"`

**Lines 235, 241** -- "Import more" and "View transactions" buttons:
- Add `transition-all duration-150 active:scale-95` to both.

---

#### 4.2.8 `src/components/transaction-table.tsx` -- Transaction Table

**Goal:** Replace `animate-pulse` with shimmer. Add row hover transitions.

**Changes:**

**Line 21** -- Skeleton loader divs:
- **Before:** `className="h-12 bg-gray-100 rounded-lg animate-pulse"`
- **After:** `className="h-12 rounded-lg shimmer-bg animate-shimmer"`

**Line 63** -- Table row hover:
- **Before:** `<tr key={txn.id} className="border-b hover:bg-gray-50">`
- **After:** `<tr key={txn.id} className="border-b hover:bg-gray-50 transition-colors duration-150">`

---

#### 4.2.9 `src/components/file-dropzone.tsx` -- File Dropzone

**Goal:** Smoother state transitions. The existing `transition-colors duration-200` is already present -- upgrade it to `transition-all duration-200` to also cover border-color and any transform changes. Add a subtle scale feedback on drag-active.

**Changes:**

**Line 55** -- Change `transition-colors duration-200` to `transition-all duration-200`.
- **Before:** `transition-colors duration-200`
- **After:** `transition-all duration-200`

**Line 57-59** -- Drag active state: add a subtle scale transform.
- **Before:** `dragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"`
- **After:** `dragActive ? "border-blue-400 bg-blue-50 scale-[1.01]" : "border-gray-300 bg-white hover:border-gray-400"`

---

#### 4.2.10 `src/app/auth/signin/page.tsx` -- Sign In Page

**Changes:**

**Line 22 (sent state)** -- The "Check your email" card:
- Add `animate-scale-in` to the card div.
- **Before:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border">`
- **After:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border animate-scale-in">`

**Line 38 (sign-in form)** -- The form card:
- Add `animate-scale-in` to the card div.
- **Before:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border">`
- **After:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border animate-scale-in">`

**Line 65** -- Submit button:
- Add `transition-all duration-150 active:scale-95`.
- **Before:** `className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"`
- **After:** `className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-150 active:scale-95"`

**Line 61** -- Email input:
- Add `transition-all duration-150` for smooth focus ring appearance.
- **Before:** `className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"`
- **After:** `className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-150"`

---

#### 4.2.11 `src/app/auth/verify/page.tsx` -- Verify Page

**Changes:**

**Line 4** -- The card div:
- Add `animate-scale-in`.
- **Before:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center">`
- **After:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center animate-scale-in">`

---

#### 4.2.12 `src/app/auth/error/page.tsx` -- Auth Error Page

**Changes:**

**Line 22** -- The error card div:
- Add `animate-scale-in`.
- **Before:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center">`
- **After:** `<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center animate-scale-in">`

**Line 28** -- "Try again" button:
- Add `transition-all duration-150 active:scale-95`.
- **Before:** `className="inline-block py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"`
- **After:** `className="inline-block py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all duration-150 active:scale-95"`

---

#### 4.2.13 `src/app/profile/page.tsx` -- Profile Page

**Changes:**

**Line 44** -- Root wrapper `<div className="max-w-2xl mx-auto py-12 px-4">`:
- Add `animate-fade-in-up`.
- **After:** `className="max-w-2xl mx-auto py-12 px-4 animate-fade-in-up"`

**Line 55** -- Profile card:
- Add `animate-scale-in transition-all duration-200 hover:shadow-md`.
- **Before:** `<div className="bg-white rounded-xl shadow-sm border p-6">`
- **After:** `<div className="bg-white rounded-xl shadow-sm border p-6 animate-scale-in transition-all duration-200 hover:shadow-md">`

**Line 103** -- Save button:
- Add `transition-all duration-150 active:scale-95`.
- **Before:** `className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"`
- **After:** `className="py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-all duration-150 active:scale-95"`

**Line 49** -- "Back to Dashboard" link:
- Add `transition-colors duration-150`.
- **Before:** `className="text-blue-600 hover:text-blue-700 text-sm font-medium"`
- **After:** `className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-150"`

---

## 5. Responsive Behavior

- **All animations are identical at all breakpoints.** The keyframe definitions are not viewport-dependent.
- **Mobile performance consideration:** The animations chosen (`transform` + `opacity` only) are GPU-accelerated and perform well even on mobile devices. There is no need to disable animations below a certain breakpoint.
- **The `hover:` effects naturally degrade gracefully:** On touch devices, `hover:` states do not activate on tap (they may flash briefly, which is fine). The `active:scale-95` on buttons gives tap feedback on mobile.
- **No `will-change` usage:** The animations are short-lived enough that `will-change` is unnecessary. The browser's compositor handles `transform` and `opacity` natively.

---

## 6. Accessibility Checklist

| Requirement | Implementation |
|-------------|---------------|
| `prefers-reduced-motion: reduce` disables all animations | All `@keyframes` are wrapped in `@media (prefers-reduced-motion: no-preference)`. A separate `@media (prefers-reduced-motion: reduce)` block sets `animation: none !important` on all custom animation classes. |
| No content is hidden behind animation | All content has `animation-fill-mode: both` so it renders in its final state immediately if animation is disabled. |
| Animations do not flash or strobe | No animations involve rapid color changes or flashing. Maximum frequency is the shimmer sweep at 1.5s period, well below the 3-per-second threshold. |
| Interactive elements remain accessible during animation | All buttons and links are clickable from the first frame. `pointer-events` are never disabled by animation. |
| Focus indicators are not affected | No animation modifies `outline` or `ring` styles. Existing `focus:ring-2` patterns remain intact. |
| Animation durations are under WCAG recommendations | All entrance animations are under 500ms. The infinite shimmer is a subtle gradient shift, not a content-obscuring effect. |

---

## 7. Test Plan

### 7.1 Visual Testing

1. **Dashboard page load:** Verify the 4 summary cards stagger in with visible delay between each. The chart container should fade in after the cards.
2. **Landing page:** Hero text fades up, feature cards scale in with stagger, CTA button has hover glow and press squish.
3. **Auth pages:** Cards scale in on mount. Verify "Check your email" card animates when state transitions from form to confirmation.
4. **Navigation:** Click between dashboard sub-pages and verify each page's content fades in from below.
5. **Skeleton loaders:** Go to transactions page -- the 5 skeleton bars should show a left-to-right shimmer gradient sweep, not a pulse.
6. **Hover states:** Hover over summary cards, chart containers, table rows. Verify subtle lift/shadow transition.
7. **Button press:** Click any button and verify the brief `scale(0.95)` press feedback.

### 7.2 Performance Testing

1. **Chrome DevTools Performance tab:** Record a page load. Verify no layout shifts caused by animations (only compositor-layer `transform`/`opacity` changes).
2. **60fps validation:** While hovering cards and scrolling the transaction table simultaneously, the frame rate should stay at 60fps.
3. **No CLS:** The `animate-fade-in-up` uses `translateY` (not height/margin changes), so Cumulative Layout Shift should be 0.

### 7.3 Accessibility Testing

1. **macOS:** System Preferences > Accessibility > Display > Reduce Motion ON. Reload the app. Verify zero animations play -- all content appears immediately in its final position.
2. **Chrome DevTools:** Rendering tab > Emulate CSS media feature `prefers-reduced-motion: reduce`. Confirm same behavior.
3. **Screen reader test:** Navigate with VoiceOver. Confirm no content is skipped or delayed due to animation timing.

### 7.4 Cross-Browser Testing

1. **Safari:** Verify `-webkit-` prefixes are not needed (Tailwind 4 handles this via PostCSS).
2. **Firefox:** Verify `cubic-bezier(0.16, 1, 0.3, 1)` easing works correctly.
3. **Mobile Safari/Chrome:** Verify `active:scale-95` provides tap feedback.

---

## 8. Verification Checklist

- [ ] All 6 keyframes defined in `globals.css`
- [ ] All keyframes wrapped in `@media (prefers-reduced-motion: no-preference)`
- [ ] Reduced motion override block present and tested
- [ ] 5 Tailwind animation tokens registered in `@theme inline`
- [ ] `shimmer-bg` utility defined via `@utility`
- [ ] Dashboard summary cards stagger with 4 distinct delays
- [ ] Landing page feature cards stagger with 3 distinct delays
- [ ] All primary buttons have `active:scale-95` press feedback
- [ ] All card containers have `hover:shadow-md` or `hover:-translate-y-0.5`
- [ ] Transaction table skeleton loaders use shimmer instead of pulse
- [ ] Transaction table rows have `transition-colors duration-150`
- [ ] File dropzone uses `transition-all` instead of `transition-colors`
- [ ] Auth cards use `animate-scale-in` entrance
- [ ] No `will-change` properties added
- [ ] No animation uses `width`, `height`, `margin`, `padding`, `top`, `left`, or any layout-triggering property
- [ ] No new npm dependencies added
- [ ] All animations use only `transform` and `opacity`
- [ ] Build passes with `npm run build`
- [ ] No TypeScript errors from added inline `style` props

---

## 9. What NOT To Do

1. **Do NOT animate layout properties.** Never use `width`, `height`, `margin`, `padding`, `top`, `left`, `right`, `bottom` in keyframes. These trigger layout recalculations and cause jank. Only `transform` and `opacity` are GPU-composited.

2. **Do NOT add JavaScript animation libraries.** No `framer-motion`, no `react-spring`, no `GSAP`, no `anime.js`. All motion is CSS-only. The requirement is explicit: no new dependencies.

3. **Do NOT overdo it.** Every animation should be 500ms or shorter for entrance, 150-200ms for interactions. Users should notice the polish, not the animation. If an animation draws attention to itself, it is too much.

4. **Do NOT use `will-change` broadly.** Adding `will-change: transform` to every card creates unnecessary compositor layers and increases memory usage. The short-lived animations here do not benefit from it.

5. **Do NOT animate on scroll.** No intersection observer animations, no scroll-triggered effects. Those require JavaScript and add complexity for minimal gain in a dashboard app.

6. **Do NOT use `transition: all`.** While some instances use `transition-all` for convenience where multiple properties change together (like `transform` + `box-shadow` on hover), be aware this transitions every property. In cases where only color changes, prefer `transition-colors`. The plan uses `transition-all` only where `transform`, `box-shadow`, and `background-color` all transition together.

7. **Do NOT forget `animation-fill-mode: both`.** The `both` keyword in the Tailwind animation tokens ensures elements start invisible (via `backwards`) and stay in their final state (via `forwards`). Without this, elements would flash visible before the animation starts, or revert to invisible after it ends.

8. **Do NOT create animations that block interaction.** All animated elements must be clickable/focusable from frame 1. Never use `pointer-events: none` during an entrance animation.

---

### Critical Files for Implementation
- `/Users/chris/Projects/really-personal-finance/src/app/globals.css` - Core file: all keyframes, theme tokens, and utility definitions go here
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/page.tsx` - Highest-impact file: 4 staggered summary cards + chart fade-in
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` - Sidebar nav transitions affect every dashboard page
- `/Users/chris/Projects/really-personal-finance/src/components/transaction-table.tsx` - Shimmer skeleton replacement and row hover transitions
- `/Users/chris/Projects/really-personal-finance/src/app/page.tsx` - Landing page entrance animations establish first impression