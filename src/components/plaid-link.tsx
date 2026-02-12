"use client";

import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLinkToken() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await response.json();
      if (data.linkToken) {
        setLinkToken(data.linkToken);
      } else {
        setError("Failed to create link token");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken }),
        });
        if (response.ok) {
          onSuccess?.();
        } else {
          setError("Failed to connect account");
        }
      } catch {
        setError("Network error during account connection");
      }
      setLinkToken(null);
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(null),
  });

  // Auto-open when link token is ready
  if (linkToken && ready) {
    open();
  }

  return (
    <div>
      <button
        onClick={createLinkToken}
        disabled={loading}
        className="py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center gap-2"
      >
        {loading ? (
          "Connecting..."
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Connect Bank Account
          </>
        )}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
