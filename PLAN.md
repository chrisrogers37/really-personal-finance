# Implementation Plan

## Status of Previous Plan

Features 1-3 from the original plan (Transaction Editing, Add Transaction, Column Mapping) are **complete** — the modals, API endpoints, column mapper component, and import flow are all wired up and functional.

---

## Part A: Alternative Transaction Ingestion (without Plaid)

Plaid requires production approval, SOC 2 considerations, and security reviews. Here are practical alternatives that can work right now, ordered by effort:

### A1. Email Forwarding Ingestion (medium effort, high value)

Most banks email transaction alerts or monthly statements. Users could forward these to a dedicated inbox and we parse them automatically.

**How it works:**
- User gets a unique ingest address: `user123@ingest.reallypersonalfinance.com`
- We set up an email receiving webhook (e.g., SendGrid Inbound Parse, Mailgun Routes, or Cloudflare Email Workers)
- Incoming emails are parsed for transaction data:
  - Bank alert emails: regex patterns for amount, merchant, date, card last-4
  - PDF statement attachments: extract via pdf-parse, then run through CSV-like parsing
  - CSV attachments: run through existing import pipeline automatically
- Parsed transactions go through existing duplicate detection, then auto-import

**Why this is good:**
- Zero setup friction for users — just set up a forwarding rule once
- Works with any bank that sends email alerts (which is almost all of them)
- No API approval needed — it's just email
- Can be scheduled (forward monthly statements) or real-time (forward alerts as they arrive)

**New files:**
- `src/app/api/ingest/email/route.ts` — Webhook endpoint for inbound email
- `src/lib/parsers/email.ts` — Email body parser (regex patterns for common bank alert formats)
- `src/lib/parsers/pdf.ts` — PDF statement parser
- DB: add `ingestEmails` table mapping user_id → unique ingest address

### A2. Scheduled CSV Fetch from Cloud Storage (low effort, solid value)

Users export CSVs from their bank and drop them in a Google Drive / Dropbox folder. We poll it periodically.

**How it works:**
- User authorizes Google Drive or Dropbox via OAuth
- User selects a folder to watch
- Cron job checks folder daily for new files
- New files run through existing CSV/OFX parsing pipeline
- Processed files are moved to an "imported" subfolder

**New files:**
- `src/app/api/integrations/gdrive/route.ts` — OAuth + folder selection
- `src/lib/gdrive.ts` — Google Drive API client (list files, read, move)
- `src/app/api/cron/fetch-files/route.ts` — Cron job to poll for new files

### A3. Apple/Google Wallet Export Parsing (low effort, niche value)

Both Apple Wallet and Google Wallet allow exporting transaction history. We add parsers for their specific export formats.

**New files:**
- `src/lib/parsers/apple-wallet.ts`
- `src/lib/parsers/google-wallet.ts`

### A4. SMS/iMessage Forwarding via Shortcuts (zero backend effort)

Many banks send SMS transaction alerts. Users could use iOS Shortcuts or Tasker (Android) to forward these to our API.

**How it works:**
- We publish an iOS Shortcut / Tasker profile that:
  1. Triggers on incoming SMS from known bank numbers
  2. Extracts the message text
  3. POSTs to `/api/ingest/sms` with the raw text + user API key
- Server-side: regex parsing of common bank SMS formats ("You spent $X at MERCHANT on DATE")

**New files:**
- `src/app/api/ingest/sms/route.ts` — Webhook for SMS text
- `src/lib/parsers/sms.ts` — Bank SMS format parser
- User API key generation in settings

### A5. Manual Receipt Scanning (medium effort, novel value)

Users snap a photo of a receipt. We OCR it and create a transaction.

**How it works:**
- Upload image on mobile-friendly page
- Send to an OCR API (Google Vision, Tesseract, or Claude vision)
- Extract merchant, total, date, line items
- Pre-fill add-transaction form for confirmation

**New files:**
- `src/app/api/ingest/receipt/route.ts` — Image upload + OCR
- `src/components/receipt-scanner.tsx` — Camera/upload UI
- `src/lib/ocr.ts` — OCR result parsing

### Recommendation

**Start with A1 (Email Forwarding)** — it's the highest-leverage option. Most users already get bank email alerts, so the setup is "forward your alerts to this address" and transactions appear automatically. It also naturally supports both real-time alerts and batch statement imports.

**A4 (SMS forwarding)** is a good second choice since it requires almost no backend work — just a parsing endpoint.

---

## Part B: Downstream Feature Enhancements

These build on the existing transaction data to increase value, fix edge cases, and make the experience smoother.

### B1. Budget Targets & Progress Tracking (high value)

Allow users to set monthly spending targets per category (or overall) and track progress.

**What it adds:**
- `/dashboard/budgets` page showing category budgets vs actual
- Progress bars that turn yellow at 80%, red at 100%
- Telegram alerts when approaching/exceeding a budget
- Month-over-month budget adherence trends

**New files:**
- `src/db/schema.ts` — Add `budgets` table (user_id, category, monthlyLimit, startDate)
- `src/app/api/budgets/route.ts` — CRUD for budget targets
- `src/app/api/analytics/budget-progress/route.ts` — Current progress vs targets
- `src/app/dashboard/budgets/page.tsx` — Budget management + visualization
- `src/components/budget-progress.tsx` — Progress bar component
- `src/lib/alerts.ts` — Add budget threshold alerts to daily cron

### B2. Recurring Transaction Detection & Subscription Tracker (high value)

Auto-detect recurring charges (subscriptions, bills) and surface them prominently.

**What it adds:**
- Auto-detection: same merchant + similar amount + regular interval (weekly/monthly/yearly)
- `/dashboard/subscriptions` page listing all detected recurring charges
- Monthly subscription total ("You're spending $X/month on subscriptions")
- Alert when a new recurring charge is detected
- Alert when a recurring charge changes amount (price increase)

**New files:**
- `src/app/api/analytics/recurring/route.ts` — Recurring detection logic
- `src/app/dashboard/subscriptions/page.tsx` — Subscription tracker page
- `src/components/subscription-list.tsx` — List with frequency, amount, next expected date

**Detection algorithm:**
```
For each merchant with >= 3 transactions:
  Sort by date
  Calculate intervals between consecutive transactions
  If median interval is 28-31 days → monthly
  If median interval is 6-8 days → weekly
  If median interval is 360-370 days → yearly
  If amount std deviation < 10% of mean → consistent amount → recurring
```

### B3. Smarter Category Assignment (medium value)

Imported CSVs often lack Plaid-style categories. Auto-categorize based on merchant name patterns.

**What it adds:**
- Rule-based categorizer: merchant name → category (e.g., "UBER" → Transportation, "WHOLE FOODS" → Groceries)
- Learn from user edits: when a user changes a category, remember it for future transactions from that merchant
- Apply retroactively: "Apply this category to all transactions from MERCHANT_NAME?"

**New files:**
- `src/db/schema.ts` — Add `categoryRules` table (user_id, merchantPattern, category)
- `src/lib/categorizer.ts` — Pattern matching + rule lookup
- `src/app/api/category-rules/route.ts` — CRUD for rules
- Modify `src/app/api/import/confirm/route.ts` — Apply rules on import
- Modify `src/app/api/transactions/[id]/route.ts` — Offer to save rule on category edit

### B4. Transaction Search & Tagging (medium value)

Full-text search across all transactions, plus user-defined tags for custom grouping.

**What it adds:**
- Search bar on transactions page that searches name, merchantName, category, and notes
- Tags: user can add multiple tags to any transaction (e.g., "vacation", "tax-deductible", "reimbursable")
- Filter by tag across all views
- Tag management in settings

**Schema changes:**
- Add `transactionTags` table (transaction_id, tag)
- Add `notes` column to transactions

### B5. Export & Reporting (medium value)

Users need to get data out — for tax prep, expense reports, or budgeting in other tools.

**What it adds:**
- Export filtered transactions as CSV
- Monthly/yearly summary PDF report
- Tax-category grouping (map spending categories to tax deduction categories)

**New files:**
- `src/app/api/export/csv/route.ts` — Generate CSV from filtered transactions
- `src/app/api/export/report/route.ts` — Generate summary report
- Export button on transactions page + dashboard

### B6. Multi-Account Dashboard Improvements (low effort, polish)

**Current gaps:**
- Dashboard doesn't break down by account
- No way to see account balances
- No way to hide/archive an account

**What it adds:**
- Account selector/filter on dashboard and analytics pages
- Running balance per account (calculated from transactions)
- Account summary cards showing last transaction date, transaction count, estimated balance
- Archive accounts (hide from dropdowns but keep transaction history)

### B7. Improved Duplicate Detection (edge case fix)

**Current gaps:**
- Fuzzy matching (same date + amount) can false-positive on legitimate same-day, same-amount transactions (e.g., two $5 coffees)
- No way to mark a flagged duplicate as "not a duplicate"

**Improvements:**
- Add merchant name to fuzzy match criteria (same date + amount + similar merchant = duplicate, same date + amount + different merchant = probably not)
- "Not a duplicate" button on import preview that persists the override
- Show more context in duplicate warnings (both transactions side by side)

### B8. Telegram Alert Enhancements (low effort, high engagement)

**Current:** Daily summary + weekly comparison + anomaly detection.

**Add:**
- `/budget` command — Show current budget progress
- `/subscriptions` command — List upcoming recurring charges
- `/month` command — Month-to-date summary with comparison to last month's pace
- Configurable alert time (not everyone wants 7 AM UTC)
- Transaction-level alerts: "You just spent $X at MERCHANT" (requires near-real-time ingestion from A1 or A4)

### B9. Data Quality Dashboard (low effort, trust-building)

Show users the health of their data to build confidence.

**What it shows:**
- Total transactions, date range covered
- Transactions per source (Plaid vs import vs manual)
- Uncategorized transaction count + quick-fix link
- Last import/sync date per account
- Gaps in transaction history (months with zero transactions)

---

## Prioritized Implementation Order

| Priority | Feature | Effort | Value | Dependencies |
|----------|---------|--------|-------|--------------|
| 1 | B1. Budget Targets | Medium | High | None |
| 2 | B3. Smart Categories | Medium | High | None (enhances imports immediately) |
| 3 | B2. Subscription Tracker | Medium | High | None |
| 4 | B7. Better Duplicate Detection | Low | Medium | None (fixes real pain point) |
| 5 | A1. Email Forwarding Ingestion | Medium | High | Email service setup |
| 6 | B8. Telegram Enhancements | Low | Medium | B1, B2 for /budget, /subscriptions |
| 7 | B6. Multi-Account Dashboard | Low | Medium | None |
| 8 | B5. Export & Reporting | Medium | Medium | None |
| 9 | A4. SMS Forwarding | Low | Medium | None |
| 10 | B4. Search & Tagging | Medium | Medium | None |
| 11 | B9. Data Quality Dashboard | Low | Low | None |
| 12 | A5. Receipt Scanning | Medium | Low | OCR API |
| 13 | A2. Cloud Storage Fetch | Medium | Low | OAuth setup |

### Suggested first sprint: B1 + B3 + B7

These three together make the app dramatically more useful:
- **B1 (Budgets)** gives users a reason to check in daily
- **B3 (Smart Categories)** means imported CSVs are actually useful without manual work
- **B7 (Better Duplicates)** prevents frustration during imports

All three are independent of each other and can be built in parallel.
