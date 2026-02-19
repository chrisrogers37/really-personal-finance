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
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative">
          <div className="text-center">
            <Mail className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-foreground-muted">
              We sent a sign-in link to <strong className="text-foreground">{email}</strong>. Click the link
              to sign in.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Really <span className="text-indigo-400">Personal</span> Finance</h1>
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
              className="w-full px-4 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-accent text-foreground rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
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
