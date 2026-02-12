import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Really Personal Finance</h1>
          <Link
            href="/auth/signin"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">
            Know where your money goes.
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Connect your bank accounts, see your transactions, and understand
            your spending patterns. Get daily insights via Telegram.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium"
          >
            Get Started
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="text-2xl mb-3">&#127974;</div>
            <h3 className="text-lg font-semibold mb-2">
              Connect Your Banks
            </h3>
            <p className="text-gray-600 text-sm">
              Securely link your bank accounts via Plaid. We pull your
              transactions automatically — up to 5 years of history.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="text-2xl mb-3">&#128200;</div>
            <h3 className="text-lg font-semibold mb-2">See the Big Picture</h3>
            <p className="text-gray-600 text-sm">
              Spending by category, by merchant, income vs. expenses — all in
              one dashboard. Spot recurring charges and track trends.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="text-2xl mb-3">&#128276;</div>
            <h3 className="text-lg font-semibold mb-2">Telegram Alerts</h3>
            <p className="text-gray-600 text-sm">
              Get daily spending summaries and anomaly alerts pushed to your
              Telegram. No need to check the app — it comes to you.
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-20 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <h3 className="font-semibold text-amber-900 mb-2">
            Privacy Notice
          </h3>
          <p className="text-amber-800 text-sm max-w-xl mx-auto">
            By signing up, your bank transactions will be stored in our database
            to provide spending insights. Your Plaid access tokens are encrypted
            at rest. This is an open-source project — you can review the code
            and self-host if you prefer.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          Really Personal Finance — Open Source
        </div>
      </footer>
    </div>
  );
}
