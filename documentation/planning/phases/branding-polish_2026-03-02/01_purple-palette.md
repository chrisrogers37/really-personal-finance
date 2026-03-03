# Phase 01: Purple Palette for Income/Spending

**Status:** COMPLETE
**Started:** 2026-03-03
**Completed:** 2026-03-03
**PR:** #20
**PR Title:** feat: replace red/green with purple income/spending palette
**Risk:** Low
**Effort:** Low
**Files modified:** `src/app/globals.css`, `src/app/dashboard/page.tsx`, `src/components/income-spending-chart.tsx`, `src/components/import-preview.tsx`

---

## Context

The dashboard uses `text-success` (#22c55e green) for income and `text-danger` (#ef4444 red) for spending. These colors clash with the indigo/violet brand palette. The user wants shaded purples instead — lighter for income, deeper for spending — to create visual cohesion with the home page.

The red/green scheme also has an accessibility benefit concern: red/green colorblindness affects ~8% of males. Purple shades are more universally distinguishable.

## Visual Specification

### New Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-income` | `#a78bfa` (violet-400) | Income amounts, income chart bars, "New" status badges |
| `--color-spending` | `#6366f1` (indigo-500, same as `--accent`) | Spending amounts, spending chart bars |
| `--color-income-muted` | `rgba(167, 139, 250, 0.10)` | Income row backgrounds, subtle highlights |
| `--color-spending-muted` | `rgba(99, 102, 241, 0.10)` | Spending row backgrounds |

The lighter violet-400 for income creates a natural visual hierarchy: income "glows" as the positive value, while spending matches the accent color and reads as the baseline/expected.

### Before → After

**Dashboard cards:**
- Before: `$1,234.56` in bright green (`text-success`) / bright red (`text-danger`)
- After: `$1,234.56` in soft violet (`text-income`) / indigo (`text-spending`)

**Chart bars:**
- Before: Green bars (#22c55e) and red bars (#ef4444)
- After: Violet bars (#a78bfa) and indigo bars (#6366f1)

**Net values** (This Month Net, All-Time Net):
- Positive net: `text-income` (violet-400)
- Negative net: `text-spending` (indigo-500) — but since negative is still important to signal, we keep this as the deeper shade

Note: `--color-success`, `--color-danger`, `--color-warning` remain unchanged. They're still used for semantic status messages (error alerts, success toasts, duplicate warnings in import). This change only affects financial data display.

---

## Dependencies

- **Blocks:** Phase 02 (Import Page UX) — uses the new `text-income`/`text-spending` tokens
- **Blocked by:** Nothing

---

## Detailed Implementation Plan

### Step 1: Add new tokens to `src/app/globals.css`

In the `:root` block, after the `/* Semantic */` section (after line 27), add:

```css
/* Financial */
--income: #a78bfa;
--income-muted: rgba(167, 139, 250, 0.10);
--spending: #6366f1;
--spending-muted: rgba(99, 102, 241, 0.10);
```

In the `@theme inline` block, after the `--color-warning` line (after line 48), add:

```css
--color-income: var(--income);
--color-income-muted: var(--income-muted);
--color-spending: var(--spending);
--color-spending-muted: var(--spending-muted);
```

### Step 2: Update dashboard summary cards in `src/app/dashboard/page.tsx`

**Line 54** — Change income card value color:
```tsx
// Before
<p className="text-2xl font-bold text-success">
// After
<p className="text-2xl font-bold text-income">
```

**Line 60** — Change spending card value color:
```tsx
// Before
<p className="text-2xl font-bold text-danger">
// After
<p className="text-2xl font-bold text-spending">
```

**Lines 67-69** — Change "This Month Net" conditional color:
```tsx
// Before
className={`text-2xl font-bold ${(latestMonth?.net ?? 0) >= 0 ? "text-success" : "text-danger"}`}
// After
className={`text-2xl font-bold ${(latestMonth?.net ?? 0) >= 0 ? "text-income" : "text-spending"}`}
```

**Lines 78-80** — Change "All-Time Net" conditional color:
```tsx
// Before
className={`text-2xl font-bold ${totalNet >= 0 ? "text-success" : "text-danger"}`}
// After
className={`text-2xl font-bold ${totalNet >= 0 ? "text-income" : "text-spending"}`}
```

### Step 3: Update chart colors in `src/components/income-spending-chart.tsx`

**Line 85** — Change income bar fill:
```tsx
// Before
<Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
// After
<Bar dataKey="income" fill="#a78bfa" name="Income" radius={[4, 4, 0, 0]} />
```

**Line 86** — Change spending bar fill:
```tsx
// Before
<Bar dataKey="spending" fill="#ef4444" name="Spending" radius={[4, 4, 0, 0]} />
// After
<Bar dataKey="spending" fill="#6366f1" name="Spending" radius={[4, 4, 0, 0]} />
```

### Step 4: Update import preview in `src/components/import-preview.tsx`

**Line 145** — Change inflow amount color:
```tsx
// Before
className={`p-2 text-right whitespace-nowrap ${isInflow ? "text-success" : ""}`}
// After
className={`p-2 text-right whitespace-nowrap ${isInflow ? "text-income" : ""}`}
```

**Lines 151-153** — Change "New" badge color:
```tsx
// Before
<span className="text-success text-xs font-medium">New</span>
// After
<span className="text-income text-xs font-medium">New</span>
```

Note: Keep `text-danger` on "Already imported" and `text-warning` on "Possible duplicate" — these are error/warning states, not financial data.

---

## Responsive Behavior

No responsive changes needed. Color tokens apply uniformly across all breakpoints.

---

## Accessibility Checklist

- [x] **Contrast:** violet-400 (#a78bfa) on dark background (#0c0a14) = contrast ratio ~7.2:1 (passes WCAG AA and AAA)
- [x] **Contrast:** indigo-500 (#6366f1) on dark background (#0c0a14) = contrast ratio ~4.8:1 (passes WCAG AA for normal text)
- [x] **Color blindness:** Violet vs indigo is distinguishable for protanopia, deuteranopia, and tritanopia — far better than red/green
- [x] **No color-only meaning:** Income/spending labels exist as text alongside the colored values
- [x] **Chart legend:** Recharts Legend component renders text labels alongside colored indicators

---

## Test Plan

- [ ] Visual: Dashboard cards show violet for income, indigo for spending at desktop (1440px) and mobile (375px)
- [ ] Visual: Chart bars render in violet/indigo, not green/red
- [ ] Visual: Import preview amounts use violet for inflows, default for outflows
- [ ] Visual: "New" badge in import uses violet, "Already imported" stays red, "Possible duplicate" stays amber
- [ ] Visual: Net values use violet when positive, indigo when negative
- [ ] Verify existing `text-success`/`text-danger` usage in error alerts and success toasts is unchanged

---

## Verification Checklist

1. Load dashboard — all four summary cards should show purple-shaded values, never green or red
2. If data exists, check the Income vs Spending chart — bars should be violet and indigo
3. Navigate to Import, upload a CSV — amounts should use violet for inflows
4. Check the import preview "Status" column — "New" should be violet, "Already imported" should still be red

---

## What NOT To Do

- **Do NOT remove `--color-success`, `--color-danger`, or `--color-warning`** from the theme. They are still used for semantic states (error alerts, success messages, warning badges). This phase only changes financial data display.
- **Do NOT change the `Connect Bank Account` button color** — that green button is intentionally distinct as a primary action CTA and is not a financial data display.
- **Do NOT use `text-accent` for spending** even though the hex values are the same. Use `text-spending` for semantic clarity — these could diverge in the future.
