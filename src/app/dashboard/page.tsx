"use client";

import { useEffect, useState } from "react";
import { PlaidLinkButton } from "@/components/plaid-link";
import { IncomeSpendingChart } from "@/components/income-spending-chart";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  spending: number;
  net: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await fetch("/api/analytics/income-vs-spending");
      const json = await response.json();
      setData(json.monthly || []);
    } catch {
      console.error("Failed to fetch analytics");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalSpending = data.reduce((sum, d) => sum + d.spending, 0);
  const totalNet = totalIncome - totalSpending;
  const latestMonth = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-foreground-muted">Your financial overview</p>
        </div>
        <PlaidLinkButton onSuccess={fetchData} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "50ms" }}>
          <p className="text-sm text-foreground-muted">This Month Income</p>
          <p className="text-2xl font-bold text-success">
            {latestMonth ? formatCurrency(latestMonth.income) : "$0.00"}
          </p>
        </div>
        <div className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "125ms" }}>
          <p className="text-sm text-foreground-muted">This Month Spending</p>
          <p className="text-2xl font-bold text-danger">
            {latestMonth ? formatCurrency(latestMonth.spending) : "$0.00"}
          </p>
        </div>
        <div className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "200ms" }}>
          <p className="text-sm text-foreground-muted">This Month Net</p>
          <p
            className={`text-2xl font-bold ${
              (latestMonth?.net ?? 0) >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {latestMonth ? formatCurrency(latestMonth.net) : "$0.00"}
          </p>
        </div>
        <div className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border animate-scale-in transition-all duration-200 hover:bg-white/8 hover:border-white/15 hover:-translate-y-0.5" style={{ animationDelay: "275ms" }}>
          <p className="text-sm text-foreground-muted">All-Time Net</p>
          <p
            className={`text-2xl font-bold ${
              totalNet >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {formatCurrency(totalNet)}
          </p>
        </div>
      </div>

      {/* Income vs Spending Chart */}
      <div className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border animate-fade-in transition-all duration-200 hover:bg-white/8 hover:border-white/15" style={{ animationDelay: "350ms" }}>
        <h2 className="text-lg font-semibold mb-4">Income vs Spending</h2>
        {loading ? (
          <div className="h-96 flex items-center justify-center text-foreground-tertiary">
            Loading...
          </div>
        ) : (
          <IncomeSpendingChart data={data} />
        )}
      </div>
    </div>
  );
}
