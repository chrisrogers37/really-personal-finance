"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    await signIn("email", { email, redirect: false });
    setSent(true);
    setEmailLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative animate-scale-in">
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
      <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Really <span className="text-indigo-400">Personal</span> Finance</h1>
          <p className="text-foreground-muted mt-2">
            Sign in or create an account to get started
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setGoogleLoading(true); signIn("google", { callbackUrl: "/dashboard" }); }}
          disabled={googleLoading || emailLoading}
          className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-border rounded-xl bg-background hover:bg-white/5 text-foreground font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-foreground-tertiary">or</span>
          <div className="flex-1 h-px bg-border" />
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
              className="w-full px-4 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={emailLoading || googleLoading}
            className="w-full py-2 px-4 bg-accent text-foreground rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-150 active:scale-95"
          >
            {emailLoading ? "Sending link..." : "Continue with email"}
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
