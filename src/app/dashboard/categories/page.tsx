"use client";

import { useEffect, useState, useCallback } from "react";
import { CategoryChart } from "@/components/category-chart";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import type { CategoryData } from "@/types";

export default function CategoriesPage() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    try {
      const response = await fetch(
        `/api/analytics/spending-by-category?${params}`
      );
      const json = await response.json();
      setData(json.categories || []);
    } catch {
      console.error("Failed to fetch category data");
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSpending = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold">Spending by Category</h1>
        <p className="text-foreground-muted">
          Total: <strong>{formatCurrency(totalSpending)}</strong> across{" "}
          {data.length} categories
        </p>
      </div>

      {/* Date filters */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* Chart */}
      <div className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border animate-fade-in transition-all duration-200 hover:bg-white/8 hover:border-white/15" style={{ animationDelay: "100ms" }}>
        {loading ? (
          <div className="h-80 flex items-center justify-center text-foreground-tertiary">
            Loading...
          </div>
        ) : (
          <CategoryChart data={data} />
        )}
      </div>
    </div>
  );
}
