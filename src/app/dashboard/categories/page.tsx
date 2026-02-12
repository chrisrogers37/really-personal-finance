"use client";

import { useEffect, useState, useCallback } from "react";
import { CategoryChart } from "@/components/category-chart";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";

interface CategoryData {
  category: string;
  total: number;
  count: number;
}

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spending by Category</h1>
        <p className="text-gray-600">
          Total: <strong>{formatCurrency(totalSpending)}</strong> across{" "}
          {data.length} categories
        </p>
      </div>

      {/* Date filters */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : (
          <CategoryChart data={data} />
        )}
      </div>
    </div>
  );
}
