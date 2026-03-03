# Phase 02: Elevate the Import Page UX

**PR Title:** feat: redesign import page with polished dropzone and preview
**Risk:** Low
**Effort:** Medium
**Files modified:** `src/components/file-dropzone.tsx`, `src/components/import-preview.tsx`, `src/app/dashboard/import/page.tsx`

---

## Context

The import page is the primary onboarding action — it's how users get data into the app. Currently, the dropzone is a plain dashed-border box with gray text, the account selector is an unstyled `<select>`, and the preview table uses raw HTML checkboxes. This phase elevates the entire flow to match the frosted-glass card aesthetic used elsewhere.

References: Dashboard feature cards (home page) for card styling, sign-in page for form input styling.

---

## Dependencies

- **Blocked by:** Phase 01 (Purple Palette) — uses `text-income` token for inflow amounts
- **Blocks:** Nothing

---

## Detailed Implementation Plan

### Step 1: Redesign FileDropzone — `src/components/file-dropzone.tsx`

Replace the entire component with a visually richer dropzone:

**Changes:**
- Add `Upload` icon from lucide-react (centered, large, indigo-400)
- Add file format badges below the icon (CSV, QFX, QBO, OFX as small pills)
- Use frosted glass card styling: `bg-background-card backdrop-blur-xl border border-border rounded-2xl`
- Active drag state: `border-accent bg-accent/10` with `animate-glow` ring
- Add a visible "Browse files" button as a secondary CTA below the text
- Loading state: shimmer animation on the card

```tsx
"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  acceptedFormats?: string;
}

const FORMAT_BADGES = ["CSV", "QFX", "QBO", "OFX"];

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
        bg-background-card backdrop-blur-xl rounded-2xl border-2 border-dashed
        p-12 text-center cursor-pointer transition-all duration-200
        ${
          dragActive
            ? "border-accent bg-accent/10 scale-[1.01] animate-glow"
            : "border-border hover:border-border-emphasis hover:bg-white/[0.03]"
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
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center ${loading ? "animate-shimmer shimmer-bg" : ""}`}>
            <Upload className="w-8 h-8 text-indigo-400" />
          </div>

          <div>
            <p className="text-lg font-medium text-foreground">
              {loading ? "Parsing file..." : "Drop your bank export here"}
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              or click to browse your files
            </p>
          </div>

          <div className="flex gap-2 mt-2">
            {FORMAT_BADGES.map((fmt) => (
              <span
                key={fmt}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-white/[0.06] border border-white/[0.08] text-foreground-muted"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </label>
    </div>
  );
}
```

### Step 2: Polish the account selector — `src/app/dashboard/import/page.tsx`

**Lines 147-171** — Wrap the account selector in a frosted card and style the select:

Replace:
```tsx
<label className="block text-sm font-medium text-foreground-muted mb-1">
  Import to account:
</label>
<div className="flex gap-2">
  <select
    ...
    className="flex-1 p-2 border border-border rounded-lg bg-background-elevated text-foreground"
  >
```

With:
```tsx
<label className="block text-sm font-medium text-foreground-muted mb-2">
  Import to account
</label>
<div className="flex gap-2">
  <select
    ...
    className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-background-elevated text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150 appearance-none"
  >
```

**Lines 175-208** — Style the "Create new account" inline form:

Replace the container class:
```tsx
// Before
className="mt-2 p-3 border border-border rounded-lg bg-background-elevated flex gap-2 items-end"
// After
className="mt-3 p-4 border border-border rounded-xl bg-background-elevated/50 backdrop-blur-xl flex gap-3 items-end"
```

Replace input styling:
```tsx
// Before
className="w-full p-2 border border-border rounded bg-background text-foreground placeholder:text-foreground-tertiary"
// After
className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
```

Replace the select styling in the new account form:
```tsx
// Before
className="p-2 border border-border rounded bg-background-elevated text-foreground"
// After
className="px-3 py-2 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
```

Replace the Create button:
```tsx
// Before
className="px-4 py-2 bg-accent text-foreground rounded disabled:opacity-50 transition-all duration-150 active:scale-95"
// After
className="px-4 py-2 bg-accent text-foreground rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-150 active:scale-95"
```

### Step 3: Polish the import preview — `src/components/import-preview.tsx`

**Table header row (line 108):**
```tsx
// Before
<tr className="text-left text-foreground-tertiary">
// After
<tr className="text-left text-foreground-tertiary text-xs uppercase tracking-wider">
```

**Table rows — add hover state (line 123-131):**

Add a base hover class to all rows. Change the `<tr>` to:
```tsx
<tr
  key={i}
  className={`transition-colors hover:bg-white/[0.03] ${
    dup?.reason === "exact_import_id"
      ? "bg-danger/10"
      : dup
        ? "bg-warning/10"
        : ""
  }`}
>
```

**Checkbox styling (line 134-138):**

Replace the plain checkbox:
```tsx
// Before
<input
  type="checkbox"
  checked={selected.has(i)}
  onChange={() => toggle(i)}
/>
// After
<input
  type="checkbox"
  checked={selected.has(i)}
  onChange={() => toggle(i)}
  className="w-4 h-4 rounded border-border bg-background-elevated text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer accent-accent"
/>
```

**Import button (lines 176-183):**
```tsx
// Before
className="px-6 py-2 bg-accent text-foreground rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
// After
className="px-6 py-2.5 bg-accent text-foreground rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
```

**Select all / Deselect all links — style as pills (lines 89-101):**
```tsx
// Before
<button onClick={() => toggleAll(true)} className="text-sm text-accent hover:text-accent-hover">Select all</button>
<span className="text-foreground-tertiary">|</span>
<button onClick={() => toggleAll(false)} className="text-sm text-accent hover:text-accent-hover">Deselect all</button>
// After
<button onClick={() => toggleAll(true)} className="text-xs font-medium px-3 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-150">Select all</button>
<button onClick={() => toggleAll(false)} className="text-xs font-medium px-3 py-1 rounded-full bg-white/[0.06] text-foreground-muted hover:bg-white/[0.10] transition-all duration-150">Deselect all</button>
```

Remove the `|` separator span entirely.

---

## Responsive Behavior

- **Desktop (1440px):** Full-width dropzone, preview table with all columns visible
- **Tablet (768px):** Dropzone shrinks padding from `p-12` to `p-8` — add responsive class `p-8 md:p-12`
- **Mobile (375px):** Dropzone stacks vertically (already does). Preview table scrolls horizontally (already has `overflow-x-auto`). Account selector goes full-width (already does). Format badges may wrap — this is fine.

Update the dropzone padding class:
```
p-8 sm:p-12
```

---

## Accessibility Checklist

- [x] **Dropzone:** Label is associated with file input via `htmlFor="file-upload"` — screen readers announce it as a file upload
- [x] **Drag state:** Visual change is reinforced by `scale-[1.01]` (not color-only)
- [x] **Checkboxes:** Styled but still native `<input type="checkbox">` — keyboard accessible, screen-reader compatible
- [x] **Focus indicators:** Added `focus:ring-2 focus:ring-accent` to all form inputs
- [x] **Format badges:** Decorative only — format info is also in the text description

---

## Test Plan

- [ ] Visual: Dropzone shows upload icon, "Drop your bank export here" text, and format badges at all breakpoints
- [ ] Interactive: Drag a file over the dropzone — border turns accent color, card glows
- [ ] Interactive: Click "Browse files" area — file picker opens
- [ ] Visual: Account selector has rounded corners, focus ring on tab
- [ ] Visual: Preview table has uppercase tracking on headers, hover on rows
- [ ] Visual: Import button is rounded-xl with active:scale-95 press feedback
- [ ] Visual: Select all / Deselect all are pill-shaped buttons, no pipe separator

---

## Verification Checklist

1. Navigate to Import page — dropzone should show the Upload icon with frosted glass card
2. Hover over dropzone — subtle background shift
3. Drag a file — border changes to accent, card glows
4. Drop a file — preview appears with polished table
5. Tab through account selector and checkboxes — focus rings visible
6. Click Import — button shows press animation

---

## What NOT To Do

- **Do NOT change the file parsing or import API logic** — this is purely visual. All `fetch` calls, state management, and data flow remain unchanged.
- **Do NOT add a separate "Browse" button element** — the entire dropzone card is the click target via the label/input pattern. Adding a separate button would create two click targets.
- **Do NOT replace native checkboxes with a custom component** — native checkboxes are more accessible and performant. Just style them.
