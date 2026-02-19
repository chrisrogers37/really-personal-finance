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

    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements =
          drawerRef.current.querySelectorAll<HTMLElement>(
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
              ? "bg-accent/10 text-accent"
              : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
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
          title={
            !showLabels ? (session?.user?.email || "Profile") : undefined
          }
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-foreground transition-colors",
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
            "flex items-center gap-3 rounded-lg text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-danger w-full transition-colors",
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
    <div className="min-h-screen bg-background flex">
      {/* ================= MOBILE HEADER (<md) ================= */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-14 px-4 bg-background border-b border-border md:hidden">
        <Link href="/dashboard" className="text-sm font-bold text-foreground">
          Really Personal Finance
        </Link>
        <button
          ref={menuButtonRef}
          onClick={openDrawer}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          className="text-foreground-muted hover:text-foreground p-1"
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
          "fixed top-0 left-0 bottom-0 w-64 z-50 bg-background-elevated border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out md:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-foreground"
            onClick={closeDrawer}
          >
            Really Personal Finance
          </Link>
          <button
            ref={closeButtonRef}
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="text-foreground-muted hover:text-foreground p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 p-4 space-y-1">{renderNavItems(true)}</nav>

        {/* Drawer footer */}
        <div className="p-4 border-t border-border space-y-1">
          {renderFooter(true)}
        </div>
      </div>

      {/* ================= TABLET SIDEBAR (md to lg) ================= */}
      <aside
        className={cn(
          "hidden md:flex lg:hidden flex-col shrink-0",
          "w-16 hover:w-64 group/sidebar",
          "bg-background-elevated border-r border-border",
          "transition-all duration-200 ease-in-out",
          "fixed top-0 left-0 bottom-0 z-30"
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border h-14 flex items-center overflow-hidden">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-foreground whitespace-nowrap"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0 group-hover/sidebar:hidden" />
            <span className="hidden group-hover/sidebar:inline">
              Really Personal Finance
            </span>
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
                    ? "bg-accent/10 text-accent"
                    : "text-foreground-muted hover:bg-white/5 hover:text-foreground"
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
        <div className="p-2 group-hover/sidebar:p-4 border-t border-border space-y-1 overflow-hidden">
          <Link
            href="/profile"
            title={session?.user?.email || "Profile"}
            className="flex items-center gap-3 rounded-lg text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-foreground transition-colors py-2 justify-center group-hover/sidebar:justify-start px-0 group-hover/sidebar:px-3"
          >
            <User className="w-5 h-5 shrink-0" />
            <span className="hidden group-hover/sidebar:inline truncate whitespace-nowrap">
              {session?.user?.email || "Profile"}
            </span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="flex items-center gap-3 rounded-lg text-sm font-medium text-foreground-muted hover:bg-white/5 hover:text-danger w-full transition-colors py-2 justify-center group-hover/sidebar:justify-start px-0 group-hover/sidebar:px-3"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden group-hover/sidebar:inline whitespace-nowrap">
              Sign out
            </span>
          </button>
        </div>
      </aside>

      {/* ================= DESKTOP SIDEBAR (lg+) ================= */}
      <aside className="hidden lg:flex flex-col shrink-0 w-64 bg-background-elevated border-r border-border">
        {/* Sidebar header */}
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="text-lg font-bold text-foreground">
            Really Personal Finance
          </Link>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 p-4 space-y-1">{renderNavItems(true)}</nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-border space-y-1">
          {renderFooter(true)}
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <main
        className={cn(
          "flex-1 overflow-auto",
          "pt-18 px-4 pb-4",
          "md:pt-6 md:pb-6 md:ml-16 md:px-6",
          "lg:ml-0 lg:p-8"
        )}
      >
        {children}
      </main>
    </div>
  );
}
