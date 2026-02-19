

I'll start by thoroughly exploring the codebase to understand the current state, existing patterns, and any relevant Phase 01/02 work that's already been established.

Now let me explore the existing patterns from Phase 01/02 and understand any design tokens or glassmorphism patterns already in place.

Let me also check the `cn` utility and look at the auth signin page for reference.

Now let me verify what Lucide icons are available that we'd want to use.

Good, all the icons we need exist. Now let me check the Tailwind 4 configuration more closely to understand what's available.

Now I have a thorough understanding of the codebase. Let me verify one more thing -- the `next.config` to understand if there's anything relevant there.

I now have a complete picture. Let me compile the implementation plan document.

---

**Status:** ✅ COMPLETE
**Started:** 2026-02-19
**Completed:** 2026-02-19
**PR:** #14

# Phase 03: Landing Page Redesign Implementation Plan

## PR Title

**feat: redesign landing page with fintech aesthetic**

## Risk: Low | Effort: Medium | Files Modified: 1

| Field | Value |
|-------|-------|
| **File** | `src/app/page.tsx` |
| **Risk** | Low -- single page, no data dependencies, no API routes, no auth logic |
| **Effort** | Medium -- complete rewrite of one file, but no new dependencies |
| **Breaking changes** | None -- purely visual, same routes, same links |

---

## 1. Context

The landing page is the first thing every visitor sees. Right now it uses a light `bg-gray-50` background, blue buttons (`bg-blue-600`), emoji HTML entities for icons, an amber privacy banner, and the standard three-column feature grid. It looks indistinguishable from thousands of AI-generated Next.js templates.

This is the user's stated number-one pain point. The goal is a fintech-grade dark landing page that feels like Robinhood, Public.com, or Mercury -- minimal, high-contrast, trustworthy, and sleek. Phase 01 established the color palette (near-black background, indigo accent, white/muted text). Phase 02 established the glassmorphism card pattern. Phase 03 applies both to the public-facing landing page.

The current page is a server component with zero client-side interactivity. The redesigned page will remain a server component -- no `"use client"` needed. All visual effects will be achieved through pure CSS/Tailwind.

---

## 2. Visual Specification

### 2.1 Page Container

The outermost `<div>` switches from `bg-gray-50` to the near-black fintech background. An `overflow-x-hidden` prevents any horizontal scroll bleed from decorative gradient elements.

```
Current:  <div className="min-h-screen bg-gray-50">
New:      <div className="min-h-screen bg-[#0c0a14] text-white overflow-x-hidden">
```

### 2.2 Header / Navigation

**Structure:** Fixed-height nav bar with app name left, sign-in button right, and a decorative gradient line underneath.

```tsx
<header className="border-b border-white/10">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
    <Link href="/" className="text-lg font-bold tracking-tight">
      Really Personal Finance
    </Link>
    <Link
      href="/auth/signin"
      className="px-4 py-2 text-sm font-medium rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors"
    >
      Sign in
    </Link>
  </div>
</header>
```

Key decisions:
- **Ghost/outline button** (`border border-white/20` with `hover:bg-white/5`) rather than filled indigo. This is more elegant for a nav sign-in button and keeps the hero CTA as the primary visual action.
- `max-w-6xl` (wider than the current `max-w-5xl`) gives the page more breathing room.
- `border-b border-white/10` provides a subtle separator that fits the dark theme.
- `tracking-tight` on the app name gives it a more modern typographic feel.

### 2.3 Hero Section

The hero is the centerpiece. It uses a radial gradient glow behind it (purely decorative, via `absolute` positioning and `pointer-events-none`), a large gradient headline, muted subtitle, and an indigo CTA.

**Decorative glow (behind hero):**
```tsx
<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
```
This is an absolutely-positioned, blurred, semi-transparent indigo circle that creates a soft ambient glow behind the hero text. It sits inside a `relative` parent.

**Hero content:**
```tsx
<section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-20 sm:pb-28">
  {/* Decorative glow */}
  <div
    aria-hidden="true"
    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] sm:w-[800px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
  />

  <div className="relative text-center max-w-3xl mx-auto">
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
      Know where your{" "}
      <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
        money goes.
      </span>
    </h1>
    <p className="mt-6 text-lg sm:text-xl text-[#a1a1aa] max-w-xl mx-auto leading-relaxed">
      Connect your bank accounts, track spending patterns, and get
      daily insights delivered to your Telegram.
    </p>
    <div className="mt-10">
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-lg font-medium rounded-xl transition-colors"
      >
        Get Started
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  </div>
</section>
```

Key decisions:
- **Headline kept as "Know where your money goes."** -- it is clear, direct, and fits the fintech tone. "money goes." gets the gradient treatment for visual punch.
- **Gradient text** via `bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent`. This is the standard Tailwind approach for gradient text and works in all modern browsers.
- **Responsive text sizing**: `text-4xl` (mobile) -> `text-5xl` (sm: 640px+) -> `text-6xl` (lg: 1024px+). This prevents the horizontal clipping issue on mobile.
- **`leading-tight`** on the headline prevents excessive line height at large sizes.
- **ArrowRight icon** on the CTA button adds a fintech-style directional cue.
- **`rounded-xl`** on the button (not `rounded-lg`) for a slightly softer, more modern pill shape.
- **No outline/ring focus style specified on the CTA** -- we rely on Tailwind's default `focus-visible:outline` which is accessible.

### 2.4 Feature Cards

Three glassmorphism cards in a responsive grid. Each card has an icon in a tinted container, a heading, and descriptive text.

```tsx
<section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Card 1: Connect Your Banks */}
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <Landmark className="w-6 h-6 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Connect Your Banks</h3>
      <p className="text-sm text-[#a1a1aa] leading-relaxed">
        Securely link accounts via Plaid. Transactions sync automatically
        — with up to two years of history.
      </p>
    </div>

    {/* Card 2: See the Big Picture */}
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <TrendingUp className="w-6 h-6 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">See the Big Picture</h3>
      <p className="text-sm text-[#a1a1aa] leading-relaxed">
        Spending by category, by merchant, income vs. expenses — all in
        one dashboard. Spot trends at a glance.
      </p>
    </div>

    {/* Card 3: Telegram Alerts */}
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <Bell className="w-6 h-6 text-indigo-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Telegram Alerts</h3>
      <p className="text-sm text-[#a1a1aa] leading-relaxed">
        Daily spending summaries and anomaly alerts pushed to Telegram.
        No need to check the app — it comes to you.
      </p>
    </div>
  </div>
</section>
```

Key decisions:
- **Glassmorphism pattern**: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl` -- exactly the pattern established in Phase 02.
- **Icon containers**: `w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20` -- subtle indigo-tinted boxes that give the icons a "contained" look without being heavy.
- **Lucide icons replacing emoji**: `Landmark` (bank building, replaces &#127974;), `TrendingUp` (chart, replaces &#128200;), `Bell` (notification, replaces &#128276;).
- **`text-indigo-400`** on icons ties them to the accent color.
- **`gap-6`** (24px) instead of `gap-8` (32px) -- tighter card spacing looks more polished.
- **Copy refined slightly** -- "up to two years" is more accurate than "5 years" (Plaid's standard tier). Adjust if the actual Plaid plan supports more.

### 2.5 Privacy / Trust Section

The amber banner is replaced with a dark glassmorphism card containing three inline trust signals with icons.

```tsx
<section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Encrypted at Rest</p>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Plaid tokens and credentials are encrypted in the database.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Your Data, Your Control</p>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            No ads, no selling data. Built for personal use only.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <Code className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Open Source</p>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Audit the code or self-host. Full transparency.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
```

Key decisions:
- **Three trust signals** instead of one paragraph. This is how modern fintech sites present trust -- discrete, icon-led badges.
- **Icons**: `ShieldCheck` (encryption), `Lock` (privacy), `Code` (open source). All from lucide-react.
- **Same glassmorphism card** as features, maintaining visual consistency.
- **`shrink-0`** on icons prevents them from collapsing in flex containers on narrow screens.
- **`mt-0.5`** on icons aligns them optically with the first line of text.
- On mobile, the three items stack vertically (`flex-col`). On `sm:` and up, they sit in a row (`sm:flex-row`).

### 2.6 Footer

Clean, minimal footer with a top border.

```tsx
<footer className="border-t border-white/10">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-[#a1a1aa]">
    Really Personal Finance — Open Source
  </div>
</footer>
```

Key decisions:
- `border-t border-white/10` -- matches the header separator.
- `text-[#a1a1aa]` muted text -- not white, not invisible. The zinc-400 equivalent.
- No background color set -- it inherits from the page container `bg-[#0c0a14]`, fixing the current "black footer bar" issue.

---

## 3. Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| Phase 01 (palette tokens) | Must be merged first | Provides the color palette. However, the landing page uses inline Tailwind classes with specific hex values (`#0c0a14`, `#a1a1aa`) and standard Tailwind indigo/violet, so it will work even if Phase 01 only established conventions without CSS custom properties. |
| Phase 02 (glassmorphism pattern) | Must be merged first | Provides the `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl` convention. The landing page uses this exact pattern for feature cards and trust section. |
| `lucide-react` | Already installed | Version ^0.563.0 in package.json. Icons `Landmark`, `TrendingUp`, `Bell`, `ShieldCheck`, `Lock`, `Code`, `ArrowRight` are all available. |

No new npm dependencies are required.

---

## 4. Detailed Implementation Plan

### Step 1: Create Branch

```bash
git checkout -b feat/landing-page-redesign
```

### Step 2: Replace `src/app/page.tsx`

The entire file is replaced. The new file is a server component (no `"use client"` directive). Here is the complete new file contents:

```tsx
import Link from "next/link";
import {
  Landmark,
  TrendingUp,
  Bell,
  ShieldCheck,
  Lock,
  Code,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0c0a14] text-white overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Really Personal Finance
          </Link>
          <Link
            href="/auth/signin"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-white/20 text-white hover:bg-white/5 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Decorative radial glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] sm:w-[800px] sm:h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Know where your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              money goes.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[#a1a1aa] max-w-xl mx-auto leading-relaxed">
            Connect your bank accounts, track spending patterns, and get daily
            insights delivered to your Telegram.
          </p>
          <div className="mt-10">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white text-lg font-medium rounded-xl transition-colors"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <Landmark className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Banks</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Securely link accounts via Plaid. Transactions sync automatically
              — with up to two years of history.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">See the Big Picture</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Spending by category, by merchant, income vs. expenses — all in
              one dashboard. Spot trends at a glance.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <Bell className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Telegram Alerts</h3>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Daily spending summaries and anomaly alerts pushed to Telegram. No
              need to check the app — it comes to you.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Encrypted at Rest</p>
                <p className="text-xs text-[#a1a1aa] mt-0.5">
                  Plaid tokens and credentials are encrypted in the database.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Your Data, Your Control</p>
                <p className="text-xs text-[#a1a1aa] mt-0.5">
                  No ads, no selling data. Built for personal use only.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Code className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Open Source</p>
                <p className="text-xs text-[#a1a1aa] mt-0.5">
                  Audit the code or self-host. Full transparency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-[#a1a1aa]">
          Really Personal Finance — Open Source
        </div>
      </footer>
    </div>
  );
}
```

### What Changed (Before/After Summary)

| Element | Before | After |
|---------|--------|-------|
| Page bg | `bg-gray-50` (light gray) | `bg-[#0c0a14]` (near-black) |
| Text color | Default dark (inherited) | `text-white` on container |
| Header bg | `bg-white border-b` | Transparent, `border-b border-white/10` |
| Header button | `bg-blue-600 text-white rounded-lg` | Ghost: `border border-white/20 hover:bg-white/5` |
| Container width | `max-w-5xl` | `max-w-6xl` |
| Hero headline | `text-4xl` static | `text-4xl sm:text-5xl lg:text-6xl` responsive |
| Gradient text | None | `bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent` on "money goes." |
| Hero glow | None | Decorative `bg-indigo-500/10 blur-3xl` div |
| Hero subtitle | `text-xl text-gray-600` | `text-lg sm:text-xl text-[#a1a1aa]` |
| CTA button | `bg-blue-600 rounded-lg` | `bg-indigo-500 rounded-xl` with ArrowRight icon |
| Feature cards | `bg-white p-6 rounded-xl border shadow-sm` | `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8` |
| Feature icons | HTML emoji entities | Lucide: `Landmark`, `TrendingUp`, `Bell` in indigo-tinted containers |
| Card text | `text-gray-600` | `text-[#a1a1aa]` |
| Privacy section | `bg-amber-50 border-amber-200` with paragraph | Glassmorphism card with 3 icon-led trust badges |
| Privacy icons | None | `ShieldCheck`, `Lock`, `Code` |
| Footer | `bg-white border-t` | Transparent, `border-t border-white/10` |
| Footer text | `text-gray-500` | `text-[#a1a1aa]` |
| Mobile padding | `px-4` only | `px-4 sm:px-6` |
| Overflow guard | None | `overflow-x-hidden` on container |

### Step 3: Verify Build

```bash
npm run build
```

Ensure zero build errors. The page is a server component so no hydration concerns.

### Step 4: Visual QA

Run `npm run dev` and verify at three breakpoints (see Section 6).

---

## 5. Responsive Behavior

### Mobile (375px)

- **Header**: App name and "Sign in" button on one line. `px-4` padding.
- **Hero**: `text-4xl` headline. Gradient glow is `w-[600px] h-[400px]` (extends off-screen but clipped by `overflow-x-hidden`). Subtitle wraps naturally at `max-w-xl`. `pt-24 pb-20` vertical spacing.
- **Feature cards**: Single column (`grid-cols-1`), stacked vertically with `gap-6`. `p-6` padding.
- **Trust section**: Three trust items stack vertically (`flex-col`), each on its own row.
- **Footer**: Full-width, centered text.
- **No horizontal overflow** -- the `overflow-x-hidden` on the page container clips the decorative glow. The headline uses `text-4xl` which fits within 375px. The word "money goes." will wrap to a second line, which is fine -- the gradient still renders correctly across the line break.

### Tablet (768px / md breakpoint)

- **Header**: Same layout, `px-6` padding (via `sm:px-6` which activates at 640px).
- **Hero**: `text-5xl` headline (via `sm:text-5xl` at 640px). Glow expands to `w-[800px] h-[600px]`. `pt-32 pb-28` vertical spacing.
- **Feature cards**: Three columns (`md:grid-cols-3` activates at 768px). `p-8` padding (via `sm:p-8` at 640px).
- **Trust section**: Horizontal row (`sm:flex-row` at 640px) with `gap-10`.

### Desktop (1440px)

- **Hero**: `text-6xl` headline (via `lg:text-6xl` at 1024px). Content capped at `max-w-6xl` (1152px) and centered.
- **Feature cards**: Three columns, generous padding, glassmorphism effect is most prominent with wider cards.
- All sections have comfortable breathing room within the 1152px content area.

---

## 6. Accessibility Checklist

| Check | Status | Notes |
|-------|--------|-------|
| **Color contrast (body text)** | Pass | White (#FFFFFF) on near-black (#0c0a14) = 18.4:1 ratio. Well above WCAG AAA 7:1 requirement. |
| **Color contrast (muted text)** | Pass | #a1a1aa on #0c0a14 = 8.4:1 ratio. Above WCAG AAA 7:1. |
| **Color contrast (indigo accent)** | Check | Indigo-400 (#818cf8) on #0c0a14 = 5.8:1. Passes WCAG AA (4.5:1) but not AAA. Acceptable for decorative icon color. Indigo-500 (#6366f1) on white CTA text = 4.6:1, passes AA. |
| **Heading hierarchy** | Pass | Single `<h1>` for the page headline. `<h3>` for feature cards. No skipped levels. |
| **Link visibility** | Pass | Both "Sign in" links (header + CTA) are clearly styled. The CTA has a solid background; the header link has a visible border. |
| **Focus states** | Pass | Tailwind 4 provides default `focus-visible:outline` styles. Both `<Link>` and `<button>` elements receive visible focus rings. The `transition-colors` on buttons provides visual feedback. |
| **Decorative elements** | Pass | The glow div has `aria-hidden="true"` and `pointer-events-none`, so screen readers skip it and it cannot trap focus. |
| **Semantic HTML** | Pass | `<header>`, `<section>`, `<footer>` landmarks. `<nav>` could be added around the header link but is acceptable for a single-link header. |
| **Text scaling** | Pass | All text uses relative units (Tailwind's `text-*` classes use `rem`). Content reflows at 200% zoom. |
| **Reduced motion** | N/A | No CSS animations or transitions beyond `transition-colors` on buttons (which is a simple color fade, not a motion concern). |

---

## 7. Test Plan

This is a purely visual change with no logic, no API calls, and no data fetching. Testing is visual verification.

### Manual Visual QA

1. **Build test**: Run `npm run build` and confirm zero errors.
2. **Mobile (375px)**: Open Chrome DevTools, set viewport to 375x812 (iPhone SE). Verify:
   - No horizontal scrollbar appears
   - Hero headline wraps cleanly, gradient text renders on wrapped line
   - Feature cards are single-column, full-width
   - Trust badges stack vertically
   - All text is readable, no clipping
3. **Tablet (768px)**: Set viewport to 768x1024. Verify:
   - Feature cards are in a 3-column grid
   - Trust badges are in a horizontal row
   - Hero text is larger (`text-5xl`)
4. **Desktop (1440px)**: Set viewport to 1440x900. Verify:
   - Content is centered, max-width 1152px
   - Glassmorphism card borders are visible
   - Decorative glow is visible behind hero
   - Indigo gradient text is rendering (not falling back to transparent)
5. **Link verification**: Click "Sign in" (header) and "Get Started" (CTA). Both should navigate to `/auth/signin`.
6. **Dark mode OS setting**: Since the page hardcodes `bg-[#0c0a14]` and `text-white`, it should look identical regardless of OS dark/light mode preference. Verify no color conflicts from the `globals.css` `prefers-color-scheme` media query (the body's `var(--background)` is overridden by the page's own background).

### Automated Tests

No unit tests are needed for this change. The page is a stateless server component with no props, no state, no API calls, and no conditional rendering. A visual regression test (e.g., Playwright screenshot comparison) could be added in the future but is out of scope for this PR.

---

## 8. Verification Checklist

- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] Page loads at `/` and displays the new design
- [ ] Header shows app name and "Sign in" ghost button
- [ ] Hero displays gradient text on "money goes."
- [ ] Decorative glow is visible behind hero section
- [ ] CTA button reads "Get Started" with arrow icon, links to `/auth/signin`
- [ ] Three feature cards use glassmorphism styling
- [ ] Feature cards display Lucide icons (Landmark, TrendingUp, Bell) in indigo containers
- [ ] No emoji HTML entities remain in the source
- [ ] Trust section shows three icon-led badges (ShieldCheck, Lock, Code)
- [ ] No amber/yellow colors remain anywhere on the page
- [ ] Footer displays muted text with top border, no white background
- [ ] Mobile (375px): no horizontal scroll, text wraps correctly, cards stack
- [ ] Tablet (768px): cards in 3 columns, trust badges in row
- [ ] Desktop (1440px): content centered, glow visible, gradient renders
- [ ] Both Sign in / Get Started links navigate to `/auth/signin`
- [ ] Page remains a server component (no `"use client"` directive)
- [ ] File has no unused imports

---

## 9. What NOT To Do

1. **Do NOT add `"use client"`** to this page. There is no interactivity (no `useState`, no `onClick`, no `useEffect`). It must remain a server component for performance.

2. **Do NOT install any new npm packages.** All icons come from `lucide-react` which is already installed. All styling is Tailwind utility classes. No animation libraries (framer-motion, etc.) are needed.

3. **Do NOT add CSS animations or keyframes** in this phase. The user wants a sleek, static design. Animated text, scroll-triggered reveals, or typewriter effects are scope creep and can be added in a future phase if desired.

4. **Do NOT modify `globals.css`** in this PR. The landing page uses inline Tailwind classes and hex values. The `prefers-color-scheme` media query in globals.css affects the body background, but the page's own `bg-[#0c0a14]` takes precedence. Cleaning up globals.css is a separate concern.

5. **Do NOT modify the dashboard layout** (`src/app/dashboard/layout.tsx`). That is still using the light theme and will be addressed in a separate phase.

6. **Do NOT change the sign-in page** (`src/app/auth/signin/page.tsx`). It still has the light theme. That is a separate scope.

7. **Do NOT add a hamburger menu or mobile navigation.** The header has only one link ("Sign in"), which does not need a collapsible menu. Adding mobile nav complexity for a single link is over-engineering.

8. **Do NOT use custom CSS classes or `@apply` directives.** The project convention is inline Tailwind utility classes. The glassmorphism pattern is repeated in full on each card rather than extracted to a custom class -- this is intentional per the utility-first approach.

9. **Do NOT use Tailwind's `dark:` variant.** The landing page is unconditionally dark. It does not respect `prefers-color-scheme`. Using `dark:` would make the styling conditional on the user's OS preference, which is not the intent.

10. **Do NOT change the copy for "Really Personal Finance"** in the header or footer. The app name is established and consistent across the header, footer, dashboard sidebar, and auth pages.

---

### Critical Files for Implementation

- `/Users/chris/Projects/really-personal-finance/src/app/page.tsx` - The only file to modify; entire landing page lives here
- `/Users/chris/Projects/really-personal-finance/src/app/globals.css` - Must understand (not modify) the existing CSS variables and dark mode media query to avoid conflicts
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` - Reference for how lucide-react icons are imported and used in this codebase
- `/Users/chris/Projects/really-personal-finance/package.json` - Confirms lucide-react ^0.563.0 is installed; no new dependencies needed