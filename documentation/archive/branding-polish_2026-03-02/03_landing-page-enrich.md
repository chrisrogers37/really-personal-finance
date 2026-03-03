# Phase 03: Enrich the Landing Page

**Status:** ✅ COMPLETE
**Started:** 2026-03-03
**Completed:** 2026-03-03
**PR:** #22
**PR Title:** feat: add product preview and how-it-works sections to landing page
**Risk:** Low
**Effort:** Medium
**Files created:** None
**Files modified:** `src/app/page.tsx`

---

## Context

The landing page has a strong hero with the indigo-to-violet gradient text and three feature cards. But it feels sparse — there's no product screenshot showing what the dashboard looks like, no step-by-step explanation of how the app works, and the footer CTA is weak (just text, no action). The user wants richer branding that sells the product better.

This phase adds three new sections between the existing features and trust sections, and strengthens the footer with a CTA.

---

## Dependencies

- **Blocked by:** Nothing
- **Blocks:** Nothing
- Can run in parallel with all other phases.

---

## Detailed Implementation Plan

All changes are in `src/app/page.tsx`.

### Step 1: Add a dashboard preview section after features (after line 97)

Insert a new section between the Features section (ends line 97) and the Trust Section (starts line 100). This shows a stylized representation of the dashboard to give visitors a sense of what they'll get.

```tsx
{/* Dashboard Preview */}
<section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
  <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: "300ms" }}>
    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
      Everything in{" "}
      <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
        one place
      </span>
    </h2>
    <p className="mt-3 text-foreground-muted max-w-lg mx-auto">
      A clean dashboard built for clarity, not clutter.
    </p>
  </div>

  <div className="relative animate-fade-in" style={{ animationDelay: "400ms" }}>
    {/* Decorative glow behind the preview */}
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-indigo-500/8 rounded-3xl blur-2xl -m-4 pointer-events-none"
    />
    <div className="relative bg-background-elevated border border-border rounded-2xl overflow-hidden shadow-2xl">
      {/* Mock browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
          <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="flex-1 mx-8">
          <div className="h-6 rounded-md bg-white/[0.06] max-w-xs mx-auto" />
        </div>
      </div>
      {/* Mock dashboard content */}
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-background-card rounded-xl p-4 border border-border">
            <p className="text-xs text-foreground-tertiary">Income</p>
            <p className="text-lg font-bold text-violet-400 mt-1">$4,250</p>
          </div>
          <div className="bg-background-card rounded-xl p-4 border border-border">
            <p className="text-xs text-foreground-tertiary">Spending</p>
            <p className="text-lg font-bold text-indigo-400 mt-1">$2,847</p>
          </div>
          <div className="bg-background-card rounded-xl p-4 border border-border">
            <p className="text-xs text-foreground-tertiary">Net</p>
            <p className="text-lg font-bold text-violet-400 mt-1">+$1,403</p>
          </div>
          <div className="bg-background-card rounded-xl p-4 border border-border">
            <p className="text-xs text-foreground-tertiary">Accounts</p>
            <p className="text-lg font-bold text-foreground mt-1">3</p>
          </div>
        </div>
        {/* Mock chart area */}
        <div className="bg-background-card rounded-xl border border-border p-6 h-48 flex items-end gap-2">
          {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 68].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1 items-stretch">
              <div
                className="rounded-t bg-violet-400/60"
                style={{ height: `${h * 0.6}%` }}
              />
              <div
                className="rounded-t bg-indigo-500/60"
                style={{ height: `${h * 0.4}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>
```

### Step 2: Add a "How It Works" section (after the dashboard preview)

Insert between the new dashboard preview and the trust section:

```tsx
{/* How It Works */}
<section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
  <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: "450ms" }}>
    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
      Up and running in{" "}
      <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
        minutes
      </span>
    </h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: "500ms" }}>
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
        <span className="text-sm font-bold text-indigo-400">1</span>
      </div>
      <h3 className="font-semibold mb-2">Connect or Upload</h3>
      <p className="text-sm text-foreground-muted leading-relaxed">
        Link your bank via Plaid for automatic syncing, or upload CSV exports manually.
      </p>
    </div>

    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
        <span className="text-sm font-bold text-indigo-400">2</span>
      </div>
      <h3 className="font-semibold mb-2">See Your Patterns</h3>
      <p className="text-sm text-foreground-muted leading-relaxed">
        Spending by category, by merchant, income vs. expenses — all visualized in your dashboard.
      </p>
    </div>

    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
        <span className="text-sm font-bold text-indigo-400">3</span>
      </div>
      <h3 className="font-semibold mb-2">Get Daily Insights</h3>
      <p className="text-sm text-foreground-muted leading-relaxed">
        Spending summaries and anomaly alerts delivered to Telegram. The app comes to you.
      </p>
    </div>
  </div>
</section>
```

### Step 3: Add a stronger footer CTA (replace existing footer, lines 135-140)

Replace the existing minimal footer with a CTA section + footer:

```tsx
{/* Bottom CTA */}
<section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
  <div className="relative text-center animate-fade-in" style={{ animationDelay: "600ms" }}>
    <div
      aria-hidden="true"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
    />
    <div className="relative">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Ready to take control?
      </h2>
      <p className="mt-3 text-foreground-muted">
        Free, open source, and built for people who care where their money goes.
      </p>
      <div className="mt-8">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-foreground text-lg font-medium rounded-xl transition-all duration-150 active:scale-95"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  </div>
</section>

{/* Footer */}
<footer className="border-t border-border">
  <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-foreground-tertiary">
    Really Personal Finance — Open Source
  </div>
</footer>
```

### Step 4: Add `ArrowRight` import if not already present

The `ArrowRight` import already exists on line 9 — no changes needed.

---

## Responsive Behavior

- **Desktop (1440px):** Dashboard preview shows 4-column stats grid, 12-bar chart mock. How-it-works is a 3-column grid.
- **Tablet (768px):** Dashboard preview stats go to 4 columns (still fits). How-it-works stays 3-column via `md:grid-cols-3`.
- **Mobile (375px):** Dashboard preview stats collapse to 2-column grid (`grid-cols-2 sm:grid-cols-4`). How-it-works stacks vertically. Chart bars still flex to fill width.

All sections use the existing responsive padding pattern: `px-4 sm:px-6`.

---

## Accessibility Checklist

- [x] **Mock dashboard:** Uses `aria-hidden="true"` on decorative glow elements
- [x] **Semantic headings:** H2 for each section, maintaining heading hierarchy (H1 in hero)
- [x] **Color contrast:** All text meets WCAG AA against the dark backgrounds
- [x] **Animations:** All animations use the existing `@media (prefers-reduced-motion: no-preference)` guard
- [x] **Link text:** "Get Started" CTA is descriptive and keyboard-focusable

---

## Test Plan

- [ ] Visual: Dashboard preview section appears between features and trust section
- [ ] Visual: Mock stats show violet-400 and indigo-400 values (matching new palette from Phase 01)
- [ ] Visual: How-it-works section shows 3 numbered steps
- [ ] Visual: Bottom CTA has radial glow and "Get Started" button
- [ ] Responsive: At 375px, mock stats collapse to 2-column, how-it-works stacks
- [ ] Responsive: At 768px, all sections display correctly
- [ ] Animation: Sections fade in with staggered delays on page load
- [ ] Reduced motion: All animations disabled when `prefers-reduced-motion: reduce` is set

---

## Verification Checklist

1. Load the landing page — scroll down past the hero and feature cards
2. Dashboard preview should show a mock browser window with stats and chart bars
3. How-it-works should show 3 numbered steps in indigo circles
4. Bottom of page should have "Ready to take control?" CTA with glow effect
5. Click "Get Started" — navigates to `/auth/signin`
6. Check mobile (375px) — everything stacks cleanly, no horizontal overflow

---

## What NOT To Do

- **Do NOT add real screenshots** — a mock dashboard ages better and doesn't require screenshot maintenance. The mock uses actual purple palette values so it stays in sync.
- **Do NOT add testimonials or social proof** — the app is personal/private, not a SaaS with reviews. The trust section already handles credibility.
- **Do NOT touch the existing hero, feature cards, or trust section** — they're working well. This phase only adds new sections and replaces the footer.
- **Do NOT use real financial data** in the mock — use round numbers that look realistic but aren't tied to any user.
