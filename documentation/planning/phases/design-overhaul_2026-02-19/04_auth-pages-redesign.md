

I'll start by reading all three auth page files, plus examining the existing design tokens and patterns established in Phase 01 and Phase 02.

Now let me examine the existing design tokens and patterns from Phase 01 and Phase 02.

Let me look for any existing design overhaul documentation and check the dashboard/main app pages to understand the existing dark theme patterns.

Now let me check if there's an auth layout file and see Lucide icon imports used elsewhere to confirm availability.

Let me check the `cn` utility and existing component patterns to understand current conventions.

Now let me check for any existing next-auth configuration to understand the auth flow and callback URLs.

I now have all the information needed. Let me verify one more thing -- do any existing tests cover the auth pages.

Good -- no existing auth page tests. Let me also check the vitest config and the existing test structure for reference.

I now have a thorough understanding of the codebase. Here is the complete implementation plan document.

---

**Status:** ✅ COMPLETE
**Started:** 2026-02-19
**Completed:** 2026-02-19
**PR:** #15

# Phase 04: Auth Pages Redesign

**PR Title:** `feat: redesign auth pages with dark theme and glassmorphism`
**Risk:** Low
**Effort:** Low
**Files Modified:** 3

| File | Change Type |
|---|---|
| `src/app/auth/signin/page.tsx` | Restyle (full rewrite of JSX + classes) |
| `src/app/auth/verify/page.tsx` | Restyle (full rewrite of JSX + classes) |
| `src/app/auth/error/page.tsx` | Restyle (full rewrite of JSX + classes) |

---

## 1. Context

The three auth pages (`/auth/signin`, `/auth/verify`, `/auth/error`) are the very first authenticated touchpoint a user encounters. They currently use a light gray background (`bg-gray-50`) with white cards, blue buttons, and emoji unicode icons. This creates several problems:

- **Contrast bug:** The headings "Really Personal Finance", "Check your email", and "Authentication Error" are rendered in near-default dark text on light backgrounds, but Phase 01's dark theme palette expects white-on-dark. If globals.css or the root layout ever applies the dark background, these headings become nearly invisible against it.
- **Brand inconsistency:** Once the dashboard is restyled with the dark/glassmorphism theme (Phases 01-03), users will see a jarring jump from a generic light auth page to a polished dark dashboard.
- **Emoji icons:** The envelope `&#9993;` and warning `&#9888;` HTML entities render inconsistently across platforms and do not match the Lucide icon set used elsewhere.
- **Mobile overflow:** The cards use `max-w-md w-full` without horizontal margin, so on narrow viewports the card text can clip against screen edges.

This phase brings auth pages into visual parity with the rest of the application, using the target palette from Phase 01 and the glassmorphism card pattern from Phase 02.

---

## 2. Visual Specification

### 2.1 Shared Elements (All Three Pages)

**Background (Before):**
```
bg-gray-50
```

**Background (After):**
```
bg-[#0c0a14] with a centered radial gradient glow
```

The radial gradient is achieved via a pseudo-element or an inner `<div>` with absolute positioning:
```
<div className="fixed inset-0 bg-[#0c0a14]">
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
</div>
```

**Card (Before):**
```
max-w-md w-full p-8 bg-white rounded-xl shadow-sm border
```

**Card (After):**
```
max-w-md w-full mx-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl
```

Key changes: `mx-4` prevents mobile edge clipping, `bg-white/5` plus `backdrop-blur-xl` gives the glass effect, border becomes semi-transparent white, corner radius increases from `xl` to `2xl`.

### 2.2 Sign-in Page (Form State)

**Before:**
- `h1`: "Really Personal Finance" in `text-2xl font-bold` (system dark color, invisible on dark bg)
- `p`: "Sign in or create an account" in `text-gray-600`
- Input: default white background, blue focus ring
- Button: `bg-blue-600 hover:bg-blue-700`
- Disclaimer: `text-xs text-gray-500`

**After:**
- `h1`: "Really Personal Finance" in `text-2xl font-bold text-white` with the word "Personal" optionally wrapped in `<span className="text-indigo-400">` for brand accent
- `p`: Subtitle in `text-zinc-400`
- Input: `bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl` with `focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`
- Button: `bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl` with `transition-colors`
- Disclaimer: `text-xs text-zinc-500`
- Label: `text-sm font-medium text-zinc-300`

### 2.3 Sign-in Page (Sent State)

**Before:**
- `&#9993;` emoji at `text-4xl`
- `h1`: "Check your email" in default dark text
- `p`: body in `text-gray-600`

**After:**
- Lucide `Mail` icon: `<Mail className="w-12 h-12 text-indigo-400 mx-auto" />`
- `h1`: `text-2xl font-bold text-white`
- `p`: `text-zinc-400` with the email address in `<strong className="text-white">`

### 2.4 Verify Page

**Before:**
- `&#9993;` emoji at `text-4xl`
- `h1`: "Check your email" -- invisible on dark backgrounds
- `p`: `text-gray-600`

**After:**
- Lucide `Mail` icon: `<Mail className="w-12 h-12 text-indigo-400 mx-auto" />`
- `h1`: `text-2xl font-bold text-white`
- `p`: `text-zinc-400`
- Same glass card and dark background as sign-in

### 2.5 Error Page

**Before:**
- `&#9888;` emoji at `text-4xl`
- `h1`: "Authentication Error" -- invisible on dark backgrounds
- `p`: `text-gray-600`
- Link button: `bg-blue-600 hover:bg-blue-700`

**After:**
- Lucide `AlertTriangle` icon: `<AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />`
- `h1`: `text-2xl font-bold text-red-400` (red tint for error state)
- `p`: `text-zinc-400`
- Link button: `bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors`
- Same glass card and dark background

---

## 3. Dependencies

| Dependency | Status |
|---|---|
| Phase 01 (palette: `#0c0a14`, indigo accents, zinc muted text) | Design tokens defined; this phase hardcodes the values directly in utility classes |
| Phase 02 (glassmorphism card pattern) | Pattern defined; this phase applies it to auth cards |
| `lucide-react` (^0.563.0) | Already installed in `package.json` |
| No new npm packages required | -- |

Note: The current `globals.css` still defines `--background` as `#ffffff` (light mode) and `#0a0a0a` (dark mode via `prefers-color-scheme`). The auth pages in this phase use hardcoded `bg-[#0c0a14]` to match the target palette regardless of which Phase 01 approach is taken for the CSS custom properties. This is intentional -- the auth pages should look correct even before Phase 01 lands on the dashboard.

---

## 4. Detailed Implementation Plan

### Step 1: Modify `src/app/auth/signin/page.tsx`

**Current file** (81 lines, `"use client"`, uses `useState`, `signIn` from `next-auth/react`).

The logic (state management, `handleSubmit`, the conditional `sent` render) remains completely unchanged. Only the JSX className strings and the emoji replacement change.

**Complete replacement contents:**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-[#0c0a14] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="relative max-w-md w-full mx-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
          <div className="text-center">
            <Mail className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Check your email
            </h1>
            <p className="text-zinc-400">
              We sent a sign-in link to{" "}
              <strong className="text-white">{email}</strong>. Click the link to
              sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a14] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="relative max-w-md w-full mx-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            Really <span className="text-indigo-400">Personal</span> Finance
          </h1>
          <p className="text-zinc-400 mt-2">
            Sign in or create an account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300 mb-1"
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
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? "Sending link..." : "Continue with email"}
          </button>
        </form>

        <p className="text-xs text-zinc-500 text-center mt-6">
          By signing in, you agree that your bank transactions will be stored
          securely in our database to provide spending insights.
        </p>
      </div>
    </div>
  );
}
```

**Key changes from original:**

| Aspect | Before | After |
|---|---|---|
| Import | `useState`, `signIn` | `useState`, `signIn`, `Mail` from lucide-react |
| Outer bg | `bg-gray-50` | `bg-[#0c0a14]` + radial gradient div |
| Card | `bg-white rounded-xl shadow-sm border` | `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl` |
| Card margin | none | `mx-4` (mobile safe) |
| Card wrapper | none | `relative` (stacking context above gradient) |
| h1 color | default (dark/invisible) | `text-white` with `text-indigo-400` accent on "Personal" |
| Subtitle | `text-gray-600` | `text-zinc-400` |
| Label | `text-gray-700` | `text-zinc-300` |
| Input bg | default white | `bg-white/5` |
| Input border | `border` (default) | `border border-white/10` |
| Input text | default dark | `text-white placeholder:text-zinc-500` |
| Focus ring | `focus:ring-blue-500` | `focus:ring-indigo-500` |
| Button | `bg-blue-600 hover:bg-blue-700` | `bg-indigo-600 hover:bg-indigo-500` |
| Button radius | `rounded-lg` | `rounded-xl` |
| Disclaimer | `text-gray-500` | `text-zinc-500` |
| Sent icon | `&#9993;` emoji div | `<Mail>` Lucide component |
| Sent h1 | default dark text | `text-white` |
| Sent body | `text-gray-600` | `text-zinc-400` |
| Email highlight | `<strong>` (dark) | `<strong className="text-white">` |

### Step 2: Modify `src/app/auth/verify/page.tsx`

**Current file** (14 lines, server component, no imports).

**Complete replacement contents:**

```tsx
import { Mail } from "lucide-react";

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a14] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="relative max-w-md w-full mx-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center">
        <Mail className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">
          Check your email
        </h1>
        <p className="text-zinc-400">
          A sign-in link has been sent to your email address. Click the link to
          continue.
        </p>
      </div>
    </div>
  );
}
```

**Key changes from original:**

| Aspect | Before | After |
|---|---|---|
| Import | none | `Mail` from lucide-react |
| Icon | `&#9993;` HTML entity div | `<Mail>` Lucide component |
| h1 | invisible default dark | `text-white` |
| Body | `text-gray-600` | `text-zinc-400` |
| Background | `bg-gray-50` | `bg-[#0c0a14]` + radial gradient |
| Card | `bg-white rounded-xl shadow-sm border` | glass pattern |
| Mobile safety | none | `mx-4` |

Note: This page remains a server component. Lucide icons are tree-shakeable React components that work in both server and client components.

### Step 3: Modify `src/app/auth/error/page.tsx`

**Current file** (51 lines, `"use client"`, uses `useSearchParams`, `Link`, `Suspense`).

The logic (`ErrorContent` inner component, error message lookup, Suspense boundary) remains completely unchanged.

**Complete replacement contents:**

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a14] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="relative max-w-md w-full mx-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-red-400 mb-2">
          Authentication Error
        </h1>
        <p className="text-zinc-400 mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block py-2 px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-medium transition-colors"
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
        <div className="min-h-screen flex items-center justify-center bg-[#0c0a14] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="relative max-w-md w-full mx-4 p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center">
            <p className="text-zinc-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
```

**Key changes from original:**

| Aspect | Before | After |
|---|---|---|
| Import | `useSearchParams`, `Link`, `Suspense` | Same + `AlertTriangle` from lucide-react |
| Icon | `&#9888;` HTML entity div | `<AlertTriangle>` Lucide component |
| Icon color | default text | `text-red-400` |
| h1 color | default (invisible) | `text-red-400` (red tint for error) |
| Body | `text-gray-600` | `text-zinc-400` |
| Button | `bg-blue-600 hover:bg-blue-700 rounded-lg` | `bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors` |
| Background | `bg-gray-50` | `bg-[#0c0a14]` + radial gradient |
| Card | `bg-white rounded-xl shadow-sm border` | glass pattern |
| Fallback | light theme | dark theme with glass card |
| Mobile safety | none | `mx-4` |

---

## 5. Responsive Behavior

### Mobile (< 640px)

- `mx-4` on all cards provides 16px horizontal margin, preventing text from touching screen edges. This is the primary fix for the current mobile overflow bug.
- `max-w-md` (448px) has no effect when viewport is narrower; the card fills the screen minus 32px total margin.
- `p-8` (32px) inner padding is comfortable even on 320px screens: 320 - 32 (mx-4 both sides) = 288px card width, minus 64px padding = 224px content area. This is sufficient for the email input and button.
- The radial gradient (`overflow-hidden` on parent) prevents horizontal scroll from the gradient exceeding viewport bounds.

### Tablet (640px - 1024px)

- Card centers in viewport at `max-w-md` (448px).
- No layout changes needed; the centered single-column layout is ideal for auth forms at all tablet sizes.

### Desktop (> 1024px)

- Card remains centered at 448px width. Auth forms should not stretch wider.
- The radial gradient provides ambient visual interest across the large dark background.

### No Breakpoint-Specific Classes Needed

The design is inherently responsive: a single centered card with `mx-4` safety margin works at all sizes. No `sm:`, `md:`, or `lg:` prefixes are required.

---

## 6. Accessibility Checklist

### Form Labels
- [x] Email input has explicit `<label htmlFor="email">` linked to `<input id="email">` -- unchanged from current implementation.
- [x] Label text "Email address" is clear and descriptive.
- [x] `type="email"` triggers appropriate mobile keyboard.
- [x] `required` attribute provides native validation.

### Focus States
- [x] Input focus: `focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500` provides a visible 2px indigo ring. Indigo-500 (`#6366f1`) against `bg-white/5` provides a contrast ratio well above 3:1 for non-text UI elements (WCAG 2.1 SC 1.4.11).
- [x] Button focus: default browser focus ring is visible. Consider adding `focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#0c0a14]` for enhanced visibility. (The `ring-offset` color matches the background so the ring floats visually.)
- [x] Link focus ("Try again"): inherits default focus styles. Same enhancement can be applied.

### Color Contrast (WCAG AA = 4.5:1 for normal text, 3:1 for large text)
- **White text (`#ffffff`) on `bg-[#0c0a14]`**: Contrast ratio ~19.5:1. Exceeds AAA.
- **`text-zinc-400` (`#a1a1aa`) on `bg-[#0c0a14]`**: Contrast ratio ~7.5:1. Exceeds AA.
- **`text-zinc-500` (`#71717a`) on `bg-[#0c0a14]`**: Contrast ratio ~4.8:1. Exceeds AA for normal text.
- **`text-zinc-300` (`#d4d4d8`) on `bg-[#0c0a14]`**: Contrast ratio ~13:1. Exceeds AAA.
- **`text-indigo-400` (`#818cf8`) on `bg-[#0c0a14]`**: Contrast ratio ~5.8:1. Exceeds AA.
- **`text-red-400` (`#f87171`) on `bg-[#0c0a14]`**: Contrast ratio ~5.5:1. Exceeds AA.
- **White text on `bg-indigo-600` (`#4f46e5`)**: Contrast ratio ~5.9:1. Exceeds AA.
- **`placeholder:text-zinc-500`**: Placeholder text is not required to meet contrast ratios per WCAG, but 4.8:1 exceeds AA anyway.

### Error Messaging
- [x] Error page displays human-readable messages from the `errorMessages` lookup table -- unchanged.
- [x] The `AlertTriangle` icon provides visual indication of error state.
- [x] Red color on heading reinforces error semantics.
- [x] "Try again" link provides clear recovery action.

### Keyboard Navigation
- [x] Tab order: Email input, Submit button (sign-in page); "Try again" link (error page).
- [x] Enter key submits form (standard `<form onSubmit>`).
- [x] No keyboard traps.

### Screen Reader Considerations
- [x] Lucide icons are decorative (they accompany visible text headings), so they do not require `aria-label`. Lucide's default behavior of setting `aria-hidden="true"` on SVGs is correct here.
- [x] The "Loading..." fallback on the error page is accessible screen-reader text.
- [x] `disabled` attribute on submit button during loading is properly announced.

### Recommendation (Optional Enhancement)
Consider adding `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a14]` to the button and link elements. This shows focus rings only for keyboard users (not mouse clicks), which is a UX improvement without accessibility cost.

---

## 7. Test Plan

### 7.1 Manual Visual Testing

Since these are purely visual/styling changes with no logic modifications, manual testing is the primary verification method:

1. **Sign-in page (form state):**
   - Navigate to `/auth/signin`
   - Verify dark background with subtle indigo glow
   - Verify glass card is visible with translucent border
   - Verify "Really Personal Finance" heading is white with "Personal" in indigo
   - Verify email input has dark background, white text, visible placeholder
   - Verify button is indigo with hover state
   - Resize to 320px width: verify no horizontal overflow, card has margins

2. **Sign-in page (sent state):**
   - Submit a valid email address
   - Verify Mail icon appears (not emoji)
   - Verify "Check your email" heading is white and visible
   - Verify the email address is highlighted in white bold

3. **Verify page:**
   - Navigate to `/auth/verify`
   - Verify Mail icon, white heading, muted body text
   - Verify same dark/glass theme as sign-in

4. **Error page:**
   - Navigate to `/auth/error` (no error param)
   - Verify AlertTriangle icon in red
   - Verify "Authentication Error" heading in red
   - Verify "Try again" button is indigo
   - Navigate to `/auth/error?error=Verification` -- verify correct message
   - Navigate to `/auth/error?error=AccessDenied` -- verify correct message

5. **Cross-browser:**
   - Test `backdrop-blur-xl` in Chrome, Firefox, Safari
   - Verify graceful degradation: if backdrop-blur is unsupported, the card still has `bg-white/5` providing a visible (if not blurred) container

### 7.2 Automated Testing (Optional)

No automated tests exist for auth pages currently. The changes are purely cosmetic (class names and icon swaps), with zero logic changes. Automated tests are not required for this phase, but if desired, simple render tests can verify the Lucide icons are present:

```tsx
// Conceptual test (would require jsdom environment + React Testing Library)
import { render, screen } from "@testing-library/react";

// Test would verify:
// - SignInPage renders without crashing
// - Mail icon SVG is present in sent state
// - AlertTriangle SVG is present in error page
```

Given the `vitest.config.ts` uses `environment: "node"` (not `jsdom`), component render tests would require either changing the environment or using per-file environment overrides. This is out of scope for this phase.

### 7.3 Build Verification

```bash
npm run build
```

Confirm no TypeScript errors from the Lucide imports or JSX changes. The build will also verify that Tailwind CSS 4 correctly processes all the utility classes used (arbitrary values like `bg-[#0c0a14]`, `bg-[radial-gradient(...)]`).

---

## 8. Verification Checklist

- [ ] `npm run build` passes with no errors
- [ ] `/auth/signin` shows dark background, glass card, white heading with indigo accent
- [ ] `/auth/signin` email input has dark styling, indigo focus ring
- [ ] `/auth/signin` submit button is indigo, hover lightens to indigo-500
- [ ] `/auth/signin` after submit: Mail icon (not emoji), white heading, email in bold white
- [ ] `/auth/verify` shows Mail icon (not emoji), white heading, muted body
- [ ] `/auth/error` shows AlertTriangle icon (not emoji), red heading, muted body, indigo button
- [ ] `/auth/error?error=Verification` shows correct expired-link message
- [ ] All three pages: card does not overflow horizontally on 320px viewport
- [ ] All three pages: radial gradient glow is visible behind card on desktop
- [ ] All three pages: no black footer bar or other stray elements
- [ ] Tab navigation works correctly through all interactive elements
- [ ] Screen reader announces form labels and button states correctly
- [ ] `backdrop-blur-xl` renders correctly in Chrome, Firefox, Safari
- [ ] No console errors or warnings
- [ ] Existing tests (`npm run test`) still pass (no regressions from unrelated changes)

---

## 9. What NOT To Do

1. **Do NOT create shared layout or wrapper components.** Each auth page is self-contained. Extracting a shared `AuthLayout` component is premature abstraction for three simple pages. If future phases add more auth pages, a layout can be extracted then.

2. **Do NOT modify `globals.css` or any CSS custom properties.** The auth pages use hardcoded Tailwind utility classes (`bg-[#0c0a14]`, `text-white`, etc.). Updating the global design tokens is Phase 01's responsibility. These pages will work correctly regardless of whether Phase 01 has landed.

3. **Do NOT change any auth logic.** The `handleSubmit` function, `signIn()` call, state management, `useSearchParams()`, error message lookup, and Suspense boundary must remain byte-for-byte identical. This is a purely visual change.

4. **Do NOT add animations or transitions beyond `transition-colors`.** The button hover state uses `transition-colors` for a smooth color change. Do not add entrance animations, card fade-ins, or gradient animations. Keep the pages fast and simple.

5. **Do NOT use `bg-background` or other CSS variable references.** The current `globals.css` defines `--background` as `#ffffff` in light mode, which would produce a white background. Use the hardcoded `bg-[#0c0a14]` until Phase 01 updates the CSS variables.

6. **Do NOT add a `<footer>` or navigation elements.** Auth pages should be minimal, single-purpose screens. No header, sidebar, or footer.

7. **Do NOT install any new npm packages.** `lucide-react` is already installed. All Tailwind classes used are built-in to Tailwind CSS 4.

8. **Do NOT modify `src/lib/auth.config.ts` or `src/lib/auth.ts`.** The auth configuration (custom pages paths, adapter, callbacks) is completely separate from the page styling.

9. **Do NOT use `dark:` variant classes.** The auth pages should always be dark, regardless of system color scheme preference. Use explicit color values, not theme-dependent variants.

10. **Do NOT add `"use client"` to `verify/page.tsx`.** The verify page has no client-side interactivity (no state, no event handlers). It can remain a server component. The `Mail` icon from Lucide works in server components.

---

### Critical Files for Implementation
- `/Users/chris/Projects/really-personal-finance/src/app/auth/signin/page.tsx` - Primary file: add Lucide Mail import, restyle all JSX with dark theme and glassmorphism classes
- `/Users/chris/Projects/really-personal-finance/src/app/auth/verify/page.tsx` - Replace emoji with Lucide Mail icon, apply dark background and glass card classes
- `/Users/chris/Projects/really-personal-finance/src/app/auth/error/page.tsx` - Replace emoji with Lucide AlertTriangle icon, apply dark/glass theme, update Suspense fallback
- `/Users/chris/Projects/really-personal-finance/src/app/globals.css` - Reference only (do NOT modify): understand current CSS variable state to confirm hardcoded values are needed
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` - Reference only: pattern for Lucide icon imports from this codebase