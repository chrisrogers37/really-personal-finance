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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-danger">Authentication Error</h1>
        <p className="text-foreground-muted mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block py-2 px-6 bg-accent text-foreground rounded-xl hover:bg-accent-hover font-medium transition-colors"
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
        <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
          <div className="max-w-md w-full p-8 mx-4 bg-background-card-auth backdrop-blur-2xl rounded-2xl border border-border shadow-2xl relative text-center">
            <p className="text-foreground-muted">Loading...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
