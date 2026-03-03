# Phase 04: Polish the Sign-In Page

**Status:** ✅ COMPLETE
**Started:** 2026-03-03
**Completed:** 2026-03-03
**PR:** #23
**PR Title:** feat: polish sign-in page with gradient branding and home link
**Risk:** Low
**Effort:** Low
**Files modified:** `src/app/auth/signin/page.tsx`

---

## Context

The sign-in page is functional and uses the frosted glass card aesthetic. But compared to the landing page, it's missing: (1) the gradient text treatment on the heading, (2) any way to navigate back to the landing page, and (3) visual reinforcement of what the user is signing into. This phase brings it in line with the brand identity established on the home page.

---

## Dependencies

- **Blocked by:** Nothing
- **Blocks:** Nothing
- Can run in parallel with all other phases.

---

## Detailed Implementation Plan

All changes in `src/app/auth/signin/page.tsx`.

### Step 1: Add imports

Add `Link` and `ArrowLeft` to the imports (top of file, after line 4):

```tsx
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
```

### Step 2: Add "Back to home" link

In the main sign-in form return block (line 40), add a back link above the card. After the radial gradient div (line 41), before the card div (line 42):

```tsx
{/* Back link */}
<Link
  href="/"
  className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors duration-150"
>
  <ArrowLeft className="w-4 h-4" />
  Home
</Link>
```

Also add the same back link in the "Check your email" confirmation state (after line 24, before the card div):

```tsx
<Link
  href="/"
  className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors duration-150"
>
  <ArrowLeft className="w-4 h-4" />
  Home
</Link>
```

### Step 3: Upgrade heading to gradient text

**Line 44** — Replace the flat heading with gradient treatment:

```tsx
// Before
<h1 className="text-2xl font-bold">Really <span className="text-indigo-400">Personal</span> Finance</h1>

// After
<h1 className="text-2xl font-bold">
  Really{" "}
  <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
    Personal
  </span>{" "}
  Finance
</h1>
```

Also update the heading in the "Check your email" state (line 28):

```tsx
// This heading doesn't have the brand name, so no change needed — it just says "Check your email"
```

### Step 4: Add a subtle tagline below the subtitle

**Line 46** — Enhance the subtitle:

```tsx
// Before
<p className="text-foreground-muted mt-2">
  Sign in or create an account to get started
</p>

// After
<p className="text-foreground-muted mt-2">
  Track your spending, your way.
</p>
```

This is shorter and more brand-oriented than the generic "Sign in or create an account" — the form itself makes it obvious you can sign in.

### Step 5: Strengthen the radial background glow

**Line 41** — Make the background glow more prominent to match the landing page:

```tsx
// Before
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />

// After
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.20),transparent_60%)]" />
```

Apply the same change in the "Check your email" state (line 24):

```tsx
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.20),transparent_60%)]" />
```

---

## Responsive Behavior

- **Desktop (1440px):** "Home" link sits in the top-left corner. Card centered with max-w-md.
- **Tablet (768px):** Same layout — no changes needed.
- **Mobile (375px):** "Home" link still visible at `top-6 left-6`. Card has `mx-4` padding already. The gradient text wraps naturally.

No breakpoint-specific changes required. The existing layout is already responsive.

---

## Accessibility Checklist

- [x] **Back link:** Uses semantic `<Link>` with visible text "Home" — keyboard accessible and screen-reader friendly
- [x] **Back link icon:** `ArrowLeft` is decorative, paired with text label — no `aria-label` needed
- [x] **Gradient text:** The gradient is on `<span>` within the heading — screen readers read the full text "Really Personal Finance"
- [x] **Background glow:** Already has no pointer events and is decorative
- [x] **Focus indicators:** Existing focus rings on form inputs and buttons are preserved

---

## Test Plan

- [ ] Visual: "Home" link appears in the top-left corner on the sign-in page
- [ ] Visual: "Personal" in the heading has the indigo-to-violet gradient
- [ ] Visual: Subtitle reads "Track your spending, your way."
- [ ] Visual: Background glow is slightly more prominent than before
- [ ] Interactive: Clicking "Home" navigates to `/`
- [ ] Visual: "Check your email" state also has the back link and enhanced glow
- [ ] Responsive: At 375px, back link and card display correctly with no overflow

---

## Verification Checklist

1. Navigate to `/auth/signin` — "Home" link should be visible top-left
2. Click "Home" — should go back to the landing page
3. Heading "Personal" should have purple-to-violet gradient, not flat indigo
4. Background should have a slightly brighter indigo glow
5. Enter an email and submit — "Check your email" state should also have the "Home" link
6. Resize to mobile — layout should not break

---

## What NOT To Do

- **Do NOT add the full landing page header** to the sign-in page. The clean, minimal centered layout is intentional. A full header would be heavy for an auth page. The small "Home" link is sufficient.
- **Do NOT change button styles or form styling** — they already match the design system. This phase is only about branding and navigation.
- **Do NOT add animations beyond what exists** — the `animate-scale-in` on the card is enough. Adding more animations to an auth page feels gratuitous.
- **Do NOT change the "Check your email" heading text** — "Check your email" is clear and functional.
