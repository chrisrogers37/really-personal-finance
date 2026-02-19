"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border text-center">
        <div className="text-4xl mb-4">&#9888;</div>
        <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
        <p className="text-foreground-muted mb-6">{message}</p>
        <Link
          href="/auth/signin"
          className="inline-block py-2 px-6 bg-accent text-foreground rounded-lg hover:bg-accent-hover font-medium"
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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md w-full p-8 bg-background-elevated rounded-xl border border-border text-center">
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
