

I'll start by reading the current dashboard layout and exploring related files to understand the full context.

Now let me read the utility file for the `cn` function, and check the existing Tailwind/global CSS setup and any existing documentation for Phase 01/02.

Now let me check how the dashboard pages reference the layout, and look at a sample page to see if any use padding/margin assumptions.

Let me also check the profile page path and any other dashboard pages that might have layout assumptions.

Now let me check which Lucide icons are already available and verify the version.

Now I have a thorough understanding of the codebase. Let me verify one more thing -- the Tailwind 4 breakpoint defaults, since the project uses Tailwind v4.

Good -- no custom breakpoints, so the project uses Tailwind 4 defaults: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. That aligns with the task's breakpoint definitions.

Now I have everything I need to write the complete implementation plan.

---

# Phase 06 -- Responsive Sidebar with Mobile Drawer Navigation

## 1. Header

| Field | Value |
|---|---|
| **PR Title** | `feat: responsive sidebar with mobile drawer navigation` |
| **Risk** | Low |
| **Effort** | Medium |
| **Files Modified** | 1 (`src/app/dashboard/layout.tsx`) |
| **Dependencies** | None blocking. Phase 01 (dark palette) is a prerequisite for final colors, but this plan can land independently using the dark palette inline. Phase 02 (glass effect) optional enhancement. |

---

## 2. Context

The dashboard is currently desktop-only. The sidebar is a fixed `w-64 bg-white border-r` element that occupies the entire left column at all viewport widths. On viewports below 768px, the sidebar consumes most of the horizontal space, leaving the main content area effectively unusable. There is no hamburger menu, no slide-out drawer, no responsive collapse -- nothing.

This phase introduces three responsive tiers:

- **Mobile (<768px):** Sidebar completely hidden. A fixed top header bar with a hamburger menu triggers a slide-out drawer overlay.
- **Tablet (768px--1023px):** Collapsed icon-only sidebar (w-16), with labels appearing on hover via a CSS group-hover technique.
- **Desktop (1024px+):** Full sidebar with icons and labels, same navigation structure as today but dark-themed.

Only one file changes: `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx`. No new dependencies are introduced. The implementation uses `useState`, `useEffect`, `usePathname`, `useCallback`, and `useRef` -- all standard React hooks. The Lucide icons `Menu` and `X` are added to the existing import.

---

## 3. Visual Specification

### 3.1 Mobile (<768px) -- Header Bar + Drawer

**Header bar (visible only below `md` breakpoint):**
- Position: `fixed top-0 left-0 right-0 z-40`
- Height: 56px (`h-14`)
- Background: `bg-[#0c0a14]`
- Border: `border-b border-white/10`
- Left: App name "Really Personal Finance" -- `text-sm font-bold text-white`
- Right: Hamburger icon (`Menu` from Lucide, 24x24) -- `text-zinc-400 hover:text-white`

**Drawer overlay:**
- Backdrop: `fixed inset-0 z-40 bg-black/50` -- click to close
- Drawer panel: `fixed top-0 left-0 bottom-0 w-64 z-50 bg-[#13111c] border-r border-white/10`
- Transition: `transform transition-transform duration-300 ease-in-out`
  - Closed: `translate-x-[-100%]` (off-screen left)
  - Open: `translate-x-0`
- Close button: `X` icon in top-right of drawer header area
- Content: Same nav items with icons + labels, user email, sign out button
- Backdrop transition: `opacity-0` to `opacity-100`, `transition-opacity duration-300`

**Main content area:**
- Add `pt-14` to compensate for the fixed header height on mobile
- Padding: `p-4` on mobile (reduced from desktop `p-8`)

### 3.2 Tablet (768px--1023px) -- Collapsed Sidebar

- Width: `w-16` (64px, enough for centered icons)
- Background: `bg-[#13111c]`
- Border: `border-r border-white/10`
- Nav items: Icon only, centered (`justify-center`), with `title` attribute for tooltip
- On hover of the sidebar container (CSS `group`/`group-hover`): sidebar expands to `w-64` and labels become visible
- Transition: `transition-all duration-200 ease-in-out`
- Main content: `ml-16` (shifts to accommodate collapsed sidebar), with `p-6` padding
- When sidebar expands on hover, it overlaps content (uses `absolute` or `z-30` positioning) rather than pushing content

### 3.3 Desktop (1024px+) -- Full Sidebar

- Width: `w-64`
- Background: `bg-[#13111c]`
- Border: `border-r border-white/10`
- Nav items: Icon + label, full width
  - Default: `text-zinc-400 hover:bg-white/5 hover:text-white`
  - Active: `bg-indigo-500/10 text-indigo-400`
- Header section: App name in `text-white font-bold`
- Footer section: User email (truncated with `truncate` class), sign out button
  - Sign out hover: `hover:bg-white/5 hover:text-red-400`
- Main content: Standard `flex-1 p-8 overflow-auto`

---

## 4. Dependencies

| Dependency | Status | Impact |
|---|---|---|
| Phase 01 (dark palette / `globals.css`) | Not yet landed | This plan applies dark colors directly via Tailwind utility classes (`bg-[#0c0a14]`, `bg-[#13111c]`, `text-white`, `text-zinc-400`). When Phase 01 lands and introduces CSS variables or theme tokens, the hardcoded hex values can be swapped. No blocking dependency. |
| Phase 02 (glass effect) | Not yet landed | The sidebar could use `bg-white/5 backdrop-blur-xl` instead of `bg-[#13111c]`. This is a one-line swap after Phase 02 lands. Not blocking. |
| Lucide React | Already installed (`^0.563.0`) | `Menu` and `X` icons are available. |
| `cn` utility | Already exists at `src/lib/utils.ts` | Used for conditional class merging. |

---

## 5. Detailed Implementation Plan

### 5.1 Current File (Before)

The current file is `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` -- 89 lines. It renders a static `<aside className="w-64 bg-white border-r">` with no responsive behavior. The full current contents are reproduced in Section 2 of the exploration above (lines 1--89).

Key observations from the current file:
- `navItems` array is defined at module level -- this is good, reuse it
- Uses `usePathname()` for active state detection -- keep this
- Uses `useSession()` for user email -- keep this
- Uses `signOut()` from next-auth -- keep this
- Uses `cn()` for class merging -- keep this
- Imports from `lucide-react`: `LayoutDashboard`, `Receipt`, `PieChart`, `Store`, `Upload`, `User`, `LogOut` -- add `Menu` and `X`

### 5.2 New File (After) -- Complete Contents

The following is the complete replacement for `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Menu,
  X,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Focus trap and keyboard handling for drawer
  useEffect(() => {
    if (!drawerOpen) return;

    // Focus the close button when drawer opens
    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      // Focus trap within drawer
      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl?.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  }

  // -- Shared nav rendering --------------------------------------------------

  function renderNavItems(showLabels: boolean) {
    return navItems.map((item) => {
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          title={!showLabels ? item.label : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
            showLabels ? "px-3 py-2" : "justify-center px-0 py-2",
            active
              ? "bg-indigo-500/10 text-indigo-400"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <item.icon className="w-5 h-5 shrink-0" />
          {showLabels && <span>{item.label}</span>}
        </Link>
      );
    });
  }

  function renderFooter(showLabels: boolean) {
    return (
      <>
        <Link
          href="/profile"
          title={!showLabels ? (session?.user?.email || "Profile") : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors",
            showLabels ? "px-3 py-2" : "justify-center px-0 py-2"
          )}
        >
          <User className="w-5 h-5 shrink-0" />
          {showLabels && (
            <span className="truncate">
              {session?.user?.email || "Profile"}
            </span>
          )}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          title={!showLabels ? "Sign out" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-red-400 w-full transition-colors",
            showLabels ? "px-3 py-2" : "justify-center px-0 py-2"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {showLabels && <span>Sign out</span>}
        </button>
      </>
    );
  }

  // -- Render -----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0c0a14] flex">
      {/* ================= MOBILE HEADER (<md) ================= */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-[#0c0a14] border-b border-white/10 md:hidden">
        <Link href="/dashboard" className="text-sm font-bold text-white">
          Really Personal Finance
        </Link>
        <button
          ref={menuButtonRef}
          onClick={openDrawer}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          className="text-zinc-400 hover:text-white p-1"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* ================= MOBILE DRAWER (<md) ================= */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 z-50 bg-[#13111c] border-r border-white/10 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-white"
            onClick={closeDrawer}
          >
            Really Personal Finance
          </Link>
          <button
            ref={closeButtonRef}
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="text-zinc-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 p-4 space-y-1">
          {renderNavItems(true)}
        </nav>

        {/* Drawer footer */}
        <div className="p-4 border-t border-white/10 space-y-1">
          {renderFooter(true)}
        </div>
      </div>

      {/* ================= TABLET SIDEBAR (md to lg) ================= */}
      <aside
        className={cn(
          "hidden md:flex lg:hidden flex-col shrink-0",
          "w-16 hover:w-64 group/sidebar",
          "bg-[#13111c] border-r border-white/10",
          "transition-all duration-200 ease-in-out",
          "fixed top-0 left-0 bottom-0 z-30"
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-white/10 h-14 flex items-center overflow-hidden">
          <Link href="/dashboard" className="text-sm font-bold text-white whitespace-nowrap">
            <LayoutDashboard className="w-5 h-5 shrink-0 group-hover/sidebar:hidden" />
            <span className="hidden group-hover/sidebar:inline">Really Personal Finance</span>
          </Link>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 p-2 group-hover/sidebar:p-4 space-y-1 overflow-hidden">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors py-2",
                  "justify-center group-hover/sidebar:justify-start",
                  "px-0 group-hover/sidebar:px-3",
                  active
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="hidden group-hover/sidebar:inline whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-2 group-hover/sidebar:p-4 border-t border-white/10 space-y-1 overflow-hidden">
          <Link
            href="/profile"
            title={session?.user?.email || "Profile"}
            className="flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors py-2 justify-center group-hover/sidebar:justify-start px-0 group-hover/sidebar:px-3"
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="hidden group-hover/sidebar:inline truncate whitespace-nowrap">
              {session?.user?.email || "Profile"}
            </span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="flex items-center gap-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-red-400 w-full transition-colors py-2 justify-center group-hover/sidebar:justify-start px-0 group-hover/sidebar:px-3"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden group-hover/sidebar:inline whitespace-nowrap">
              Sign out
            </span>
          </button>
        </div>
      </aside>

      {/* ================= DESKTOP SIDEBAR (lg+) ================= */}
      <aside className="hidden lg:flex flex-col shrink-0 w-64 bg-[#13111c] border-r border-white/10">
        {/* Sidebar header */}
        <div className="p-6 border-b border-white/10">
          <Link href="/dashboard" className="text-lg font-bold text-white">
            Really Personal Finance
          </Link>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 p-4 space-y-1">
          {renderNavItems(true)}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/10 space-y-1">
          {renderFooter(true)}
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main
        className={cn(
          "flex-1 overflow-auto",
          // Mobile: top padding for fixed header, smaller side padding
          "pt-18 px-4 pb-4",
          // Tablet: left margin for collapsed sidebar, more padding
          "md:pt-0 md:pl-22 md:pr-6 md:py-6",
          // Desktop: no margin offset needed (sidebar in flow), full padding
          "lg:pl-0 lg:p-8"
        )}
      >
        {children}
      </main>
    </div>
  );
}
```

### 5.3 Implementation Notes and Decision Rationale

**Decision: Three distinct sidebar renderings vs. one with conditional classes.**

I chose to render three separate `<aside>` / drawer elements gated by `hidden md:flex lg:hidden` (tablet) and `hidden lg:flex` (desktop) breakpoint classes, plus the mobile drawer controlled by state. The alternative -- a single sidebar with heavily conditional responsive classes -- becomes extremely difficult to read and maintain. Three separate blocks are clearer, and the dead DOM is minimal (a few nav links duplicated). The `renderNavItems()` and `renderFooter()` helpers eliminate code duplication for the nav content itself.

**Decision: Tablet sidebar uses CSS `group-hover` for expand, not JS state.**

The tablet sidebar expand-on-hover uses Tailwind's `group/sidebar` and `group-hover/sidebar:` modifiers. This is pure CSS -- no event handlers, no state, no timers. The sidebar is `fixed` positioned so it overlays content when expanded rather than pushing it. This avoids layout shift.

**Decision: Tablet sidebar is `fixed` positioned, desktop sidebar is in normal flow.**

The tablet collapsed sidebar needs to overlay when it expands on hover. Making it `fixed` means the main content needs a left margin (`md:pl-22` which is 88px, close to `w-16` = 64px plus some breathing room -- this will need tuning; see section 5.4). The desktop sidebar is in the normal document flow (`flex` child), so `lg:pl-0` removes the tablet margin.

**Decision: Mobile drawer uses `transform` animation, not `display:none` toggle.**

The drawer is always in the DOM but translated off-screen. This enables the CSS transition to animate smoothly. The backdrop uses opacity transition. The `pointer-events-none` class on the backdrop when closed prevents it from capturing clicks.

### 5.4 Padding/Margin Calibration Warning

The `md:pl-22` value for the main content area when the tablet sidebar is present needs careful verification. Tailwind 4 default spacing scale: `pl-16` = 64px (matches `w-16`), `pl-20` = 80px, `pl-24` = 96px. The correct value is `md:ml-16` (matching the sidebar width exactly) or `md:pl-20` for 16px of visual breathing room beyond the sidebar edge. In Tailwind 4, arbitrary values work too: `md:pl-[72px]`.

**Recommended approach:** Use `md:ml-16` (exact match to sidebar width since the sidebar is `fixed`) and keep `md:px-6` for content padding. The complete main content classes become:

```tsx
<main
  className={cn(
    "flex-1 overflow-auto",
    "pt-18 px-4 pb-4",            // mobile
    "md:pt-6 md:pb-6 md:ml-16 md:px-6",  // tablet
    "lg:ml-0 lg:p-8"              // desktop (sidebar in flow, no margin needed)
  )}
>
```

Note: `pt-18` = 72px. The mobile header is `h-14` = 56px. The extra 16px provides breathing room. Alternatively, use `pt-16` (64px) for tighter spacing, or the arbitrary value `pt-[60px]`.

---

## 6. Responsive Behavior

### Breakpoint Matrix

| Viewport | Header | Sidebar | Drawer | Main Content Offset |
|---|---|---|---|---|
| < 768px (mobile) | Fixed top bar visible | Hidden | Available via hamburger | `pt-18 px-4` |
| 768px--1023px (tablet) | Hidden | Collapsed `w-16`, fixed, expands on hover | Hidden | `ml-16 px-6` |
| >= 1024px (desktop) | Hidden | Full `w-64`, in document flow | Hidden | `p-8` (no offset) |

### Transition Behaviors

| Element | Trigger | Animation |
|---|---|---|
| Mobile drawer panel | `drawerOpen` state toggle | `transform: translateX(-100%) -> translateX(0)`, 300ms ease-in-out |
| Mobile backdrop | `drawerOpen` state toggle | `opacity: 0 -> 1`, 300ms |
| Tablet sidebar expand | CSS `:hover` on sidebar container | `width: 4rem -> 16rem`, 200ms ease-in-out |
| Tablet nav labels | CSS `group-hover` | `display: none -> inline`, instant (in sync with width transition) |

### What Happens at Each Breakpoint Boundary

**767px -> 768px (crossing into `md`):**
- Mobile header disappears (`md:hidden`)
- Mobile drawer becomes inaccessible (`md:hidden`)
- Tablet collapsed sidebar appears (`hidden md:flex lg:hidden`)
- Main content loses top padding, gains left margin

**1023px -> 1024px (crossing into `lg`):**
- Tablet sidebar disappears (`lg:hidden`)
- Desktop full sidebar appears (`hidden lg:flex`)
- Main content loses left margin (sidebar now in document flow)

**If the drawer is open and the user resizes past 768px:**
- The drawer DOM is still present but has `md:hidden`, so it disappears visually
- `body.style.overflow` is still `"hidden"` -- the `useEffect` cleanup will fire if the component re-renders, but resizing alone does not trigger a state change
- **Mitigation:** Add a `matchMedia` listener or handle this in the `useEffect` that manages body overflow. Alternatively, since resize during drawer-open is an edge case (mostly dev tools), it can be addressed post-merge.

---

## 7. Accessibility Checklist

| Requirement | Implementation |
|---|---|
| **ARIA role on drawer** | `role="dialog"` and `aria-modal="true"` on the drawer panel |
| **ARIA label on drawer** | `aria-label="Navigation menu"` |
| **Hamburger button ARIA** | `aria-label="Open navigation menu"`, `aria-expanded={drawerOpen}`, `aria-controls="mobile-drawer"` |
| **Close button ARIA** | `aria-label="Close navigation menu"` |
| **Backdrop hidden from a11y tree** | `aria-hidden="true"` on the backdrop div |
| **Focus trap in drawer** | `useEffect` with keydown listener traps Tab within focusable elements inside `drawerRef` |
| **Escape to close** | Keydown listener handles Escape key, closes drawer |
| **Focus return on close** | After closing, focus returns to `menuButtonRef` (the hamburger button) |
| **Focus on open** | When drawer opens, focus moves to `closeButtonRef` (the X button) |
| **Keyboard navigation** | All nav items are `<Link>` (focusable), sign out is `<button>` (focusable). Standard Tab order works. |
| **Tablet tooltip** | `title` attribute on icon-only nav items provides native tooltip |
| **Color contrast** | White text on `#13111c` background: contrast ratio ~15.4:1 (passes AAA). `#a1a1aa` (zinc-400) on `#13111c`: ratio ~6.5:1 (passes AA). Indigo-400 (`#818cf8`) on indigo-500/10 (`rgba(99,102,241,0.1)` on `#13111c`): effective background ~`#171530`, contrast ~6.8:1 (passes AA). |
| **Reduced motion** | Consider adding `motion-reduce:transition-none` to the drawer and sidebar transitions for users who prefer reduced motion. This is a recommended enhancement. |

---

## 8. Test Plan

### 8.1 Manual Testing Matrix

| Test | Mobile (<768) | Tablet (768-1023) | Desktop (1024+) |
|---|---|---|---|
| Page loads without errors | Verify | Verify | Verify |
| Correct sidebar variant visible | Header + no sidebar | Collapsed sidebar | Full sidebar |
| Nav items render correctly | In drawer | Icons only (labels on hover) | Icons + labels |
| Active nav item highlighted | Indigo tint in drawer | Indigo tint on icon | Indigo tint on item |
| Navigate between pages | Drawer closes on route change | Works normally | Works normally |
| User email visible | In drawer footer | On sidebar hover | In sidebar footer |
| Sign out button works | In drawer footer | On sidebar hover | In sidebar footer |

### 8.2 Mobile Drawer Tests

1. **Open drawer:** Tap hamburger. Drawer slides in from left. Backdrop appears.
2. **Close via X:** Tap X button. Drawer slides out. Backdrop fades.
3. **Close via backdrop:** Tap backdrop area. Same result.
4. **Close via Escape:** Press Escape key. Drawer closes. Focus returns to hamburger.
5. **Focus trap:** With drawer open, Tab through all items. After last item, Tab wraps to first item. Shift+Tab from first wraps to last.
6. **Route change closes drawer:** Tap a nav link. Page navigates. Drawer closes automatically.
7. **Body scroll lock:** With drawer open, try scrolling the page behind it. It should not scroll.

### 8.3 Tablet Hover Expand Tests

1. **Collapsed state:** Sidebar shows icons only at 64px width.
2. **Hover expand:** Mouse over sidebar. It expands to 256px. Labels appear.
3. **Hover exit:** Mouse leaves sidebar. It collapses back. Labels disappear.
4. **Click nav item while expanded:** Navigates correctly.

### 8.4 Resize Transition Tests

1. Resize from desktop to tablet: Full sidebar transitions to collapsed sidebar.
2. Resize from tablet to mobile: Collapsed sidebar disappears, header bar appears.
3. Resize from mobile to tablet with drawer open: Drawer should be hidden by `md:hidden`, collapsed sidebar appears.

### 8.5 Automated Tests (Vitest)

Unit tests for this layout are limited since it is a heavily visual/interactive component. However, the following can be tested with `@testing-library/react`:

- Render the layout, verify hamburger button is in the DOM
- Simulate click on hamburger, verify drawer has `translate-x-0` class
- Simulate click on backdrop, verify drawer has `-translate-x-full` class
- Simulate Escape keypress with drawer open, verify drawer closes
- Verify all 5 nav items + profile + sign out are rendered
- Verify active nav item detection logic with mocked `usePathname`

Note: Breakpoint-specific rendering (`md:hidden`, etc.) cannot be tested with jsdom since it does not support CSS media queries. These remain manual/visual tests.

---

## 9. Verification Checklist

- [ ] Mobile (<768px): Header bar visible with app name and hamburger icon
- [ ] Mobile: Tapping hamburger opens drawer with slide animation
- [ ] Mobile: Drawer shows all 5 nav items with icons and labels
- [ ] Mobile: Drawer shows user email and sign out at bottom
- [ ] Mobile: Tapping backdrop closes drawer
- [ ] Mobile: Tapping X button closes drawer
- [ ] Mobile: Pressing Escape closes drawer
- [ ] Mobile: Focus moves to X button when drawer opens
- [ ] Mobile: Focus returns to hamburger when drawer closes
- [ ] Mobile: Tab key cycles within drawer (focus trap)
- [ ] Mobile: Body does not scroll when drawer is open
- [ ] Mobile: Navigating to a page closes the drawer
- [ ] Mobile: Main content has enough top padding to clear the fixed header
- [ ] Tablet (768-1023px): Collapsed sidebar with icons only
- [ ] Tablet: Hovering sidebar expands it with labels
- [ ] Tablet: Moving mouse away collapses sidebar
- [ ] Tablet: Main content has left margin to clear collapsed sidebar
- [ ] Tablet: No mobile header bar visible
- [ ] Desktop (1024px+): Full sidebar with icons and labels
- [ ] Desktop: Active nav item shows indigo tint
- [ ] Desktop: Hover on inactive nav item shows `bg-white/5`
- [ ] Desktop: No mobile header bar visible
- [ ] Desktop: Sign out hover shows red tint
- [ ] All breakpoints: Dark background (`#0c0a14`) on the overall layout
- [ ] All breakpoints: Dark sidebar background (`#13111c`)
- [ ] All breakpoints: White/zinc-400 text colors
- [ ] All breakpoints: `border-white/10` borders
- [ ] All breakpoints: No horizontal scroll
- [ ] All breakpoints: Content is readable and not clipped

---

## 10. What NOT To Do

1. **Do NOT introduce a state management library (Zustand, Jotai, etc.) for drawer state.** A single `useState` in the layout component is sufficient. The drawer state does not need to be global.

2. **Do NOT use a headless UI library (Radix, Headless UI) for the drawer.** The implementation is simple enough with native HTML, ARIA attributes, and a manual focus trap. Adding a library for one component is not justified.

3. **Do NOT use CSS `@media` queries in a stylesheet.** Use Tailwind responsive prefixes (`md:`, `lg:`) exclusively. This project has no custom CSS beyond `globals.css` theme variables.

4. **Do NOT change the `navItems` array structure.** The existing array with `{ href, label, icon }` is reused as-is. No new fields needed.

5. **Do NOT modify any child page files.** All 5 dashboard pages (`page.tsx`, `transactions/page.tsx`, `categories/page.tsx`, `merchants/page.tsx`, `import/page.tsx`) currently use light-theme classes like `bg-white`, `text-gray-600`, etc. Converting those to dark theme is a different phase. This PR only changes the layout shell.

6. **Do NOT add `overflow-hidden` to the main layout container.** The main content area needs `overflow-auto` on the `<main>` element so individual pages can scroll. Adding `overflow-hidden` to the parent flex container would break scrolling.

7. **Do NOT use `position: sticky` for the mobile header.** Use `position: fixed`. Sticky positioning inside a flex container with `overflow` can behave unpredictably. Fixed is predictable and correct here.

8. **Do NOT animate the tablet sidebar with JavaScript.** The `group-hover` CSS approach is smoother and requires zero JS. Do not add `onMouseEnter`/`onMouseLeave` handlers for the tablet expand behavior.

9. **Do NOT use `z-index` values above 50.** The drawer panel is `z-50`, the backdrop is `z-40`, the mobile header is `z-40`, and the tablet sidebar is `z-30`. This leaves room for future modals/toasts at higher z-indices without collision.

10. **Do NOT remove the `/profile` link from the sidebar.** The current layout links to `/profile` which is outside the dashboard layout. This link must remain. Note that `/profile` has its own standalone layout (does not use the dashboard sidebar), so it is unaffected by this change.

---

### Critical Files for Implementation

- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/layout.tsx` - The sole file being rewritten; contains all sidebar, header, and drawer logic
- `/Users/chris/Projects/really-personal-finance/src/lib/utils.ts` - Provides the `cn()` class merging utility used throughout the new layout
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/page.tsx` - Reference for understanding main content structure and padding assumptions (not modified, but must verify visual compatibility)
- `/Users/chris/Projects/really-personal-finance/src/app/globals.css` - Contains theme variables and Tailwind import; verify no conflicting styles with new dark background colors
- `/Users/chris/Projects/really-personal-finance/src/app/dashboard/transactions/page.tsx` - Widest/most complex child page; use as the primary visual QA target to verify main content area sizing works correctly at all breakpoints