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

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-foreground-tertiary">
          Really Personal Finance — Open Source
        </div>
      </footer>
    </div>
  );
}
