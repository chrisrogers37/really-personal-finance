# Component and Page Reference

This document covers all React components and pages in the application. All interactive components use the `"use client"` directive since they rely on React hooks.

## Shared Components (`src/components/`)

### `Providers`

**File:** `src/components/providers.tsx`

Wraps the application in NextAuth's `SessionProvider`. This is imported in the root layout (`src/app/layout.tsx`) and wraps all children, making `useSession()` available throughout the app.

**Props:** `{ children: React.ReactNode }`

**Usage:** Only used once in `layout.tsx`. You should not need to modify this unless adding another global provider (e.g., a theme provider or state management context).

---

### `PlaidLinkButton`

**File:** `src/components/plaid-link.tsx`

A button that launches the Plaid Link bank connection flow. Handles the full lifecycle: creating a link token, opening the Plaid UI, and exchanging the public token.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSuccess` | `() => void` | No | Callback fired after a bank account is successfully linked. Used to refresh data on the dashboard. |

**Internal state:**
- `linkToken` -- The Plaid Link token (fetched from `/api/plaid/create-link-token`)
- `loading` -- Whether the token creation request is in progress
- `error` -- Error message to display below the button

**Flow:**
1. User clicks "Connect Bank Account"
2. `createLinkToken()` calls `POST /api/plaid/create-link-token`
3. The returned `linkToken` is passed to the `usePlaidLink` hook
4. A `useEffect` watches for `linkToken && ready` to auto-open the Plaid UI
5. When the user completes the Plaid flow, `onPlaidSuccess()` sends the public token to `POST /api/plaid/exchange-token`
6. On success, the `onSuccess` callback is called
7. On exit (user closes Plaid UI), `linkToken` is reset to `null`

**Styling:** Green button with a "+" icon. Shows "Connecting..." while loading. Error text appears in red below.

---

### `TransactionTable`

**File:** `src/components/transaction-table.tsx`

Renders a table of transactions with columns for date, description, category, account, and amount.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `transactions` | `Transaction[]` | Yes | Array of transaction objects to display |
| `loading` | `boolean` | No | If `true`, shows skeleton loading animation |

**Behavior:**
- **Loading state:** Shows 5 gray pulsing placeholder rows
- **Empty state:** Shows "No transactions found" message
- **Amount display:** Negative amounts (income) show as green with a "+" prefix. Positive amounts (spending) show as gray with a "-" prefix.
- **Merchant name:** Shows `merchantName` if available, falls back to `name`. If both exist and differ, shows `name` as a smaller subtitle.
- **Pending badge:** Yellow "Pending" badge appears next to pending transactions
- **Category badge:** Gray pill showing the primary category

**Types used:** `Transaction` from `src/types/index.ts`

---

### `IncomeSpendingChart`

**File:** `src/components/income-spending-chart.tsx`

A Recharts bar chart showing monthly income vs. spending side by side.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `MonthlyData[]` | Yes | Array with `{ month, income, spending, net }` objects |

**Chart details:**
- **Type:** Vertical bar chart with two bar series
- **Green bars:** Income
- **Red bars:** Spending
- **X-axis:** Month labels (YYYY-MM format)
- **Y-axis:** Dollar amounts formatted as `$Xk` (thousands)
- **Tooltip:** Shows exact dollar amounts on hover
- **Legend:** Shows "Income" and "Spending" labels
- **Reference line:** Horizontal line at y=0

**Empty state:** Shows "No data available. Connect a bank account to get started."

---

### `CategoryChart`

**File:** `src/components/category-chart.tsx`

A donut chart showing spending distribution by category, paired with a data table.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `CategoryData[]` | Yes | Array with `{ category, total, count }` objects |

**Layout:** Two-column on large screens (chart left, table right). Single column on mobile.

**Chart details:**
- **Type:** Donut/pie chart (inner radius 60, outer radius 130)
- **Labels:** Category name and percentage on each slice
- **Color palette:** 12 colors that cycle for categories beyond 12
- **Tooltip:** Dollar amount on hover

**Table columns:**
- Color dot (matching the chart)
- Category name
- Dollar amount
- Transaction count

**Empty state:** Shows "No spending data available."

---

### `MerchantChart`

**File:** `src/components/merchant-chart.tsx`

A horizontal bar chart showing top merchants by spending, paired with a detailed data table.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `MerchantData[]` | Yes | Array with `{ merchant, total, count, avgAmount, isRecurring }` objects |

**Chart details:**
- **Type:** Horizontal bar chart
- **Shows:** Top 10 merchants only (chart is limited via `data.slice(0, 10)`)
- **X-axis:** Dollar amounts
- **Y-axis:** Merchant names (90px width, 12px font)
- **Color:** Blue bars with rounded right edges

**Table columns:**
- Merchant name
- Total spending
- Average transaction amount
- Transaction count
- Type badge: "Recurring" (blue pill) if `isRecurring`, "One-time" (gray text) otherwise

**Empty state:** Shows "No spending data available."

---

### `DateRangeFilter`

**File:** `src/components/date-range-filter.tsx`

A reusable date range picker with start and end date inputs.

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `startDate` | `string` | Yes | Current start date (YYYY-MM-DD format) |
| `endDate` | `string` | Yes | Current end date (YYYY-MM-DD format) |
| `onStartDateChange` | `(date: string) => void` | Yes | Callback when start date changes |
| `onEndDateChange` | `(date: string) => void` | Yes | Callback when end date changes |

**Layout:** Two-column grid (start date and end date side by side on medium+ screens).

**Styling:** White card with border and shadow. Native HTML date inputs.

---

## Pages

### Landing Page

**File:** `src/app/page.tsx`

Public home page visible to all visitors. Contains:
- Hero section with app title and description
- "Get Started" CTA button (links to `/auth/signin`)
- Three feature cards (Bank Connection, Smart Dashboard, Telegram Alerts)
- Privacy notice about data storage
- Footer with sign-in link

**Server/Client:** Server component (no `"use client"` directive)

---

### Root Layout

**File:** `src/app/layout.tsx`

Wraps the entire application. Sets up:
- HTML metadata (title: "Really Personal Finance", description)
- Geist font families (sans and mono)
- `<Providers>` wrapper (SessionProvider for NextAuth)
- Global CSS import

---

### Auth Pages

#### Sign In (`src/app/auth/signin/page.tsx`)

Email input form. After submission, calls `signIn("email", { email, redirect: false })` from NextAuth. On success, shows "Check your email" message with instruction to click the magic link.

#### Verify (`src/app/auth/verify/page.tsx`)

Static "Check your email" page shown after requesting a magic link. Displays instructions to check inbox and spam folder.

#### Error (`src/app/auth/error/page.tsx`)

Referenced in NextAuth config as the error page. Shown when authentication fails.

---

### Dashboard Layout

**File:** `src/app/dashboard/layout.tsx`

Wraps all `/dashboard/*` pages. Provides:

**Sidebar navigation:**
- "Really Personal Finance" title (links to `/dashboard`)
- Overview (icon: LayoutDashboard)
- Transactions (icon: Receipt)
- Categories (icon: PieChart)
- Merchants (icon: Store)
- Profile link showing the user's email (icon: User)
- Sign out button (icon: LogOut)

**Active state:** The current route is highlighted with blue background/text. The Overview item is only active on exact `/dashboard` match; others use prefix matching.

**Layout:** Fixed 256px sidebar on the left, main content area fills the remaining width with 32px padding.

---

### Dashboard Overview

**File:** `src/app/dashboard/page.tsx`

The main dashboard view. Fetches monthly income vs. spending data from `/api/analytics/income-vs-spending`.

**Content:**
- "Connect Bank Account" button (PlaidLinkButton) in the header -- refreshes data on success
- 4 summary cards:
  - This Month Income (green)
  - This Month Spending (red)
  - This Month Net (green if positive, red if negative)
  - All-Time Net (green if positive, red if negative)
- Income vs Spending chart (IncomeSpendingChart component)

**State:**
- `data: MonthlyData[]` -- monthly breakdown from the API
- `loading: boolean` -- shows "Loading..." in the chart area

---

### Transactions Page

**File:** `src/app/dashboard/transactions/page.tsx`

Filterable, paginated transaction list.

**Filters:**
- Start Date (default: 30 days ago)
- End Date (default: today)
- Category (text input, exact match)
- Merchant (text input, partial match)

**Pagination:**
- 50 transactions per page
- Previous/Next buttons
- "Showing X-Y" counter
- Offset resets to 0 when filters change

**State:** Fetches from `GET /api/transactions` with all filter parameters. Re-fetches on any filter or pagination change via `useCallback` + `useEffect`.

---

### Categories Page

**File:** `src/app/dashboard/categories/page.tsx`

Spending by category analysis.

**Content:**
- Header showing total spending and category count
- DateRangeFilter (default: last 30 days)
- CategoryChart (donut chart + table)

**State:** Fetches from `GET /api/analytics/spending-by-category`. Re-fetches when dates change.

---

### Merchants Page

**File:** `src/app/dashboard/merchants/page.tsx`

Spending by merchant analysis.

**Content:**
- Header showing total spending, merchant count, and recurring count
- DateRangeFilter (default: last 30 days)
- MerchantChart (horizontal bar chart + table)

**State:** Fetches from `GET /api/analytics/spending-by-merchant`. Re-fetches when dates change.

---

### Profile Page

**File:** `src/app/profile/page.tsx`

User profile editing form. Not nested under the dashboard layout (has its own minimal layout with a "Back to Dashboard" link).

**Fields:**
- Name (text input)
- Email (email input, required)

**Behavior:**
- Pre-populates from the current session
- On save, calls `PUT /api/profile` which triggers an SCD2 version change
- After successful save, calls `update()` from `useSession()` to refresh the session
- Shows success/error message below the form
- Includes a note: "Profile changes are versioned. Your previous profile data is retained for audit purposes."

---

## TypeScript Interfaces

**File:** `src/types/index.ts`

These interfaces are shared between components and pages:

```typescript
interface Transaction {
  id: string;
  amount: string;        // Decimal string, positive = spending, negative = income
  date: string;          // YYYY-MM-DD
  name: string;          // Raw transaction name from Plaid
  merchantName: string | null;  // Cleaned merchant name
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  accountName: string | null;
  accountType: string | null;
}

interface CategoryData {
  category: string;
  total: number;         // Total spending in this category
  count: number;         // Number of transactions
}

interface MerchantData {
  merchant: string;
  total: number;         // Total spending at this merchant
  count: number;         // Number of transactions
  avgAmount: number;     // Average transaction amount
  isRecurring: boolean;  // true if count >= 3
}
```
