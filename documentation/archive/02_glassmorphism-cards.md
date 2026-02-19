

I'll start by thoroughly exploring the codebase to find every card pattern instance. Let me read all relevant files systematically.

Now let me read all the UI files that could contain card patterns.

Now let me also read the providers component and check if there are any other styling-related files.

Now let me also search for any remaining patterns that need updating -- text color references and additional border patterns.

Now let me check for any existing Tailwind config (v4 uses CSS-based config).

I now have a comprehensive understanding of every file in the codebase. Let me also check if there's any documentation folder structure to understand the format convention.

Let me quickly check one of these docs for format conventions.

I now have a complete picture. Let me compile the exhaustive implementation plan.

---

# Phase 02: Glassmorphism Card System

**Status:** ✅ COMPLETE
**Started:** 2026-02-19
**Completed:** 2026-02-19
**PR Title:** feat: glassmorphism card system with frosted glass effects
**Risk:** Low | **Effort:** Low-Medium
**Depends on:** Phase 01 (dark palette foundation) ✅ COMPLETE (PR #12)

---

## REVISED APPROACH (Post-Phase 01 Challenge Round)

Phase 01 established a 14-token design system. This phase preserves those tokens rather than replacing them with raw `bg-white/5` / `border-white/10` values. The revised approach:

1. **Update token values in globals.css** — bump `--background-card` from 0.03 to 0.05 opacity; add `--background-card-auth` at 0.08
2. **Add `backdrop-blur-xl` + `rounded-2xl`** to card containers (keep `bg-background-card border border-border`)
3. **Auth cards** use new `bg-background-card-auth backdrop-blur-2xl rounded-2xl`
4. **Sidebar, header, footer** converted from solid `bg-background-elevated` to glass
5. **Privacy notice** restyled from warning theme to indigo glass
6. **All text colors, borders, inputs, hover states, badges** stay as Phase 01 tokens
7. **Step 19 (Recharts) DROPPED** — deferred to Phase 05 (Dark-Themed Charts)
8. **Glass utility classes DROPPED** — not used by implementation, dead code

The detailed steps below were written pre-Phase 01. "Before" code references the old light-mode classes — the actual current code uses Phase 01 design tokens. Implementation follows the revised approach above.

---

## Files Modified (16 total)

| File | Change Type |
|---|---|
| `src/app/globals.css` | Add glass utility class |
| `src/app/page.tsx` | Landing page: header, 3 feature cards, privacy notice, footer |
| `src/app/layout.tsx` | No change needed (no card patterns) |
| `src/app/dashboard/layout.tsx` | Sidebar glass treatment, page background, nav hover states |
| `src/app/dashboard/page.tsx` | 4 summary cards + 1 chart card |
| `src/app/dashboard/transactions/page.tsx` | Filter bar + table container + pagination buttons |
| `src/app/dashboard/categories/page.tsx` | Chart card |
| `src/app/dashboard/merchants/page.tsx` | Chart card |
| `src/app/dashboard/import/page.tsx` | Error banner, new-account form, success banner, buttons, inputs |
| `src/app/auth/signin/page.tsx` | 2 card states (form + sent confirmation), input field, page bg |
| `src/app/auth/verify/page.tsx` | 1 card, page bg |
| `src/app/auth/error/page.tsx` | 2 cards (content + suspense fallback), page bg |
| `src/app/profile/page.tsx` | 1 card, 2 input fields, page bg |
| `src/components/date-range-filter.tsx` | Filter bar card + 2 input fields |
| `src/components/transaction-table.tsx` | Skeleton loaders, table header/row borders, hover rows, badge colors |
| `src/components/import-preview.tsx` | Card wrapper, sticky thead, row highlight colors |
| `src/components/file-dropzone.tsx` | Dropzone bg, border, text colors |
| `src/components/category-chart.tsx` | Table header/row borders, text colors |
| `src/components/merchant-chart.tsx` | Table header/row borders, text colors, badge |

---

## Context

Glassmorphism (frosted glass UI) is a defining visual pattern for modern fintech applications. It creates a sense of layered depth through translucent surfaces with backdrop blur, producing a premium feel that flat white cards cannot achieve. On the near-black backgrounds established in Phase 01, glass cards appear to float above the surface, with content behind them subtly blurred through the translucent layer.

This phase converts every flat white card (`bg-white ... shadow-sm`) in the entire application to the frosted glass treatment. Because Phase 01 establishes dark backgrounds as a prerequisite, the translucent white surfaces and subtle white borders will be visible and produce the desired frosted depth effect.

---

## Visual Specification

### Glass Card Token Values

| Property | Before (flat white) | After (glass) |
|---|---|---|
| Background | `bg-white` | `bg-white/5` |
| Backdrop | none | `backdrop-blur-xl` |
| Border | `border` (gray-200 default) | `border border-white/10` |
| Radius | `rounded-xl` | `rounded-2xl` |
| Shadow | `shadow-sm` | (removed) |
| Hover (interactive) | `hover:bg-gray-50` | `hover:bg-white/5` |

### Auth Card Variant (slightly more opaque for focal emphasis)

| Property | Value |
|---|---|
| Background | `bg-white/8` |
| Backdrop | `backdrop-blur-2xl` |
| Border | `border border-white/10` |
| Radius | `rounded-2xl` |

### Input Field Spec (inside glass cards)

| Property | Before | After |
|---|---|---|
| Background | (default / transparent) | `bg-white/5` |
| Border | `border` | `border border-white/10` |
| Text color | (default dark) | `text-white` |
| Placeholder | (default) | `placeholder:text-white/30` |
| Focus ring | `focus:ring-blue-500` | `focus:ring-indigo-500/50 focus:border-indigo-500/50` |

### Table Spec (inside glass cards)

| Element | Before | After |
|---|---|---|
| Header text | `text-gray-600` | `text-white/50` |
| Row divider | `border-b` | `border-b border-white/5` |
| Row hover | `hover:bg-gray-50` | `hover:bg-white/5` |
| Sticky thead bg | `bg-gray-50` | `bg-white/5` |

### Privacy Notice (landing page)

| Property | Before | After |
|---|---|---|
| Background | `bg-amber-50` | `bg-indigo-500/5` |
| Border | `border-amber-200` | `border-white/10` |
| Title color | `text-amber-900` | `text-indigo-300` |
| Body color | `text-amber-800` | `text-white/60` |

### Reusable CSS Utility (globals.css)

A `@layer utilities` rule defining a `.glass-card` class will be added to `globals.css` to provide the canonical pattern. Individual instances can still use raw Tailwind classes for variants (e.g., auth cards needing `bg-white/8`), but the standard card uses this utility to guarantee consistency.

---

## Dependencies

| Dependency | Why |
|---|---|
| **Phase 01 (dark palette)** | Glass effects require dark backgrounds to be visible. `bg-white/5` on a white background produces no visual effect. The `bg-gray-50` page backgrounds, `bg-white` sidebars, and all light-theme surfaces must already be converted to the dark palette before glass cards are applied. |

**Ordering constraint:** Phase 01 must be fully merged before Phase 02 begins. If Phase 02 is implemented on the existing light theme, the glass cards will appear as nearly-invisible empty boxes.

---

## Detailed Implementation Plan

### Step 1: Update design tokens in globals.css

**File:** `/Users/chris/Projects/really-personal-finance/src/app/globals.css`

Update the existing `--background-card` token and add a new `--background-card-auth` token.

**Change 1:** In `:root`, bump card opacity from 0.03 to 0.05:
```css
--background-card: rgba(255, 255, 255, 0.05);  /* was 0.03 */
```

**Change 2:** In `:root`, add auth card token after `--background-card`:
```css
--background-card-auth: rgba(255, 255, 255, 0.08);
```

**Change 3:** In `@theme inline`, add the auth card color after `--color-background-card`:
```css
--color-background-card-auth: var(--background-card-auth);
```

---

### Step 2: Landing Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/page.tsx`

**Note:** Phase 01 will change `bg-gray-50` to the dark background and update text colors. This phase only addresses card surfaces, borders, shadows, and border-radius. The page background and text color changes are Phase 01's responsibility. Below, each card change is specified independently.

#### 2a. Header (line 7)

**Before (line 7):**
```tsx
<header className="bg-white border-b">
```

**After:**
```tsx
<header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
```

#### 2b. Three Feature Cards (lines 39, 50, 59)

**Before (line 39):**
```tsx
<div className="bg-white p-6 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

Apply the same change to lines 50 and 59 (all three feature cards are identical pattern).

#### 2c. Privacy Notice (line 70)

**Before (line 70):**
```tsx
<div className="mt-20 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
```

**After:**
```tsx
<div className="mt-20 bg-indigo-500/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
```

Also update text colors inside (lines 71-74):

**Before (line 72):**
```tsx
<h3 className="font-semibold text-amber-900 mb-2">
```
**After:**
```tsx
<h3 className="font-semibold text-indigo-300 mb-2">
```

**Before (line 74):**
```tsx
<p className="text-amber-800 text-sm max-w-xl mx-auto">
```
**After:**
```tsx
<p className="text-white/60 text-sm max-w-xl mx-auto">
```

#### 2d. Footer (line 84)

**Before (line 84):**
```tsx
<footer className="border-t bg-white">
```

**After:**
```tsx
<footer className="border-t border-white/10 bg-white/5 backdrop-blur-xl">
```

---

### Step 3: Dashboard Layout (Sidebar)

**File:** `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx`

#### 3a. Sidebar container (line 36)

**Before (line 36):**
```tsx
<aside className="w-64 bg-white border-r flex flex-col">
```

**After:**
```tsx
<aside className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col">
```

#### 3b. Sidebar logo section border (line 37)

**Before (line 37):**
```tsx
<div className="p-6 border-b">
```

**After:**
```tsx
<div className="p-6 border-b border-white/10">
```

#### 3c. Sidebar logo text (line 38)

**Before (line 38):**
```tsx
<Link href="/dashboard" className="text-lg font-bold text-gray-900">
```

**After:**
```tsx
<Link href="/dashboard" className="text-lg font-bold text-white">
```

#### 3d. Active nav item (line 56)

**Before (lines 55-57):**
```tsx
isActive
  ? "bg-blue-50 text-blue-700"
  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
```

**After:**
```tsx
isActive
  ? "bg-indigo-500/10 text-indigo-400"
  : "text-white/60 hover:bg-white/5 hover:text-white"
```

#### 3e. Profile link (line 70)

**Before (line 70):**
```tsx
className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
```

**After:**
```tsx
className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
```

#### 3f. Sign out button (line 77)

**Before (line 77):**
```tsx
className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-red-600 w-full"
```

**After:**
```tsx
className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-red-400 w-full"
```

#### 3g. Bottom section border (line 67)

**Before (line 67):**
```tsx
<div className="p-4 border-t space-y-1">
```

**After:**
```tsx
<div className="p-4 border-t border-white/10 space-y-1">
```

---

### Step 4: Dashboard Overview Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/dashboard/page.tsx`

#### 4a. Page subtitle (line 45)

**Before (line 45):**
```tsx
<p className="text-gray-600">Your financial overview</p>
```

**After:**
```tsx
<p className="text-white/50">Your financial overview</p>
```

#### 4b. Four summary cards (lines 52, 58, 64, 74)

Each of these four cards follows the same pattern.

**Before (line 52):**
```tsx
<div className="bg-white p-6 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

Apply identically to lines 58, 64, and 74.

#### 4c. Card label text (lines 53, 59, 65, 75)

**Before (line 53, representative):**
```tsx
<p className="text-sm text-gray-600">This Month Income</p>
```

**After:**
```tsx
<p className="text-sm text-white/50">This Month Income</p>
```

Apply the same `text-gray-600` to `text-white/50` change to lines 59, 65, and 75.

#### 4d. Chart container card (line 87)

**Before (line 87):**
```tsx
<div className="bg-white p-6 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

#### 4e. Loading text inside chart (line 90)

**Before (line 90):**
```tsx
<div className="h-96 flex items-center justify-center text-gray-500">
```

**After:**
```tsx
<div className="h-96 flex items-center justify-center text-white/40">
```

---

### Step 5: Transactions Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/dashboard/transactions/page.tsx`

#### 5a. Page subtitle (line 48)

**Before (line 48):**
```tsx
<p className="text-gray-600">Browse and filter your transactions</p>
```

**After:**
```tsx
<p className="text-white/50">Browse and filter your transactions</p>
```

#### 5b. Filter bar card (line 52)

**Before (line 52):**
```tsx
<div className="bg-white p-4 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
```

#### 5c. Filter labels (lines 55, 69, 83, 98)

**Before (line 55, representative):**
```tsx
<label className="block text-xs font-medium text-gray-600 mb-1">
```

**After:**
```tsx
<label className="block text-xs font-medium text-white/50 mb-1">
```

Apply to all four filter labels.

#### 5d. Filter input fields (lines 65, 79, 95, 109)

**Before (line 65, representative):**
```tsx
className="w-full px-3 py-2 border rounded-lg text-sm"
```

**After:**
```tsx
className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30"
```

Apply to all four filter inputs.

#### 5e. Transaction table container card (line 116)

**Before (line 116):**
```tsx
<div className="bg-white rounded-xl border shadow-sm p-4">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
```

#### 5f. Pagination border (line 120)

**Before (line 120):**
```tsx
<div className="flex items-center justify-between mt-4 pt-4 border-t">
```

**After:**
```tsx
<div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
```

#### 5g. Pagination buttons (lines 122-125, 132-135)

**Before (line 124):**
```tsx
className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
```

**After:**
```tsx
className="px-4 py-2 text-sm font-medium text-white/60 border border-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
```

Apply to both Previous (line 124) and Next (line 134) buttons.

#### 5h. Pagination text (line 128)

**Before (line 128):**
```tsx
<span className="text-sm text-gray-500">
```

**After:**
```tsx
<span className="text-sm text-white/40">
```

---

### Step 6: Categories Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/dashboard/categories/page.tsx`

#### 6a. Page subtitle (line 46)

**Before (line 46-48):**
```tsx
<p className="text-gray-600">
```

**After:**
```tsx
<p className="text-white/50">
```

#### 6b. Chart card (line 61)

**Before (line 61):**
```tsx
<div className="bg-white p-6 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

#### 6c. Loading text (line 63)

**Before (line 63):**
```tsx
<div className="h-80 flex items-center justify-center text-gray-500">
```

**After:**
```tsx
<div className="h-80 flex items-center justify-center text-white/40">
```

---

### Step 7: Merchants Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/dashboard/merchants/page.tsx`

#### 7a. Page subtitle (line 47)

**Before (line 47):**
```tsx
<p className="text-gray-600">
```

**After:**
```tsx
<p className="text-white/50">
```

#### 7b. Chart card (line 62)

**Before (line 62):**
```tsx
<div className="bg-white p-6 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

#### 7c. Loading text (line 64)

**Before (line 64):**
```tsx
<div className="h-80 flex items-center justify-center text-gray-500">
```

**After:**
```tsx
<div className="h-80 flex items-center justify-center text-white/40">
```

---

### Step 8: Import Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/dashboard/import/page.tsx`

#### 8a. Page heading (line 125)

**Before (line 125):**
```tsx
<h1 className="text-2xl font-bold text-gray-900 mb-2">
```

**After:**
```tsx
<h1 className="text-2xl font-bold text-white mb-2">
```

#### 8b. Page subtitle (line 128-129)

**Before (line 128):**
```tsx
<p className="text-gray-600 mb-6">
```

**After:**
```tsx
<p className="text-white/50 mb-6">
```

#### 8c. Error banner (line 133)

**Before (line 133):**
```tsx
<div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
```

**After:**
```tsx
<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4">
```

#### 8d. Account select label (line 147)

**Before (line 147):**
```tsx
<label className="block text-sm font-medium text-gray-700 mb-1">
```

**After:**
```tsx
<label className="block text-sm font-medium text-white/70 mb-1">
```

#### 8e. Account select dropdown (line 162)

**Before (line 162):**
```tsx
className="flex-1 p-2 border rounded-lg"
```

**After:**
```tsx
className="flex-1 p-2 bg-white/5 border border-white/10 rounded-lg text-white"
```

#### 8f. New account form area (line 175)

**Before (line 175):**
```tsx
<div className="mt-2 p-3 border rounded-lg bg-gray-50 flex gap-2 items-end">
```

**After:**
```tsx
<div className="mt-2 p-3 border border-white/10 rounded-lg bg-white/5 flex gap-2 items-end">
```

#### 8g. New account sub-labels (lines 177, 187)

**Before (line 177):**
```tsx
<label className="block text-xs text-gray-500">Name</label>
```

**After:**
```tsx
<label className="block text-xs text-white/40">Name</label>
```

Apply to both Name (line 177) and Type (line 187) labels.

#### 8h. New account text input (line 183)

**Before (line 183):**
```tsx
className="w-full p-2 border rounded"
```

**After:**
```tsx
className="w-full p-2 bg-white/5 border border-white/10 rounded text-white placeholder:text-white/30"
```

#### 8i. New account type select (line 191)

**Before (line 191):**
```tsx
className="p-2 border rounded"
```

**After:**
```tsx
className="p-2 bg-white/5 border border-white/10 rounded text-white"
```

#### 8j. Success banner (line 224)

**Before (line 224):**
```tsx
<div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
```

**After:**
```tsx
<div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center">
```

#### 8k. Success text (line 225)

**Before (line 225):**
```tsx
<p className="text-lg font-medium text-green-800">
```

**After:**
```tsx
<p className="text-lg font-medium text-green-400">
```

#### 8l. "Import more" button (line 235)

**Before (line 235):**
```tsx
className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
```

**After:**
```tsx
className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white"
```

---

### Step 9: Auth Sign-In Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/auth/signin/page.tsx`

#### 9a. "Sent" state card (lines 21-22)

**Before (line 22):**
```tsx
<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border">
```

**After:**
```tsx
<div className="max-w-md w-full p-8 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-2xl">
```

#### 9b. "Sent" confirmation text (line 26)

**Before (line 26):**
```tsx
<p className="text-gray-600">
```

**After:**
```tsx
<p className="text-white/60">
```

#### 9c. Main form card (lines 37-38)

**Before (line 38):**
```tsx
<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border">
```

**After:**
```tsx
<div className="max-w-md w-full p-8 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-2xl">
```

#### 9d. Subtitle text (line 41)

**Before (line 41):**
```tsx
<p className="text-gray-600 mt-2">
```

**After:**
```tsx
<p className="text-white/60 mt-2">
```

#### 9e. Email label (line 50)

**Before (line 50):**
```tsx
className="block text-sm font-medium text-gray-700 mb-1"
```

**After:**
```tsx
className="block text-sm font-medium text-white/70 mb-1"
```

#### 9f. Email input (line 61)

**Before (line 61):**
```tsx
className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
```

**After:**
```tsx
className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
```

#### 9g. Footer text (line 74)

**Before (line 74):**
```tsx
<p className="text-xs text-gray-500 text-center mt-6">
```

**After:**
```tsx
<p className="text-xs text-white/40 text-center mt-6">
```

---

### Step 10: Auth Verify Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/auth/verify/page.tsx`

#### 10a. Card (line 4)

**Before (line 4):**
```tsx
<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center">
```

**After:**
```tsx
<div className="max-w-md w-full p-8 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-2xl text-center">
```

#### 10b. Body text (line 7)

**Before (line 7):**
```tsx
<p className="text-gray-600">
```

**After:**
```tsx
<p className="text-white/60">
```

---

### Step 11: Auth Error Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/auth/error/page.tsx`

#### 11a. Main ErrorContent card (line 22)

**Before (line 22):**
```tsx
<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center">
```

**After:**
```tsx
<div className="max-w-md w-full p-8 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-2xl text-center">
```

#### 11b. Error message text (line 25)

**Before (line 25):**
```tsx
<p className="text-gray-600 mb-6">{message}</p>
```

**After:**
```tsx
<p className="text-white/60 mb-6">{message}</p>
```

#### 11c. Suspense fallback card (line 42)

**Before (line 42):**
```tsx
<div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm border text-center">
```

**After:**
```tsx
<div className="max-w-md w-full p-8 bg-white/8 backdrop-blur-2xl border border-white/10 rounded-2xl text-center">
```

---

### Step 12: Profile Page

**File:** `/Users/chris/Projects/really-personal-finance/src/app/profile/page.tsx`

#### 12a. Card (line 55)

**Before (line 55):**
```tsx
<div className="bg-white rounded-xl shadow-sm border p-6">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

#### 12b. Name label (line 59)

**Before (line 59):**
```tsx
className="block text-sm font-medium text-gray-700 mb-1"
```

**After:**
```tsx
className="block text-sm font-medium text-white/70 mb-1"
```

#### 12c. Name input (line 70)

**Before (line 70):**
```tsx
className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
```

**After:**
```tsx
className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
```

#### 12d. Email label (line 77)

**Before (line 77):**
```tsx
className="block text-sm font-medium text-gray-700 mb-1"
```

**After:**
```tsx
className="block text-sm font-medium text-white/70 mb-1"
```

#### 12e. Email input (line 87)

**Before (line 87):**
```tsx
className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
```

**After:**
```tsx
className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
```

#### 12f. Footer text (line 112)

**Before (line 112):**
```tsx
<p className="text-xs text-gray-500 mt-4">
```

**After:**
```tsx
<p className="text-xs text-white/40 mt-4">
```

---

### Step 13: DateRangeFilter Component

**File:** `/Users/chris/Projects/really-personal-finance/src/components/date-range-filter.tsx`

#### 13a. Card wrapper (line 17)

**Before (line 17):**
```tsx
<div className="bg-white p-4 rounded-xl border shadow-sm">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
```

#### 13b. Labels (lines 20, 28)

**Before (line 20):**
```tsx
<label className="block text-xs font-medium text-gray-600 mb-1">
```

**After:**
```tsx
<label className="block text-xs font-medium text-white/50 mb-1">
```

Apply to both labels (lines 20 and 28).

#### 13c. Input fields (lines 27, 35)

**Before (line 27):**
```tsx
className="w-full px-3 py-2 border rounded-lg text-sm"
```

**After:**
```tsx
className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
```

Apply to both date inputs (lines 27 and 35).

---

### Step 14: TransactionTable Component

**File:** `/Users/chris/Projects/really-personal-finance/src/components/transaction-table.tsx`

#### 14a. Skeleton loaders (line 21)

**Before (line 21):**
```tsx
className="h-12 bg-gray-100 rounded-lg animate-pulse"
```

**After:**
```tsx
className="h-12 bg-white/5 rounded-lg animate-pulse"
```

#### 14b. Empty state text (line 30)

**Before (line 30):**
```tsx
<div className="text-center py-12 text-gray-500">
```

**After:**
```tsx
<div className="text-center py-12 text-white/40">
```

#### 14c. Table header row (line 40)

**Before (line 40):**
```tsx
<tr className="border-b">
```

**After:**
```tsx
<tr className="border-b border-white/10">
```

#### 14d. Table header cells (lines 41, 44, 47, 50, 53)

Each header cell has `text-gray-600`. Change all five:

**Before (line 41, representative):**
```tsx
<th className="text-left py-3 px-2 font-medium text-gray-600">
```

**After:**
```tsx
<th className="text-left py-3 px-2 font-medium text-white/50">
```

Apply to lines 41, 44, 47, 50, and 53. (Line 53 has `text-right` instead of `text-left` -- keep that.)

#### 14e. Table body rows (line 63)

**Before (line 63):**
```tsx
<tr key={txn.id} className="border-b hover:bg-gray-50">
```

**After:**
```tsx
<tr key={txn.id} className="border-b border-white/5 hover:bg-white/5">
```

#### 14f. Date cell (line 64)

**Before (line 64):**
```tsx
<td className="py-3 px-2 text-gray-600 whitespace-nowrap">
```

**After:**
```tsx
<td className="py-3 px-2 text-white/50 whitespace-nowrap">
```

#### 14g. Secondary description text (line 72)

**Before (line 72):**
```tsx
<div className="text-xs text-gray-400">{txn.name}</div>
```

**After:**
```tsx
<div className="text-xs text-white/30">{txn.name}</div>
```

#### 14h. Pending badge (line 75)

**Before (line 75):**
```tsx
<span className="inline-block ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
```

**After:**
```tsx
<span className="inline-block ml-2 px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-400 rounded">
```

#### 14i. Category badge (line 82)

**Before (line 82):**
```tsx
<span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
```

**After:**
```tsx
<span className="inline-block px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded-full">
```

#### 14j. Account name cell (line 87)

**Before (line 87):**
```tsx
<td className="py-3 px-2 text-gray-500 text-xs">
```

**After:**
```tsx
<td className="py-3 px-2 text-white/40 text-xs">
```

#### 14k. Import badge (line 90)

**Before (line 90):**
```tsx
<span className="ml-1 px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
```

**After:**
```tsx
<span className="ml-1 px-1 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px]">
```

#### 14l. Amount color for expenses (line 97)

**Before (line 97):**
```tsx
isIncome ? "text-green-600" : "text-gray-900"
```

**After:**
```tsx
isIncome ? "text-green-400" : "text-white"
```

---

### Step 15: ImportPreview Component

**File:** `/Users/chris/Projects/really-personal-finance/src/components/import-preview.tsx`

#### 15a. Card wrapper (line 77)

**Before (line 77):**
```tsx
<div className="bg-white rounded-xl shadow-sm border p-6">
```

**After:**
```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
```

#### 15b. Format/count text (lines 80-85)

**Before (line 80):**
```tsx
<p className="text-sm text-gray-600">
```

**After:**
```tsx
<p className="text-sm text-white/50">
```

Apply to both `<p>` tags at lines 80 and 83.

#### 15c. Select/deselect link separator (line 95)

**Before (line 95):**
```tsx
<span className="text-gray-300">|</span>
```

**After:**
```tsx
<span className="text-white/20">|</span>
```

#### 15d. Sticky table header (line 107)

**Before (line 107):**
```tsx
<thead className="sticky top-0 bg-gray-50">
```

**After:**
```tsx
<thead className="sticky top-0 bg-white/5 backdrop-blur-xl">
```

#### 15e. Table header row (line 108)

**Before (line 108):**
```tsx
<tr className="text-left text-gray-500">
```

**After:**
```tsx
<tr className="text-left text-white/40">
```

#### 15f. Duplicate row highlights (lines 127-130)

**Before (lines 127-130):**
```tsx
dup?.reason === "exact_import_id"
  ? "bg-red-50"
  : dup
    ? "bg-yellow-50"
    : ""
```

**After:**
```tsx
dup?.reason === "exact_import_id"
  ? "bg-red-500/10"
  : dup
    ? "bg-yellow-500/10"
    : ""
```

#### 15g. Status text colors (lines 152, 157, 162)

**Before (line 152):**
```tsx
<span className="text-green-600 text-xs font-medium">
```
**After:**
```tsx
<span className="text-green-400 text-xs font-medium">
```

**Before (line 157):**
```tsx
<span className="text-red-600 text-xs font-medium">
```
**After:**
```tsx
<span className="text-red-400 text-xs font-medium">
```

**Before (line 162):**
```tsx
<span className="text-yellow-600 text-xs font-medium">
```
**After:**
```tsx
<span className="text-yellow-400 text-xs font-medium">
```

---

### Step 16: FileDropzone Component

**File:** `/Users/chris/Projects/really-personal-finance/src/components/file-dropzone.tsx`

#### 16a. Dropzone container (lines 53-61)

**Before (lines 57-59):**
```tsx
${
  dragActive
    ? "border-blue-400 bg-blue-50"
    : "border-gray-300 bg-white hover:border-gray-400"
}
```

**After:**
```tsx
${
  dragActive
    ? "border-indigo-400 bg-indigo-500/10"
    : "border-white/20 bg-white/5 hover:border-white/30"
}
```

#### 16b. Dropzone text (line 73)

**Before (line 73):**
```tsx
<p className="text-lg font-medium text-gray-700">
```

**After:**
```tsx
<p className="text-lg font-medium text-white/70">
```

#### 16c. Subtitle text (line 76)

**Before (line 76):**
```tsx
<p className="text-sm text-gray-500 mt-2">
```

**After:**
```tsx
<p className="text-sm text-white/40 mt-2">
```

---

### Step 17: CategoryChart Component

**File:** `/Users/chris/Projects/really-personal-finance/src/components/category-chart.tsx`

#### 17a. Empty state (line 32)

**Before (line 32):**
```tsx
<div className="h-80 flex items-center justify-center text-gray-500">
```

**After:**
```tsx
<div className="h-80 flex items-center justify-center text-white/40">
```

#### 17b. Table header row (line 73)

**Before (line 73):**
```tsx
<tr className="border-b">
```

**After:**
```tsx
<tr className="border-b border-white/10">
```

#### 17c. Table header cells (lines 74, 78, 81)

**Before (line 74, representative):**
```tsx
<th className="text-left py-2 font-medium text-gray-600">
```

**After:**
```tsx
<th className="text-left py-2 font-medium text-white/50">
```

Apply to all three header cells. (Lines 78 and 81 use `text-right` -- keep that.)

#### 17d. Table body rows (line 87)

**Before (line 87):**
```tsx
<tr key={item.category} className="border-b">
```

**After:**
```tsx
<tr key={item.category} className="border-b border-white/5">
```

#### 17e. Count cell (line 98)

**Before (line 98):**
```tsx
<td className="text-right py-2 text-gray-500">{item.count}</td>
```

**After:**
```tsx
<td className="text-right py-2 text-white/40">{item.count}</td>
```

---

### Step 18: MerchantChart Component

**File:** `/Users/chris/Projects/really-personal-finance/src/components/merchant-chart.tsx`

#### 18a. Empty state (line 18)

**Before (line 18):**
```tsx
<div className="h-80 flex items-center justify-center text-gray-500">
```

**After:**
```tsx
<div className="h-80 flex items-center justify-center text-white/40">
```

#### 18b. Table header row (line 45)

**Before (line 45):**
```tsx
<tr className="border-b">
```

**After:**
```tsx
<tr className="border-b border-white/10">
```

#### 18c. Table header cells (lines 46, 49, 52, 55, 58)

**Before (line 46, representative):**
```tsx
<th className="text-left py-2 font-medium text-gray-600">
```

**After:**
```tsx
<th className="text-left py-2 font-medium text-white/50">
```

Apply to all five header cells. (Lines 49, 52, 55, 58 use `text-right` -- keep that.)

#### 18d. Table body rows (line 65)

**Before (line 65):**
```tsx
<tr key={item.merchant} className="border-b">
```

**After:**
```tsx
<tr key={item.merchant} className="border-b border-white/5">
```

#### 18e. Avg amount cell (line 68)

**Before (line 68):**
```tsx
<td className="text-right py-2 text-gray-500">
```

**After:**
```tsx
<td className="text-right py-2 text-white/40">
```

#### 18f. Count cell (line 71)

**Before (line 71):**
```tsx
<td className="text-right py-2 text-gray-500">{item.count}</td>
```

**After:**
```tsx
<td className="text-right py-2 text-white/40">{item.count}</td>
```

#### 18g. Recurring badge (line 74)

**Before (line 74):**
```tsx
<span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
```

**After:**
```tsx
<span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-500/10 text-indigo-400 rounded-full">
```

#### 18h. One-time label (line 78)

**Before (line 78):**
```tsx
<span className="text-gray-400 text-xs">One-time</span>
```

**After:**
```tsx
<span className="text-white/30 text-xs">One-time</span>
```

---

### Step 19: DROPPED — Recharts Color Adjustments

**Deferred to Phase 05 (Dark-Themed Charts).** Recharts prop changes (CartesianGrid stroke, axis tick fills, Tooltip contentStyle, ReferenceLine stroke) are handled in Phase 05 to maintain clean PR boundaries.

---

## Responsive Behavior

### Backdrop-blur performance

`backdrop-filter: blur()` is GPU-accelerated on modern browsers but can cause performance issues on:
- Older iOS devices (pre-iPhone 11)
- Low-end Android devices
- Firefox on Linux with software rendering

**Mitigation strategy:** No explicit fallback is implemented in this phase. The design degrades gracefully -- without backdrop-blur, the `bg-white/5` background still provides a semi-transparent dark overlay. The card is still visually distinct from the page background. A future phase could add `@supports not (backdrop-filter: blur(1px))` rules in `globals.css` to increase opacity (e.g., `bg-white/15`) for browsers that do not support backdrop-filter.

**Do not** apply `backdrop-blur` to scroll containers. The `overflow-x-auto` and `overflow-y-auto` containers in `transaction-table.tsx` and `import-preview.tsx` are inside the glass card, not on the card itself. The blur is on the outer card div only.

### Mobile layout

The sidebar in `dashboard/layout.tsx` is always rendered at `w-64`. On mobile screens, this creates a horizontal scroll. This is a pre-existing issue and not introduced by glassmorphism. No changes to responsive breakpoints are needed for this phase.

---

## Accessibility Checklist

All text must meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text) against the effective background.

| Element | Text Color | Effective Background | Approx. Contrast | Passes AA? |
|---|---|---|---|---|
| Card body text | `text-white` (#fff) | ~`#1a1825` (dark bg + white/5 overlay) | ~15:1 | Yes |
| Secondary text | `text-white/50` (rgba 255,255,255,0.5) | ~`#1a1825` | ~6.5:1 | Yes |
| Tertiary text | `text-white/40` | ~`#1a1825` | ~5:1 | Yes (normal text) |
| Placeholder | `text-white/30` | ~`#1a1825` | ~3.5:1 | Yes (AA large) / Borderline (AA normal) |
| Green values | `text-green-400` (#4ade80) | ~`#1a1825` | ~8.5:1 | Yes |
| Red values | `text-red-400` (#f87171) | ~`#1a1825` | ~5.5:1 | Yes |
| Indigo accent | `text-indigo-400` (#818cf8) | ~`#1a1825` | ~6:1 | Yes |

**Note on placeholders:** `text-white/30` is used only for placeholder text, which is non-essential per WCAG (placeholders are not labels). The labels above inputs all use `text-white/50` or `text-white/70`, which pass AA.

**Action items for implementer:**
1. After implementation, use browser DevTools (Accessibility panel) to spot-check contrast on each page.
2. Focus states on inputs use `focus:ring-indigo-500/50` which produces a visible ring. Verify keyboard navigation shows clear focus indicators.
3. The `date` input type renders a native date picker. On dark backgrounds, some browsers render the picker icon in dark color. Test on Chrome, Safari, Firefox to ensure the icon is visible. If not, a future phase can add custom date picker styling.

---

## Test Plan

### Visual verification (manual)

For each page listed below, verify at three viewport widths: 1440px (desktop), 768px (tablet), 375px (mobile).

| # | Page | What to verify |
|---|---|---|
| 1 | `/` (landing) | Header glass, 3 feature cards glass, privacy notice indigo tint, footer glass |
| 2 | `/auth/signin` | Card is frosted, input has glass styling, placeholder is faint white |
| 3 | `/auth/signin` (after submit) | "Check your email" card is frosted |
| 4 | `/auth/verify` | Card is frosted |
| 5 | `/auth/error?error=Verification` | Card is frosted, error text readable |
| 6 | `/dashboard` | Sidebar glass with visible blur effect, 4 summary cards glass, chart card glass |
| 7 | `/dashboard/transactions` | Filter bar glass, inputs glass, table container glass, rows have subtle dividers, hover highlights |
| 8 | `/dashboard/categories` | DateRangeFilter glass, chart card glass, table text colors correct |
| 9 | `/dashboard/merchants` | DateRangeFilter glass, chart card glass, recurring badge correct color |
| 10 | `/dashboard/import` | Dropzone border/bg correct, account select glass, new account form glass, success banner green tint |
| 11 | `/profile` | Card glass, inputs glass, labels readable |

### Chart readability

1. Verify Recharts tooltip has dark background with white text (not the default white tooltip).
2. Verify grid lines are subtle (`rgba(255,255,255,0.1)`), not invisible.
3. Verify axis labels/ticks are white/50 and readable.
4. Verify the bar chart colors (green/red for income-spending, blue for merchants) still have good contrast against the glass card.

### Browser compatibility

Test `backdrop-blur` rendering in:
- Chrome 120+ (primary)
- Safari 17+ (must work, heavy usage)
- Firefox 120+ (has had issues with backdrop-filter in the past)

---

## Verification Checklist (Revised)

After implementation, run through this checklist:

- [ ] `globals.css` has `--background-card: rgba(255, 255, 255, 0.05)` (bumped from 0.03)
- [ ] `globals.css` has `--background-card-auth: rgba(255, 255, 255, 0.08)` token
- [ ] `@theme inline` has `--color-background-card-auth: var(--background-card-auth)`
- [ ] All card containers have `backdrop-blur-xl` (or `backdrop-blur-2xl` for auth)
- [ ] All card containers use `rounded-2xl` (not `rounded-xl`). Inner elements keep existing radius.
- [ ] Auth pages use `bg-background-card-auth backdrop-blur-2xl`
- [ ] Dashboard/landing cards use `bg-background-card backdrop-blur-xl`
- [ ] Sidebar uses glass treatment with `backdrop-blur-xl`
- [ ] Privacy notice uses indigo glass theme (not warning theme)
- [ ] All Phase 01 design tokens preserved (no raw `bg-white/5` or `text-white/50` replacing tokens)
- [ ] No `rounded-xl` remaining on card containers (only on inner elements like inputs, badges)
- [ ] The app builds without errors: `npm run build`
- [ ] All tests pass: `npx vitest run`

### Grep verification commands

```bash
# Card containers should all have backdrop-blur
grep -rn "bg-background-card" src/ --include="*.tsx"
# Verify each result also has backdrop-blur-xl on the same element

# No rounded-xl on card containers (should all be rounded-2xl now)
# Note: rounded-xl is still valid on inputs, buttons, badges — only check card wrappers

# Auth cards should use the auth variant
grep -rn "bg-background-card-auth" src/ --include="*.tsx"
```

---

## What NOT To Do

1. **Do NOT apply `backdrop-blur` to scrollable inner containers.** The `overflow-x-auto` and `overflow-y-auto` divs inside the transaction table and import preview are children of the glass card. The blur goes on the outermost card wrapper only. Applying blur to a scroll container causes severe performance degradation and visual glitches (content "smears" while scrolling).

2. **Do NOT create a new stacking context unnecessarily.** `backdrop-filter` creates a new stacking context. If you apply it to both a parent and a child element, the child's blur will not "see through" the parent. This is fine for our architecture (cards are leaf containers), but do not add `backdrop-blur` to the sidebar AND to elements inside the sidebar.

3. **Do NOT use `bg-white/5` on light backgrounds.** If Phase 01 is not merged, or if a specific element still has a light background, `bg-white/5` will be invisible. Ensure Phase 01 is complete before beginning this work.

4. **Do NOT change padding values.** The spec says to keep `p-4`, `p-6`, `p-8` exactly as they are. Only the background, blur, border, radius, and shadow properties change.

5. **Do NOT change button styles (primary action buttons).** The `bg-blue-600 hover:bg-blue-700` buttons (sign in, connect bank, save changes, import) keep their existing opaque blue styling. These are call-to-action buttons and should remain solid, not glass. The glass treatment applies to container cards and form fields only.

6. **Do NOT forget the `-webkit-` prefix for `backdrop-filter`.** When using Tailwind's `backdrop-blur-xl` class, the prefix is handled automatically. But in the `globals.css` utility class, you must include `-webkit-backdrop-filter` explicitly for Safari support.

7. **Do NOT use `backdrop-blur` on the `<body>` or root layout.** Blur is only for individual cards. The page background should remain a solid dark color (set by Phase 01).

8. **Do NOT change the Recharts chart colors** (green/red bars, blue bars, pie chart palette). Only change the grid, axes, tooltips, and reference lines to work on dark backgrounds.

9. **Watch for select/option element styling.** Native `<select>` and `<option>` elements have limited CSS styling capability. Setting `bg-white/5` on a `<select>` will work for the closed state, but the dropdown options may still render with browser defaults (white background). This is acceptable for this phase. A future phase can replace native selects with custom dropdown components if needed.

10. **Do NOT remove the `border` class when replacing.** The old pattern uses bare `border` (which defaults to `border-gray-200`). The new pattern uses `border border-white/10`. The `border` class is still needed to set `border-style: solid` and `border-width: 1px`. Writing only `border-white/10` without `border` would not render a visible border.

---

### Critical Files for Implementation
- `/Users/chris/Projects/really-personal-finance/src/app/globals.css` - Add glass utility CSS classes in @layer utilities block
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` - Sidebar is the most architecturally significant glass surface (persistent across all dashboard views)
- `/Users/chris/Projects/really-personal-finance/src/components/transaction-table.tsx` - Most complex component update (skeletons, headers, rows, hover states, badges -- 12 individual changes)
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/transactions/page.tsx` - Filter bar + table card + pagination: tests the full glass card + glass input + glass table stack together
- `/Users/chris/Projects/really-personal-finance/src/components/date-range-filter.tsx` - Shared component used by both categories and merchants pages; a single change here propagates to two routes