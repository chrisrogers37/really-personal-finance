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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Really Personal Finance
          </Link>
          <Link
            href="/auth/signin"
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border-emphasis hover:bg-background-card transition-all duration-150 active:scale-95"
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

        <div className="relative text-center max-w-3xl mx-auto animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Know where your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              money goes.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-foreground-muted max-w-xl mx-auto leading-relaxed">
            Connect your bank accounts, track spending patterns, and get daily
            insights delivered to your Telegram.
          </p>
          <div className="mt-10">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-foreground text-lg font-medium rounded-xl transition-all duration-150 active:scale-95"
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
          <div className="bg-background-card backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "100ms" }}>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <Landmark className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Banks</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Securely link accounts via Plaid. Transactions sync automatically
              — with up to two years of history.
            </p>
          </div>

          <div className="bg-background-card backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "175ms" }}>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">See the Big Picture</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Spending by category, by merchant, income vs. expenses — all in
              one dashboard. Spot trends at a glance.
            </p>
          </div>

          <div className="bg-background-card backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "250ms" }}>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
              <Bell className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Telegram Alerts</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Daily spending summaries and anomaly alerts pushed to Telegram. No
              need to check the app — it comes to you.
            </p>
          </div>
        </div>
      </section>

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

      {/* Trust Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="bg-background-card backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Encrypted at Rest</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Plaid tokens and credentials are encrypted in the database.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Your Data, Your Control</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  No ads, no selling data. Built for personal use only.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Code className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Open Source</p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Audit the code or self-host. Full transparency.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
    </div>
  );
}
