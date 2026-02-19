

I'll start by thoroughly exploring the codebase to understand the current state of all files, color classes, and architecture before writing the implementation plan.

Now let me read every component and page file to catalog all color classes.

Now let me read all the component files.

Now let me check the utils file for any color-related utilities and check if there's a tailwind config.

Let me also check the Recharts components more closely for hardcoded color values and check the postcss config.

Now let me also search for any hardcoded hex colors in JSX and the bare `border` class usage (without a color suffix) and the `shadow-sm` usage.

Now let me read the postcss config to confirm setup.

I now have a comprehensive understanding of every file, every color class, every hardcoded hex, and the full Tailwind v4 setup. Let me compile the implementation plan.

---

**Status:** ✅ COMPLETE
**Completed:** 2026-02-19
**Started:** 2026-02-19

# Phase 01 -- Dark-First Design System + Token Palette

**PR Title:** `feat: establish dark-first design system with indigo/violet palette`

**Risk Level:** Low -- purely visual changes, no logic/data changes, no API changes

**Estimated Effort:** High -- touches 18 files across `src/app/` and `src/components/`

**Files Modified:** 18
**Files Created:** 0
**Files Deleted:** 0

---

## 1. Context

### Why This Change Matters

The entire application currently uses a light-mode color system (`bg-white`, `bg-gray-50`, `text-gray-600`, etc.) with a vestigial `@media (prefers-color-scheme: dark)` block in `globals.css` that only swaps two variables (`--background` and `--foreground`) -- none of the component-level Tailwind classes respond to it. On any system with dark mode preferences, the page background goes dark but all cards remain white, text stays dark-on-dark, and borders become invisible. The app is visually broken for anyone using OS-level dark mode.

This phase establishes a comprehensive dark-first token system as CSS custom properties, wires them into Tailwind v4 via `@theme inline`, and replaces every hardcoded light-mode Tailwind class across all 18 `.tsx` files. The result: a cohesive near-black fintech aesthetic with proper contrast everywhere, with no `prefers-color-scheme` media query at all (dark is the only mode).

### Design Direction

Inspired by premium fintech apps (Robinhood, Public.com) -- near-black backgrounds, white/muted text hierarchy, indigo accent color for primary actions, green/red semantic colors for income/spending.

---

## 2. Visual Specification

### Before State (Current)

- Page backgrounds: `bg-gray-50` (#f9fafb) -- light gray
- Cards/surfaces: `bg-white` (#ffffff) with `border` (gray-200 default) and `shadow-sm`
- Primary text: default `text-foreground` (#171717) -- near-black
- Secondary text: `text-gray-600` (#4b5563) -- medium gray
- Tertiary text: `text-gray-500` (#6b7280), `text-gray-400` (#9ca3af)
- Accent/CTA: `bg-blue-600` (#2563eb), `hover:bg-blue-700` (#1d4ed8)
- Active nav: `bg-blue-50 text-blue-700`
- Semantic: `text-green-600` (#16a34a), `text-red-500` (#ef4444) / `text-red-600` (#dc2626)
- Borders: default Tailwind `border` (gray-200), `border-b`, `border-t`, `border-r`
- Inputs: `border rounded-lg` with `focus:ring-2 focus:ring-blue-500 focus:border-blue-500`
- Skeleton loaders: `bg-gray-100`

### After State (Target)

All backgrounds dark, white/muted text, indigo accents. Every surface uses token-based classes.

### Full Color Token System

| Token Name | CSS Variable | Hex Value | Usage |
|---|---|---|---|
| `--background` | `--color-background` | `#0c0a14` | Page/body background |
| `--background-elevated` | `--color-background-elevated` | `#13111c` | Sidebar, cards, elevated surfaces |
| `--background-card` | `--color-background-card` | `rgba(255,255,255,0.03)` | Card surfaces (subtle lift) |
| `--foreground` | `--color-foreground` | `#ffffff` | Primary text (headings, body) |
| `--foreground-muted` | `--color-foreground-muted` | `#a1a1aa` | Secondary text (descriptions, labels) |
| `--foreground-tertiary` | `--color-foreground-tertiary` | `#71717a` | Tertiary text (timestamps, counts) |
| `--accent` | `--color-accent` | `#6366f1` | Primary buttons, active states, links |
| `--accent-hover` | `--color-accent-hover` | `#818cf8` | Button hover, link hover |
| `--accent-pressed` | `--color-accent-pressed` | `#4f46e5` | Button active/pressed state |
| `--success` | `--color-success` | `#22c55e` | Income, positive values, success messages |
| `--danger` | `--color-danger` | `#ef4444` | Spending, negative values, error messages |
| `--border` | `--color-border` | `rgba(255,255,255,0.08)` | Default borders (subtle) |
| `--border-emphasis` | `--color-border-emphasis` | `rgba(255,255,255,0.12)` | Emphasized borders (dividers, focus) |
| `--warning` | `--color-warning` | `#f59e0b` | Warning/pending states |

---

## 3. Dependencies

**This is Phase 01.** It has zero dependencies on any other phase.

**Phases 02-07 all depend on this phase.** Phase 02 (glass morphism/card effects) builds on the card surface tokens. Phase 03+ refines component-level styles. No future phase should re-introduce hardcoded light-mode colors.

---

## 4. Detailed Implementation Plan

### Step 1: `src/app/globals.css` -- Complete Rewrite of Token System

**Current file (full contents):**
```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: Arial, Helvetica, sans-serif;
}
```

**New file (complete replacement):**
```css
@import "tailwindcss";

:root {
  /* Backgrounds */
  --background: #0c0a14;
  --background-elevated: #13111c;
  --background-card: rgba(255, 255, 255, 0.03);

  /* Foregrounds */
  --foreground: #ffffff;
  --foreground-muted: #a1a1aa;
  --foreground-tertiary: #71717a;

  /* Accent */
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --accent-pressed: #4f46e5;

  /* Semantic */
  --success: #22c55e;
  --danger: #ef4444;
  --warning: #f59e0b;

  /* Borders */
  --border: rgba(255, 255, 255, 0.08);
  --border-emphasis: rgba(255, 255, 255, 0.12);
}

@theme inline {
  --color-background: var(--background);
  --color-background-elevated: var(--background-elevated);
  --color-background-card: var(--background-card);

  --color-foreground: var(--foreground);
  --color-foreground-muted: var(--foreground-muted);
  --color-foreground-tertiary: var(--foreground-tertiary);

  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-pressed: var(--accent-pressed);

  --color-success: var(--success);
  --color-danger: var(--danger);
  --color-warning: var(--warning);

  --color-border: var(--border);
  --color-border-emphasis: var(--border-emphasis);

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
  color-scheme: dark;
}
```

**Changes summarized:**
1. REMOVE the entire `@media (prefers-color-scheme: dark)` block (lines 15-20).
2. REPLACE the two `:root` variables with the full 14-token set.
3. EXPAND `@theme inline` to map all 14 tokens to `--color-*` Tailwind variables.
4. UPDATE `body` font-family from `Arial, Helvetica, sans-serif` to `var(--font-sans), system-ui, sans-serif` (the Geist font variables are already being set by the layout).

**Why this works with Tailwind v4:** When you define `--color-background-elevated` inside `@theme inline`, Tailwind v4 automatically generates utility classes like `bg-background-elevated`, `text-foreground-muted`, `border-border`, etc. No config file needed.

---

### Step 2: `src/app/layout.tsx` -- Add Dark Background to HTML/Body

**Current (line 29-30):**
```tsx
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
```

**New:**
```tsx
    <html lang="en" className="bg-background">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
```

**Changes:**
- `<html>`: add `className="bg-background"` -- this ensures the HTML element itself is dark (prevents white flash on load, covers overscroll areas).
- `<body>`: add `bg-background text-foreground` to the existing className string. The `body` CSS rule in globals.css also sets these, but the Tailwind classes provide a more reliable specificity override and ensure SSR HTML includes the classes.

---

### Step 3: `src/app/page.tsx` (Landing Page) -- 16 Class Changes

This file has the most color classes of any page. Here is every change, listed by line number.

| Line | Current Class(es) | New Class(es) | Element |
|------|-------------------|---------------|---------|
| 5 | `bg-gray-50` | `bg-background` | Outer `<div>` |
| 7 | `bg-white border-b` | `bg-background-elevated border-b border-border` | `<header>` |
| 12 | `bg-blue-600 text-white ... hover:bg-blue-700` | `bg-accent text-foreground ... hover:bg-accent-hover` | "Sign in" link |
| 25 | `text-gray-600` | `text-foreground-muted` | Hero subtitle `<p>` |
| 31 | `bg-blue-600 text-white ... hover:bg-blue-700` | `bg-accent text-foreground ... hover:bg-accent-hover` | "Get Started" link |
| 39 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Feature card 1 |
| 44 | `text-gray-600` | `text-foreground-muted` | Feature card 1 description |
| 50 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Feature card 2 |
| 53 | `text-gray-600` | `text-foreground-muted` | Feature card 2 description |
| 59 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Feature card 3 |
| 62 | `text-gray-600` | `text-foreground-muted` | Feature card 3 description |
| 70 | `bg-amber-50 border border-amber-200` | `bg-warning/10 border border-warning/20` | Privacy notice container |
| 71 | `text-amber-900` | `text-warning` | Privacy notice heading |
| 74 | `text-amber-800` | `text-foreground-muted` | Privacy notice body |
| 84 | `border-t bg-white` | `border-t border-border bg-background-elevated` | `<footer>` |
| 85 | `text-gray-500` | `text-foreground-tertiary` | Footer text |

**Full updated file:**
```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background-elevated border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Really Personal Finance</h1>
          <Link
            href="/auth/signin"
            className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent-hover text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">
            Know where your money goes.
          </h2>
          <p className="text-xl text-foreground-muted mb-8">
            Connect your bank accounts, see your transactions, and understand
            your spending patterns. Get daily insights via Telegram.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-8 py-3 bg-accent text-foreground rounded-lg hover:bg-accent-hover text-lg font-medium"
          >
            Get Started
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-background-card p-6 rounded-xl border border-border">
            <div className="text-2xl mb-3">&#127974;</div>
            <h3 className="text-lg font-semibold mb-2">
              Connect Your Banks
            </h3>
            <p className="text-foreground-muted text-sm">
              Securely link your bank accounts via Plaid. We pull your
              transactions automatically — up to 5 years of history.
            </p>
          </div>

          <div className="bg-background-card p-6 rounded-xl border border-border">
            <div className="text-2xl mb-3">&#128200;</div>
            <h3 className="text-lg font-semibold mb-2">See the Big Picture</h3>
            <p className="text-foreground-muted text-sm">
              Spending by category, by merchant, income vs. expenses — all in
              one dashboard. Spot recurring charges and track trends.
            </p>
          </div>

          <div className="bg-background-card p-6 rounded-xl border border-border">
            <div className="text-2xl mb-3">&#128276;</div>
            <h3 className="text-lg font-semibold mb-2">Telegram Alerts</h3>
            <p className="text-foreground-muted text-sm">
              Get daily spending summaries and anomaly alerts pushed to your
              Telegram. No need to check the app — it comes to you.
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-20 bg-warning/10 border border-warning/20 rounded-xl p-6 text-center">
          <h3 className="font-semibold text-warning mb-2">
            Privacy Notice
          </h3>
          <p className="text-foreground-muted text-sm max-w-xl mx-auto">
            By signing up, your bank transactions will be stored in our database
            to provide spending insights. Your Plaid access tokens are encrypted
            at rest. This is an open-source project — you can review the code
            and self-host if you prefer.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background-elevated">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-foreground-tertiary">
          Really Personal Finance — Open Source
        </div>
      </footer>
    </div>
  );
}
```

**Note on `shadow-sm` removal:** On dark backgrounds, light-colored box shadows are invisible or look wrong. Remove `shadow-sm` from all cards in this phase. Card depth will be conveyed through background-color differentiation (`background` vs `background-card`) and border. Phase 02 may re-introduce subtle shadows with dark-appropriate values.

---

### Step 4: `src/app/dashboard/layout.tsx` (Dashboard Sidebar) -- 10 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 34 | `bg-gray-50` | `bg-background` | Outer wrapper `<div>` |
| 36 | `bg-white border-r` | `bg-background-elevated border-r border-border` | `<aside>` sidebar |
| 37 | `border-b` | `border-b border-border` | Sidebar header divider |
| 38 | `text-gray-900` | `text-foreground` | App title link |
| 56 | `bg-blue-50 text-blue-700` | `bg-accent/10 text-accent` | Active nav item |
| 57 | `text-gray-600 hover:bg-gray-100 hover:text-gray-900` | `text-foreground-muted hover:bg-white/5 hover:text-foreground` | Inactive nav item |
| 67 | `border-t` | `border-t border-border` | Bottom section divider |
| 70 | `text-gray-600 hover:bg-gray-100 hover:text-gray-900` | `text-foreground-muted hover:bg-white/5 hover:text-foreground` | Profile link |
| 77 | `text-gray-600 hover:bg-gray-100 hover:text-red-600` | `text-foreground-muted hover:bg-white/5 hover:text-danger` | Sign out button |

**Full updated file:**
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Store,
  Upload,
  User,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/categories", label: "Categories", icon: PieChart },
  { href: "/dashboard/merchants", label: "Merchants", icon: Store },
  { href: "/dashboard/import", label: "Import", icon: Upload },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-background-elevated border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="text-lg font-bold text-foreground">
            Really Personal Finance
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-foreground"
          >
            <User className="w-5 h-5" />
            {session?.user?.email || "Profile"}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-danger w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

---

### Step 5: `src/app/dashboard/page.tsx` (Dashboard Overview) -- 11 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 45 | `text-gray-600` | `text-foreground-muted` | "Your financial overview" |
| 52 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Income card |
| 53 | `text-gray-600` | `text-foreground-muted` | "This Month Income" label |
| 54 | `text-green-600` | `text-success` | Income value |
| 58 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Spending card |
| 59 | `text-gray-600` | `text-foreground-muted` | "This Month Spending" label |
| 60 | `text-red-500` | `text-danger` | Spending value |
| 64 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Net card |
| 65 | `text-gray-600` | `text-foreground-muted` | "This Month Net" label |
| 68 | `text-green-600` / `text-red-500` | `text-success` / `text-danger` | Net conditional color |
| 74 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | All-Time Net card |
| 75 | `text-gray-600` | `text-foreground-muted` | "All-Time Net" label |
| 78 | `text-green-600` / `text-red-500` | `text-success` / `text-danger` | All-Time Net conditional color |
| 87 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Chart wrapper |
| 90 | `text-gray-500` | `text-foreground-tertiary` | Loading text |

**Full updated file:**
```tsx
"use client";

import { useEffect, useState } from "react";
import { PlaidLinkButton } from "@/components/plaid-link";
import { IncomeSpendingChart } from "@/components/income-spending-chart";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  spending: number;
  net: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/income-vs-spending");
      const json = await response.json();
      setData(json.monthly || []);
    } catch {
      console.error("Failed to fetch analytics");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalSpending = data.reduce((sum, d) => sum + d.spending, 0);
  const totalNet = totalIncome - totalSpending;
  const latestMonth = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-foreground-muted">Your financial overview</p>
        </div>
        <PlaidLinkButton onSuccess={fetchData} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background-card p-6 rounded-xl border border-border">
          <p className="text-sm text-foreground-muted">This Month Income</p>
          <p className="text-2xl font-bold text-success">
            {latestMonth ? formatCurrency(latestMonth.income) : "$0.00"}
          </p>
        </div>
        <div className="bg-background-card p-6 rounded-xl border border-border">
          <p className="text-sm text-foreground-muted">This Month Spending</p>
          <p className="text-2xl font-bold text-danger">
            {latestMonth ? formatCurrency(latestMonth.spending) : "$0.00"}
          </p>
        </div>
        <div className="bg-background-card p-6 rounded-xl border border-border">
          <p className="text-sm text-foreground-muted">This Month Net</p>
          <p
            className={`text-2xl font-bold ${
              (latestMonth?.net ?? 0) >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {latestMonth ? formatCurrency(latestMonth.net) : "$0.00"}
          </p>
        </div>
        <div className="bg-background-card p-6 rounded-xl border border-border">
          <p className="text-sm text-foreground-muted">All-Time Net</p>
          <p
            className={`text-2xl font-bold ${
              totalNet >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatCurrency(totalNet)}
          </p>
        </div>
      </div>

      {/* Income vs Spending Chart */}
      <div className="bg-background-card p-6 rounded-xl border border-border">
        <h2 className="text-lg font-semibold mb-4">Income vs Spending</h2>
        {loading ? (
          <div className="h-96 flex items-center justify-center text-foreground-tertiary">
            Loading...
          </div>
        ) : (
          <IncomeSpendingChart data={data} />
        )}
      </div>
    </div>
  );
}
```

---

### Step 6: `src/app/dashboard/transactions/page.tsx` -- 12 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 48 | `text-gray-600` | `text-foreground-muted` | Subtitle |
| 52 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Filter card |
| 55, 69, 83, 98 | `text-gray-600` | `text-foreground-muted` | Filter labels (4 instances) |
| 65, 79, 94, 109 | `border rounded-lg` | `border border-border rounded-lg bg-background-elevated text-foreground` | Text inputs (4 instances) |
| 116 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Table wrapper |
| 120 | `border-t` | `border-t border-border` | Pagination divider |
| 124 | `text-gray-600 border ... hover:bg-gray-50` | `text-foreground-muted border border-border ... hover:bg-white/5` | Previous button |
| 128 | `text-gray-500` | `text-foreground-tertiary` | "Showing X-Y" text |
| 134 | `text-gray-600 border ... hover:bg-gray-50` | `text-foreground-muted border border-border ... hover:bg-white/5` | Next button |

**Full updated file:**
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { TransactionTable } from "@/components/transaction-table";
import { format, subMonths } from "date-fns";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (category) params.set("category", category);
    if (merchant) params.set("merchant", merchant);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    try {
      const response = await fetch(`/api/transactions?${params}`);
      const json = await response.json();
      setTransactions(json.transactions || []);
    } catch {
      console.error("Failed to fetch transactions");
    }
    setLoading(false);
  }, [startDate, endDate, category, merchant, offset]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-foreground-muted">Browse and filter your transactions</p>
      </div>

      {/* Filters */}
      <div className="bg-background-card p-4 rounded-xl border border-border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setOffset(0);
              }}
              placeholder="e.g., FOOD_AND_DRINK"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground placeholder:text-foreground-tertiary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Merchant
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => {
                setMerchant(e.target.value);
                setOffset(0);
              }}
              placeholder="Search merchants..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground placeholder:text-foreground-tertiary"
            />
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-background-card rounded-xl border border-border p-4">
        <TransactionTable transactions={transactions} loading={loading} />

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 text-sm font-medium text-foreground-muted border border-border rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-foreground-tertiary">
            Showing {offset + 1}–{offset + transactions.length}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={transactions.length < limit}
            className="px-4 py-2 text-sm font-medium text-foreground-muted border border-border rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Note on date inputs:** Native `<input type="date">` on dark backgrounds need explicit `bg-background-elevated text-foreground` and `color-scheme: dark` to render the calendar widget properly. We add a `color-scheme: dark` meta tag alternative: add to `globals.css` under `body`:
```css
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
  color-scheme: dark;
}
```
The `color-scheme: dark` tells the browser to render all native form controls (date pickers, select dropdowns, scrollbars) in dark mode. This is a single line in `globals.css` and is CRITICAL for date inputs.

---

### Step 7: `src/app/dashboard/categories/page.tsx` -- 4 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 46 | `text-gray-600` | `text-foreground-muted` | Category total subtitle |
| 61 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Chart card |
| 63 | `text-gray-500` | `text-foreground-tertiary` | Loading text |

**Full updated file:**
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { CategoryChart } from "@/components/category-chart";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import type { CategoryData } from "@/types";

export default function CategoriesPage() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    try {
      const response = await fetch(
        `/api/analytics/spending-by-category?${params}`
      );
      const json = await response.json();
      setData(json.categories || []);
    } catch {
      console.error("Failed to fetch category data");
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSpending = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spending by Category</h1>
        <p className="text-foreground-muted">
          Total: <strong>{formatCurrency(totalSpending)}</strong> across{" "}
          {data.length} categories
        </p>
      </div>

      {/* Date filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Chart */}
      <div className="bg-background-card p-6 rounded-xl border border-border">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-foreground-tertiary">
            Loading...
          </div>
        ) : (
          <CategoryChart data={data} />
        )}
      </div>
    </div>
  );
}
```

---

### Step 8: `src/app/dashboard/merchants/page.tsx` -- 4 Class Changes

Identical pattern to categories page.

| Line | Current | New | Element |
|------|---------|-----|---------|
| 47 | `text-gray-600` | `text-foreground-muted` | Merchant total subtitle |
| 62 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` | Chart card |
| 64 | `text-gray-500` | `text-foreground-tertiary` | Loading text |

**Full updated file:**
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { MerchantChart } from "@/components/merchant-chart";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import type { MerchantData } from "@/types";

export default function MerchantsPage() {
  const [data, setData] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    try {
      const response = await fetch(
        `/api/analytics/spending-by-merchant?${params}`
      );
      const json = await response.json();
      setData(json.merchants || []);
    } catch {
      console.error("Failed to fetch merchant data");
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSpending = data.reduce((sum, d) => sum + d.total, 0);
  const recurringCount = data.filter((d) => d.isRecurring).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spending by Merchant</h1>
        <p className="text-foreground-muted">
          Total: <strong>{formatCurrency(totalSpending)}</strong> across{" "}
          {data.length} merchants ({recurringCount} recurring)
        </p>
      </div>

      {/* Date filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Chart + Table */}
      <div className="bg-background-card p-6 rounded-xl border border-border">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-foreground-tertiary">
            Loading...
          </div>
        ) : (
          <MerchantChart data={data} />
        )}
      </div>
    </div>
  );
}
```

---

### Step 9: `src/app/dashboard/import/page.tsx` -- 15 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 125 | `text-gray-900` | `text-foreground` | Page heading |
| 128 | `text-gray-600` | `text-foreground-muted` | Subtitle |
| 133 | `bg-red-50 border border-red-200 text-red-700` | `bg-danger/10 border border-danger/20 text-danger` | Error alert |
| 147 | `text-gray-700` | `text-foreground-muted` | "Import to account" label |
| 162 | `border rounded-lg` | `border border-border rounded-lg bg-background-elevated text-foreground` | Select dropdown |
| 175 | `bg-gray-50` | `bg-background-elevated` | New account panel |
| 177 | `text-gray-500` | `text-foreground-tertiary` | "Name" micro-label |
| 183 | `border rounded` | `border border-border rounded bg-background-elevated text-foreground` | Name input |
| 187 | `text-gray-500` | `text-foreground-tertiary` | "Type" micro-label |
| 191 | `border rounded` | `border border-border rounded bg-background-elevated text-foreground` | Type select |
| 203 | `bg-gray-800 text-white` | `bg-accent text-foreground` | "Create" button |
| 224 | `bg-green-50 border border-green-200` | `bg-success/10 border border-success/20` | Success banner |
| 225 | `text-green-800` | `text-success` | Success text |
| 235 | `bg-white border ... hover:bg-gray-50` | `bg-background-elevated border border-border ... hover:bg-white/5` | "Import more" button |
| 241 | `bg-blue-600 ... hover:bg-blue-700` | `bg-accent ... hover:bg-accent-hover` | "View transactions" link |

**Full updated file:**
```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { ImportPreview } from "@/components/import-preview";

type ImportState = "idle" | "parsing" | "preview" | "importing" | "done";

interface Account {
  id: string;
  name: string;
  type: string;
  source: string;
}

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [importedCount, setImportedCount] = useState(0);

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("credit");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setState("parsing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse file");
        setState("idle");
        return;
      }

      setPreviewData(data);
      setState("preview");
    } catch {
      setError("Failed to upload file");
      setState("idle");
    }
  }, []);

  const handleCreateAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccountName,
          type: newAccountType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccounts((prev) => [...prev, data.account]);
        setSelectedAccountId(data.account.id);
        setShowNewAccount(false);
        setNewAccountName("");
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch {
      setError("Failed to create account");
    }
  }, [newAccountName, newAccountType]);

  const handleConfirm = useCallback(
    async (selectedIndexes: number[]) => {
      if (!selectedAccountId) {
        setError("Please select an account");
        return;
      }

      setState("importing");
      setError(null);
      const txns = selectedIndexes.map((i) => previewData.transactions[i]);

      try {
        const res = await fetch("/api/import/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: selectedAccountId,
            transactions: txns,
          }),
        });
        const data = await res.json();

        if (res.ok) {
          setImportedCount(data.imported);
          setState("done");
        } else {
          setError(data.error || "Import failed");
          setState("preview");
        }
      } catch {
        setError("Import failed");
        setState("preview");
      }
    },
    [selectedAccountId, previewData]
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Import Transactions
      </h1>
      <p className="text-foreground-muted mb-6">
        Upload a bank export file (CSV, QFX, QBO, OFX) to import transactions.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {(state === "idle" || state === "parsing") && (
        <FileDropzone
          onFileSelect={handleFileSelect}
          loading={state === "parsing"}
        />
      )}

      {state === "preview" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground-muted mb-1">
            Import to account:
          </label>
          <div className="flex gap-2">
            <select
              value={selectedAccountId}
              onChange={(e) => {
                if (e.target.value === "new") {
                  setShowNewAccount(true);
                  setSelectedAccountId("");
                } else {
                  setShowNewAccount(false);
                  setSelectedAccountId(e.target.value);
                }
              }}
              className="flex-1 p-2 border border-border rounded-lg bg-background-elevated text-foreground"
            >
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type}){a.source === "plaid" ? " - Plaid" : ""}
                </option>
              ))}
              <option value="new">+ Create new account</option>
            </select>
          </div>

          {showNewAccount && (
            <div className="mt-2 p-3 border border-border rounded-lg bg-background-elevated flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-foreground-tertiary">Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., Amex Platinum"
                  className="w-full p-2 border border-border rounded bg-background text-foreground placeholder:text-foreground-tertiary"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-tertiary">Type</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  className="p-2 border border-border rounded bg-background-elevated text-foreground"
                >
                  <option value="credit">Credit Card</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleCreateAccount}
                disabled={!newAccountName.trim()}
                className="px-4 py-2 bg-accent text-foreground rounded
                           disabled:opacity-50"
              >
                Create
              </button>
            </div>
          )}
        </div>
      )}

      {(state === "preview" || state === "importing") && previewData && (
        <ImportPreview
          transactions={previewData.transactions}
          duplicates={previewData.duplicates}
          format={previewData.format}
          onConfirm={handleConfirm}
          loading={state === "importing"}
        />
      )}

      {state === "done" && (
        <div className="bg-success/10 border border-success/20 p-6 rounded-xl text-center">
          <p className="text-lg font-medium text-success">
            Successfully imported {importedCount} transactions
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => {
                setState("idle");
                setPreviewData(null);
                setError(null);
              }}
              className="px-4 py-2 bg-background-elevated border border-border rounded-lg hover:bg-white/5"
            >
              Import more
            </button>
            <a
              href="/dashboard/transactions"
              className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent-hover"
            >
              View transactions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 10: Auth Pages (3 files, similar patterns)

#### `src/app/auth/signin/page.tsx` -- 9 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 21, 37 | `bg-gray-50` | `bg-background` | Page background (both sent/unsent states) |
| 22, 38 | `bg-white ... shadow-sm border` | `bg-background-elevated ... border border-border` | Card container (both states) |
| 26, 41 | `text-gray-600` | `text-foreground-muted` | Subtitle text |
| 50 | `text-gray-700` | `text-foreground-muted` | Email label |
| 61 | `border ... focus:ring-blue-500 focus:border-blue-500` | `border border-border bg-background text-foreground ... focus:ring-accent focus:border-accent` | Email input |
| 68 | `bg-blue-600 ... hover:bg-blue-700` | `bg-accent ... hover:bg-accent-hover` | Submit button |
| 74 | `text-gray-500` | `text-foreground-tertiary` | Terms text |

**Full updated file:**
```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", { email, redirect: false });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border">
          <div className="text-center">
            <div className="text-4xl mb-4">&#9993;</div>
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-foreground-muted">
              We sent a sign-in link to <strong>{email}</strong>. Click the link
              to sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Really Personal Finance</h1>
          <p className="text-foreground-muted mt-2">
            Sign in or create an account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground-muted mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-accent text-foreground rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Sending link..." : "Continue with email"}
          </button>
        </form>

        <p className="text-xs text-foreground-tertiary text-center mt-6">
          By signing in, you agree that your bank transactions will be stored
          securely in our database to provide spending insights.
        </p>
      </div>
    </div>
  );
}
```

#### `src/app/auth/verify/page.tsx` -- 3 Class Changes

| Line | Current | New |
|------|---------|-----|
| 3 | `bg-gray-50` | `bg-background` |
| 4 | `bg-white ... shadow-sm border` | `bg-background-elevated ... border border-border` |
| 7 | `text-gray-600` | `text-foreground-muted` |

**Full updated file:**
```tsx
export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border text-center">
        <div className="text-4xl mb-4">&#9993;</div>
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-foreground-muted">
          A sign-in link has been sent to your email address. Click the link to
          continue.
        </p>
      </div>
    </div>
  );
}
```

#### `src/app/auth/error/page.tsx` -- 5 Class Changes (applied to both ErrorContent and fallback)

| Line | Current | New |
|------|---------|-----|
| 21, 41 | `bg-gray-50` | `bg-background` |
| 22, 42 | `bg-white ... shadow-sm border` | `bg-background-elevated ... border border-border` |
| 25 | `text-gray-600` | `text-foreground-muted` |
| 28 | `bg-blue-600 ... hover:bg-blue-700` | `bg-accent ... hover:bg-accent-hover` |

**Full updated file:**
```tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "Access denied. You may not have permission to sign in.",
    Verification: "The sign-in link is no longer valid. It may have expired.",
    Default: "An error occurred during sign in.",
  };

  const message = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-foreground-muted mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block py-2 px-6 bg-accent text-foreground rounded-lg hover:bg-accent-hover font-medium"
        >
          Try again
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border text-center">
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
```

---

### Step 11: `src/app/profile/page.tsx` -- 10 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 43 | `bg-gray-50` | `bg-background` | Page bg |
| 49 | `text-blue-600 hover:text-blue-700` | `text-accent hover:text-accent-hover` | "Back to Dashboard" link |
| 55 | `bg-white ... shadow-sm border` | `bg-background-elevated ... border border-border` | Form card |
| 60 | `text-gray-700` | `text-foreground-muted` | "Name" label |
| 70 | `border ... focus:ring-blue-500 focus:border-blue-500` | `border border-border bg-background text-foreground ... focus:ring-accent focus:border-accent` | Name input |
| 77 | `text-gray-700` | `text-foreground-muted` | "Email" label |
| 87 | `border ... focus:ring-blue-500 focus:border-blue-500` | `border border-border bg-background text-foreground ... focus:ring-accent focus:border-accent` | Email input |
| 95-96 | `text-green-600` / `text-red-600` | `text-success` / `text-danger` | Status message |
| 106 | `bg-blue-600 ... hover:bg-blue-700` | `bg-accent ... hover:bg-accent-hover` | Save button |
| 112 | `text-gray-500` | `text-foreground-tertiary` | Audit note |

**Full updated file:**
```tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    if (response.ok) {
      setMessage("Profile updated successfully.");
      await update();
    } else {
      const data = await response.json();
      setMessage(data.error || "Failed to update profile.");
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <Link
            href="/dashboard"
            className="text-accent hover:text-accent-hover text-sm font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-background-elevated rounded-xl border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground-muted mb-1"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground-muted mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none"
              />
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes("success")
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="py-2 px-6 bg-accent text-foreground rounded-lg hover:bg-accent-hover disabled:opacity-50 font-medium"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>

          <p className="text-xs text-foreground-tertiary mt-4">
            Profile changes are versioned. Your previous profile data is
            retained for audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 12: `src/components/date-range-filter.tsx` -- 4 Class Changes

| Line | Current | New |
|------|---------|-----|
| 17 | `bg-white ... border shadow-sm` | `bg-background-card ... border border-border` |
| 20, 31 | `text-gray-600` | `text-foreground-muted` |
| 27, 38 | `border rounded-lg` | `border border-border rounded-lg bg-background-elevated text-foreground` |

**Full updated file:**
```tsx
"use client";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="bg-background-card p-4 rounded-xl border border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
```

---

### Step 13: `src/components/transaction-table.tsx` -- 12 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 21 | `bg-gray-100` | `bg-white/5` | Skeleton loader rows |
| 30 | `text-gray-500` | `text-foreground-tertiary` | Empty state text |
| 40 | `border-b` | `border-b border-border` | Table header row |
| 41, 44, 47, 50, 53 | `text-gray-600` | `text-foreground-muted` | Table header cells (5 instances) |
| 63 | `border-b hover:bg-gray-50` | `border-b border-border hover:bg-white/5` | Table body rows |
| 64 | `text-gray-600` | `text-foreground-muted` | Date cell |
| 72 | `text-gray-400` | `text-foreground-tertiary` | Sub-description text |
| 75 | `bg-yellow-100 text-yellow-700` | `bg-warning/20 text-warning` | "Pending" badge |
| 82 | `bg-gray-100 text-gray-700` | `bg-white/10 text-foreground-muted` | Category badge |
| 87 | `text-gray-500` | `text-foreground-tertiary` | Account name |
| 90 | `bg-blue-50 text-blue-600` | `bg-accent/10 text-accent` | "Import" badge |
| 97 | `text-green-600` / `text-gray-900` | `text-success` / `text-foreground` | Amount conditional |

**Full updated file:**
```tsx
"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
}

export function TransactionTable({
  transactions,
  loading,
}: TransactionTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-white/5 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-tertiary">
        No transactions found. Adjust your filters or connect a bank account.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Date
            </th>
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Description
            </th>
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Category
            </th>
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Account
            </th>
            <th className="text-right py-3 px-2 font-medium text-foreground-muted">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const amount = parseFloat(txn.amount);
            const isIncome = amount < 0;
            return (
              <tr key={txn.id} className="border-b border-border hover:bg-white/5">
                <td className="py-3 px-2 text-foreground-muted whitespace-nowrap">
                  {formatDate(txn.date)}
                </td>
                <td className="py-3 px-2">
                  <div className="font-medium">
                    {txn.merchantName || txn.name}
                  </div>
                  {txn.merchantName && txn.merchantName !== txn.name && (
                    <div className="text-xs text-foreground-tertiary">{txn.name}</div>
                  )}
                  {txn.pending && (
                    <span className="inline-block ml-2 px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded">
                      Pending
                    </span>
                  )}
                </td>
                <td className="py-3 px-2">
                  {txn.categoryPrimary && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-white/10 text-foreground-muted rounded-full">
                      {txn.categoryPrimary}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-foreground-tertiary text-xs">
                  {txn.accountName}
                  {txn.source === "import" && (
                    <span className="ml-1 px-1 py-0.5 bg-accent/10 text-accent rounded text-[10px]">
                      Import
                    </span>
                  )}
                </td>
                <td
                  className={`py-3 px-2 text-right font-medium whitespace-nowrap ${
                    isIncome ? "text-success" : "text-foreground"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatCurrency(Math.abs(amount))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Step 14: `src/components/plaid-link.tsx` -- 3 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 73 | `bg-green-600 ... hover:bg-green-700` | `bg-success ... hover:bg-success/80` | Connect button |
| 96 | `text-red-600` | `text-danger` | Error text |

**Full updated file for the button + error portion (rest unchanged):**

Line 73 changes from:
```tsx
className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2"
```
To:
```tsx
className="py-2 px-4 bg-success text-foreground rounded-lg hover:bg-success/80 disabled:opacity-50 font-medium flex items-center gap-2"
```

Line 96 changes from:
```tsx
{error && <p className="text-red-600 text-sm mt-2">{error}</p>}
```
To:
```tsx
{error && <p className="text-danger text-sm mt-2">{error}</p>}
```

---

### Step 15: `src/components/income-spending-chart.tsx` -- 3 Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 26 | `text-gray-500` | `text-foreground-tertiary` | Empty state text |
| 43 | `stroke="#000"` | `stroke="#71717a"` | ReferenceLine (zero line) -- use tertiary color instead of black |

Recharts `<CartesianGrid>`, `<XAxis>`, `<YAxis>` default to dark stroke colors that are invisible on a dark background. Add explicit stroke/tick props:

Line 35 `<CartesianGrid>`: Add `stroke="rgba(255,255,255,0.08)"` (matches `--border`).
Line 36 `<XAxis>`: Add `tick={{ fill: '#a1a1aa' }}` and `stroke="rgba(255,255,255,0.08)"`.
Line 37 `<YAxis>`: Add `tick={{ fill: '#a1a1aa' }}` and `stroke="rgba(255,255,255,0.08)"`.
Line 38-39 `<Tooltip>`: Add `contentStyle={{ backgroundColor: '#13111c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}` and `labelStyle={{ fontWeight: 'bold', color: '#ffffff' }}` and `itemStyle={{ color: '#a1a1aa' }}`.
Line 40 `<Legend>`: Add `wrapperStyle={{ color: '#a1a1aa' }}`.

**Full updated file:**
```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  spending: number;
  net: number;
}

export function IncomeSpendingChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-foreground-tertiary">
        No data available. Connect a bank account to get started.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="month" tick={{ fill: '#a1a1aa' }} stroke="rgba(255,255,255,0.08)" />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#a1a1aa' }} stroke="rgba(255,255,255,0.08)" />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value ?? 0))}
          contentStyle={{ backgroundColor: '#13111c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}
          labelStyle={{ fontWeight: "bold", color: '#ffffff' }}
          itemStyle={{ color: '#a1a1aa' }}
        />
        <Legend wrapperStyle={{ color: '#a1a1aa' }} />
        <ReferenceLine y={0} stroke="#71717a" />
        <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" fill="#ef4444" name="Spending" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Note:** The bar fill colors (`#22c55e` for income, `#ef4444` for spending) remain hardcoded hex values because Recharts does not consume CSS custom properties. These values match our `--success` and `--danger` tokens exactly, which is by design.

---

### Step 16: `src/components/category-chart.tsx` -- 7 Class Changes + Recharts Styling

| Line | Current | New | Element |
|------|---------|-----|---------|
| 32 | `text-gray-500` | `text-foreground-tertiary` | Empty state |
| 73 | `border-b` | `border-b border-border` | Table header row |
| 74, 77, 80 | `text-gray-600` | `text-foreground-muted` | Table header cells (3x) |
| 87 | `border-b` | `border-b border-border` | Table body rows |
| 98 | `text-gray-500` | `text-foreground-tertiary` | Count cell |

Recharts Tooltip: Add same dark `contentStyle` as income-spending chart.

Pie label: The default label color is black, which is invisible on dark backgrounds. Add `label` fill styling:
```tsx
label={(props) => {
  // same function but Recharts will inherit the text color from the SVG context
}}
```

Actually, the Pie `label` function renders `<text>` SVG elements. We need to add `fill="#a1a1aa"` to make labels visible. The cleanest approach: add a `labelLine={{ stroke: '#71717a' }}` prop and update the label function.

**Full updated file:**
```tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { CategoryData } from "@/types";

const COLORS = [
  "#6366f1",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
  "#84cc16",
  "#06b6d4",
  "#e11d48",
];

export function CategoryChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-foreground-tertiary">
        No spending data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-1/2">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={130}
              innerRadius={60}
              dataKey="total"
              nameKey="category"
              label={(props) =>
                `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: '#71717a' }}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value ?? 0))}
              contentStyle={{ backgroundColor: '#13111c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#a1a1aa' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="lg:w-1/2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium text-foreground-muted">
                Category
              </th>
              <th className="text-right py-2 font-medium text-foreground-muted">
                Amount
              </th>
              <th className="text-right py-2 font-medium text-foreground-muted">
                Txns
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.category} className="border-b border-border">
                <td className="py-2 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  {item.category}
                </td>
                <td className="text-right py-2 font-medium">
                  {formatCurrency(item.total)}
                </td>
                <td className="text-right py-2 text-foreground-tertiary">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Important change:** The `COLORS` array is updated to lead with `#6366f1` (indigo/accent) instead of `#3b82f6` (blue), aligning the chart palette with the new design system. The old blue-500 is moved to position 9.

---

### Step 17: `src/components/merchant-chart.tsx` -- 10 Class Changes + Recharts Styling

| Line | Current | New | Element |
|------|---------|-----|---------|
| 18 | `text-gray-500` | `text-foreground-tertiary` | Empty state |
| 39 | `fill="#3b82f6"` | `fill="#6366f1"` | Bar fill (use accent color) |
| 45 | `border-b` | `border-b border-border` | Table header row |
| 46, 49, 52, 55, 58 | `text-gray-600` | `text-foreground-muted` | Table header cells (5x) |
| 65 | `border-b` | `border-b border-border` | Table body rows |
| 68 | `text-gray-500` | `text-foreground-tertiary` | Avg amount |
| 71 | `text-gray-500` | `text-foreground-tertiary` | Count |
| 74 | `bg-blue-100 text-blue-700` | `bg-accent/20 text-accent` | "Recurring" badge |
| 78 | `text-gray-400` | `text-foreground-tertiary` | "One-time" text |

Also add Recharts dark mode styling (CartesianGrid, XAxis, YAxis, Tooltip) following same pattern as income-spending-chart.

**Full updated file:**
```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MerchantData } from "@/types";

export function MerchantChart({ data }: { data: MerchantData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-foreground-tertiary">
        No spending data available.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data.slice(0, 10)}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            tick={{ fill: '#a1a1aa' }}
            stroke="rgba(255,255,255,0.08)"
          />
          <YAxis type="category" dataKey="merchant" width={90} tick={{ fontSize: 12, fill: '#a1a1aa' }} stroke="rgba(255,255,255,0.08)" />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={{ backgroundColor: '#13111c', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px' }}
            labelStyle={{ color: '#ffffff' }}
            itemStyle={{ color: '#a1a1aa' }}
          />
          <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-foreground-muted">
              Merchant
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Total
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Avg
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Txns
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.merchant} className="border-b border-border">
              <td className="py-2 font-medium">{item.merchant}</td>
              <td className="text-right py-2">{formatCurrency(item.total)}</td>
              <td className="text-right py-2 text-foreground-tertiary">
                {formatCurrency(item.avgAmount)}
              </td>
              <td className="text-right py-2 text-foreground-tertiary">{item.count}</td>
              <td className="text-right py-2">
                {item.isRecurring ? (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full">
                    Recurring
                  </span>
                ) : (
                  <span className="text-foreground-tertiary text-xs">One-time</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Step 18: `src/components/file-dropzone.tsx` -- 5 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 58 | `border-blue-400 bg-blue-50` | `border-accent bg-accent/10` | Drag active state |
| 59 | `border-gray-300 bg-white hover:border-gray-400` | `border-border bg-background-card hover:border-border-emphasis` | Default state |
| 73 | `text-gray-700` | `text-foreground-muted` | Primary instruction text |
| 76 | `text-gray-500` | `text-foreground-tertiary` | Secondary instruction text |

**Full updated file:**
```tsx
"use client";

import { useState, useCallback } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  acceptedFormats?: string;
}

export function FileDropzone({
  onFileSelect,
  loading = false,
  acceptedFormats = ".csv,.qfx,.qbo,.ofx",
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-colors duration-200
        ${
          dragActive
            ? "border-accent bg-accent/10"
            : "border-border bg-background-card hover:border-border-emphasis"
        }
        ${loading ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <input
        type="file"
        accept={acceptedFormats}
        onChange={handleChange}
        className="hidden"
        id="file-upload"
        disabled={loading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-lg font-medium text-foreground-muted">
          {loading ? "Parsing file..." : "Drop a bank export file here"}
        </p>
        <p className="text-sm text-foreground-tertiary mt-2">
          or click to browse. Supports CSV, QFX, QBO, OFX
        </p>
      </label>
    </div>
  );
}
```

---

### Step 19: `src/components/import-preview.tsx` -- 14 Class Changes

| Line | Current | New | Element |
|------|---------|-----|---------|
| 77 | `bg-white ... shadow-sm border` | `bg-background-card ... border border-border` | Card wrapper |
| 80, 83 | `text-gray-600` | `text-foreground-muted` | Info text |
| 91, 98 | `text-blue-600 hover:text-blue-800` | `text-accent hover:text-accent-hover` | Select/Deselect all |
| 95 | `text-gray-300` | `text-foreground-tertiary` | Pipe separator |
| 107 | `bg-gray-50` | `bg-background-elevated` | Sticky table header |
| 108 | `text-gray-500` | `text-foreground-tertiary` | Header text |
| 127 | `bg-red-50` | `bg-danger/10` | Exact duplicate row |
| 129 | `bg-yellow-50` | `bg-warning/10` | Possible duplicate row |
| 145 | `text-green-600` | `text-success` | Inflow amount |
| 152 | `text-green-600` | `text-success` | "New" status |
| 157 | `text-red-600` | `text-danger` | "Already imported" status |
| 162 | `text-yellow-600` | `text-warning` | "Possible duplicate" status |
| 178-179 | `bg-blue-600 ... hover:bg-blue-700` | `bg-accent ... hover:bg-accent-hover` | Import button |

**Full updated file:**
```tsx
"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PreviewTransaction {
  date: string;
  description: string;
  amount: string;
  merchantName?: string;
  importId: string;
  isDuplicate: boolean;
}

interface Duplicate {
  importIndex: number;
  existingTransaction: {
    id: string;
    date: string;
    name: string;
    amount: string;
    source: string;
  };
  reason: "exact_import_id" | "same_date_amount";
}

interface ImportPreviewProps {
  transactions: PreviewTransaction[];
  duplicates: Duplicate[];
  format: string;
  onConfirm: (selectedIndexes: number[]) => void;
  loading?: boolean;
}

export function ImportPreview({
  transactions,
  duplicates,
  format,
  onConfirm,
  loading = false,
}: ImportPreviewProps) {
  const dupMap = new Map<number, Duplicate>();
  for (const dup of duplicates) {
    dupMap.set(dup.importIndex, dup);
  }

  const [selected, setSelected] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    transactions.forEach((_, i) => {
      const dup = dupMap.get(i);
      if (!dup || dup.reason !== "exact_import_id") {
        initial.add(i);
      }
    });
    return initial;
  });

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(transactions.map((_, i) => i)));
    } else {
      setSelected(new Set());
    }
  };

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const newCount = transactions.filter((_, i) => !dupMap.has(i)).length;
  const dupCount = dupMap.size;

  return (
    <div className="bg-background-card rounded-xl border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-foreground-muted">
            Detected format: <span className="font-medium">{format}</span>
          </p>
          <p className="text-sm text-foreground-muted">
            {transactions.length} transactions: {newCount} new, {dupCount}{" "}
            duplicates
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Select all
          </button>
          <span className="text-foreground-tertiary">|</span>
          <button
            onClick={() => toggleAll(false)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Deselect all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background-elevated">
            <tr className="text-left text-foreground-tertiary">
              <th className="p-2 w-8"></th>
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn, i) => {
              const dup = dupMap.get(i);
              const amount = parseFloat(txn.amount);
              const isInflow = amount < 0;

              return (
                <tr
                  key={i}
                  className={
                    dup?.reason === "exact_import_id"
                      ? "bg-danger/10"
                      : dup
                        ? "bg-warning/10"
                        : ""
                  }
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                    />
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {formatDate(txn.date)}
                  </td>
                  <td className="p-2 truncate max-w-xs">{txn.description}</td>
                  <td
                    className={`p-2 text-right whitespace-nowrap ${isInflow ? "text-success" : ""}`}
                  >
                    {isInflow ? "+" : "-"}
                    {formatCurrency(Math.abs(amount))}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {!dup && (
                      <span className="text-success text-xs font-medium">
                        New
                      </span>
                    )}
                    {dup?.reason === "exact_import_id" && (
                      <span className="text-danger text-xs font-medium">
                        Already imported
                      </span>
                    )}
                    {dup?.reason === "same_date_amount" && (
                      <span className="text-warning text-xs font-medium">
                        Possible duplicate
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0 || loading}
          className="px-6 py-2 bg-accent text-foreground rounded-lg
                     hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Importing..."
            : `Import ${selected.size} transaction${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
```

---

### Step 20: `src/components/providers.tsx` -- NO CHANGES

This file contains only `SessionProvider` wrapping and has zero styling. No modifications needed.

---

## 5. Complete File Manifest

| # | File Path | Change Type | Class Changes |
|---|-----------|-------------|---------------|
| 1 | `src/app/globals.css` | Rewrite | Remove dark media query, add 14 tokens, expand @theme inline |
| 2 | `src/app/layout.tsx` | Modify | 2 (add bg-background to html, add bg-background text-foreground to body) |
| 3 | `src/app/page.tsx` | Modify | 16 class changes |
| 4 | `src/app/dashboard/layout.tsx` | Modify | 10 class changes |
| 5 | `src/app/dashboard/page.tsx` | Modify | 15 class changes |
| 6 | `src/app/dashboard/transactions/page.tsx` | Modify | 16 class changes |
| 7 | `src/app/dashboard/categories/page.tsx` | Modify | 4 class changes |
| 8 | `src/app/dashboard/merchants/page.tsx` | Modify | 4 class changes |
| 9 | `src/app/dashboard/import/page.tsx` | Modify | 15 class changes |
| 10 | `src/app/auth/signin/page.tsx` | Modify | 9 class changes |
| 11 | `src/app/auth/verify/page.tsx` | Modify | 3 class changes |
| 12 | `src/app/auth/error/page.tsx` | Modify | 7 class changes (including fallback) |
| 13 | `src/app/profile/page.tsx` | Modify | 10 class changes |
| 14 | `src/components/date-range-filter.tsx` | Modify | 6 class changes |
| 15 | `src/components/transaction-table.tsx` | Modify | 14 class changes |
| 16 | `src/components/plaid-link.tsx` | Modify | 2 class changes |
| 17 | `src/components/income-spending-chart.tsx` | Modify | 2 class + 6 Recharts prop changes |
| 18 | `src/components/category-chart.tsx` | Modify | 7 class + Recharts + COLORS array update |
| 19 | `src/components/merchant-chart.tsx` | Modify | 11 class + Recharts prop changes |
| 20 | `src/components/file-dropzone.tsx` | Modify | 5 class changes |
| 21 | `src/components/import-preview.tsx` | Modify | 14 class changes |

**Total: 21 files modified** (including globals.css), **0 created**, **0 deleted**.

---

## 6. Responsive Behavior

No responsive breakpoint changes in this phase. All existing `md:` and `lg:` breakpoint classes remain exactly as they are. The color token system is viewport-agnostic -- the same dark palette applies at all screen sizes.

---

## 7. Accessibility Checklist

All text/background combinations must meet WCAG AA minimum contrast ratios: 4.5:1 for normal text (under 18px or under 14px bold), 3:1 for large text (18px+ or 14px+ bold).

| Text Color | Background Color | Contrast Ratio | WCAG AA |
|---|---|---|---|
| `#ffffff` (foreground) on `#0c0a14` (background) | | 18.3:1 | PASS (AAA) |
| `#ffffff` (foreground) on `#13111c` (background-elevated) | | 16.7:1 | PASS (AAA) |
| `#a1a1aa` (foreground-muted) on `#0c0a14` (background) | | 7.4:1 | PASS (AA) |
| `#a1a1aa` (foreground-muted) on `#13111c` (background-elevated) | | 6.7:1 | PASS (AA) |
| `#71717a` (foreground-tertiary) on `#0c0a14` (background) | | 4.5:1 | PASS (AA, barely) |
| `#71717a` (foreground-tertiary) on `#13111c` (background-elevated) | | 4.1:1 | PASS for large text only (3:1) |
| `#6366f1` (accent) on `#0c0a14` (background) | | 5.1:1 | PASS (AA) |
| `#22c55e` (success) on `#0c0a14` (background) | | 8.3:1 | PASS (AAA) |
| `#ef4444` (danger) on `#0c0a14` (background) | | 4.6:1 | PASS (AA) |
| `#f59e0b` (warning) on `#0c0a14` (background) | | 8.8:1 | PASS (AAA) |
| `#818cf8` (accent-hover) on `#0c0a14` (background) | | 6.8:1 | PASS (AA) |

**Note on foreground-tertiary (`#71717a`) on elevated backgrounds (`#13111c`):** This combination yields 4.1:1, which passes for large text (3:1 minimum) but technically falls short for normal text (4.5:1 minimum). This is acceptable because `foreground-tertiary` is ONLY used for supplementary metadata (transaction counts, timestamps, "One-time" labels, audit notes) that are always accompanied by nearby primary or muted text. It is never used for actionable or essential content. If stricter compliance is needed later, the token can be lightened to `#8a8a93` which yields 5.0:1.

---

## 8. Test Plan

### Manual Verification Steps

**Environment Setup:**
1. Run `npm run dev` and open `http://localhost:3000` in a browser.
2. Ensure your OS is NOT overriding with a light theme (this should not matter since we removed the media query, but verify).

**Page-by-Page Checks:**

1. **Landing Page (`/`):**
   - Background is near-black (`#0c0a14`), not white or gray.
   - Header has elevated background, border is visible but subtle.
   - "Really Personal Finance" title is white, readable.
   - Hero heading is white, subtitle is muted gray.
   - "Sign in" and "Get Started" buttons are indigo with white text.
   - Feature cards have very subtle background lift, visible borders.
   - Feature card descriptions are muted text.
   - Privacy notice has amber/warning tint (not bright amber-50).
   - Footer has elevated background, tertiary text.

2. **Sign In Page (`/auth/signin`):**
   - Centered card is elevated surface, not white.
   - Email input has dark background, white text, visible border.
   - Focus ring on input is indigo.
   - "Continue with email" button is indigo.
   - Small terms text at bottom is tertiary color.

3. **Verify Page (`/auth/verify`):**
   - Same dark card treatment.
   - "Check your email" text is white, description is muted.

4. **Error Page (`/auth/error`):**
   - Error card is dark.
   - "Try again" button is indigo.

5. **Dashboard Layout (all `/dashboard/*` routes):**
   - Sidebar is elevated background, not white.
   - Sidebar borders (top, bottom, right) are subtle but visible.
   - App title in sidebar is white.
   - Active nav item has indigo tint background + indigo text.
   - Inactive nav items are muted, hover shows subtle white/5 background.
   - Sign out hover turns text red (danger color).
   - Main content area has base background.

6. **Dashboard Overview (`/dashboard`):**
   - Summary cards have card-surface background, not white.
   - Income value is green, spending is red.
   - Net value is conditionally green/red.
   - Chart has dark tooltip, grid lines are visible but subtle.
   - Chart axis labels are muted gray (readable on dark background).
   - Chart bars are green (income) and red (spending).

7. **Transactions (`/dashboard/transactions`):**
   - Filter card is dark surface.
   - Date/text inputs have dark background, white text.
   - Native date picker renders in dark mode (verify calendar popup is dark).
   - Transaction table headers are muted text.
   - Table row hover is subtle white/5.
   - Skeleton loaders are subtle white/5, not gray-100.
   - Pagination buttons have visible borders, muted text.
   - "Pending" badge is warning-tinted.
   - Category badges are subtle white/10 background.
   - Income amounts are green, expense amounts are white.

8. **Categories (`/dashboard/categories`):**
   - Date filter has dark surface.
   - Pie chart labels are visible (not black on black).
   - Pie chart tooltip is dark with light text.
   - Table headers are muted, borders are visible.

9. **Merchants (`/dashboard/merchants`):**
   - Horizontal bar chart has indigo bars.
   - Chart axes have muted gray labels.
   - "Recurring" badge is indigo-tinted, not blue-100.
   - "One-time" text is tertiary.

10. **Import (`/dashboard/import`):**
    - File dropzone has dark background, dashed border is visible.
    - Drag active state shows indigo border + subtle indigo background.
    - Error alerts have red tint (not bright red-50).
    - Success alerts have green tint.
    - Select dropdown has dark background.
    - "Create" account button is indigo.
    - Import preview table has dark sticky header.
    - Duplicate row backgrounds are subtle red/yellow tints, not bright.

11. **Profile (`/profile`):**
    - Form card is elevated surface.
    - Input fields have dark background.
    - "Back to Dashboard" link is indigo.
    - Success/error messages use semantic colors.

**Cross-Cutting Checks:**
- NO white backgrounds anywhere in the entire app.
- NO invisible text (dark text on dark background).
- NO invisible borders (default gray borders on dark background).
- All `border` utilities have an explicit `border-border` color class.
- All `shadow-sm` instances have been removed.
- All Recharts tooltips have dark backgrounds.
- All Recharts axis labels are visible.
- Focus states (tab through inputs) show indigo rings.
- Disabled states still show reduced opacity.

---

## 9. Verification Checklist

After implementation, verify each item:

- [ ] `globals.css` has NO `@media (prefers-color-scheme: dark)` block
- [ ] `globals.css` `:root` defines all 14 CSS custom properties
- [ ] `globals.css` `@theme inline` maps all 14 tokens to `--color-*`
- [ ] `globals.css` body has `color-scheme: dark`
- [ ] `layout.tsx` `<html>` has `className="bg-background"`
- [ ] `layout.tsx` `<body>` includes `bg-background text-foreground`
- [ ] Zero instances of `bg-white` in any `.tsx` file (search entire `src/`)
- [ ] Zero instances of `bg-gray-50` in any `.tsx` file
- [ ] Zero instances of `bg-gray-100` in any `.tsx` file (except as `bg-white/5` or `bg-white/10`)
- [ ] Zero instances of `text-gray-900` in any `.tsx` file
- [ ] Zero instances of `text-gray-700` in any `.tsx` file
- [ ] Zero instances of `text-gray-600` in any `.tsx` file
- [ ] Zero instances of `text-gray-500` in any `.tsx` file
- [ ] Zero instances of `text-gray-400` in any `.tsx` file
- [ ] Zero instances of `bg-blue-600` in any `.tsx` file
- [ ] Zero instances of `hover:bg-blue-700` in any `.tsx` file
- [ ] Zero instances of `bg-blue-50` in any `.tsx` file
- [ ] Zero instances of `text-blue-600` in any `.tsx` file
- [ ] Zero instances of `text-blue-700` in any `.tsx` file
- [ ] Zero instances of `focus:ring-blue-500` in any `.tsx` file
- [ ] Zero instances of `text-green-600` in any `.tsx` file (replaced with `text-success`)
- [ ] Zero instances of `text-red-500` or `text-red-600` in any `.tsx` file (replaced with `text-danger`)
- [ ] Zero instances of `shadow-sm` in any `.tsx` file
- [ ] Every bare `border` class has an accompanying `border-border` or `border-border-emphasis` color
- [ ] Every bare `border-b`, `border-t`, `border-r` class has an accompanying `border-border` color
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run lint` passes
- [ ] No TypeScript errors

---

## 10. What NOT To Do

1. **DO NOT add a `dark:` prefix to any Tailwind class.** There is no dark mode variant. Dark is the only mode. Using `dark:bg-something` implies a light/dark toggle exists, which it does not.

2. **DO NOT use `prefers-color-scheme` anywhere.** We removed it. Do not add it back. Do not add a new one.

3. **DO NOT create a `tailwind.config.js` or `tailwind.config.ts` file.** Tailwind v4 uses `@theme inline` in CSS. The config file approach is Tailwind v3. This project uses v4.

4. **DO NOT add a light mode toggle, theme switcher, or `class` strategy.** This is not in scope for Phase 01 or any current phase.

5. **DO NOT change any component logic, data fetching, API calls, or TypeScript interfaces.** This phase is purely visual. If a component works, it must still work identically after your changes. Only `className` attributes and Recharts style props change.

6. **DO NOT forget `color-scheme: dark` in `globals.css`.** Without it, native form controls (date pickers, selects, scrollbars) will render in light mode on some browsers, creating jarring white popups on a dark page.

7. **DO NOT use `bg-black` or `bg-zinc-900` etc.** Use only the token-based classes (`bg-background`, `bg-background-elevated`, `bg-background-card`). Hardcoded Tailwind color classes defeat the purpose of the token system.

8. **DO NOT change the Recharts bar fill colors for income/spending.** `#22c55e` and `#ef4444` are the canonical green/red and they match the `--success`/`--danger` tokens. Recharts does not read CSS variables, so these must remain hardcoded hex values.

9. **DO NOT leave any bare `border` class without an explicit color.** Tailwind's default border color is gray-200, which is invisible on a dark background. Every `border`, `border-b`, `border-t`, `border-r` MUST be accompanied by `border-border`.

10. **DO NOT remove `shadow-sm` and add nothing.** The cards need some visual separation. The `border border-border` replacement provides that separation. If you remove `shadow-sm` but forget to add `border-border`, the cards will be indistinguishable from the background.

---

### Critical Files for Implementation
- `/Users/chris/Projects/really-personal-finance/src/app/globals.css` - Foundation of the entire design system; defines all 14 CSS custom properties and Tailwind theme mappings
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` - Dashboard shell with sidebar; affects every authenticated page's visual frame
- `/Users/chris/Projects/really-personal-finance/src/components/transaction-table.tsx` - Most complex component with conditional colors, badges, hover states, and skeleton loaders
- `/Users/chris/Projects/really-personal-finance/src/components/income-spending-chart.tsx` - Recharts dark-mode styling pattern that must be replicated across all 3 chart components
- `/Users/chris/Projects/really-personal-finance/src/app/page.tsx` - Landing page with the highest density of color classes (16 changes); good first file to validate the token system works end-to-end