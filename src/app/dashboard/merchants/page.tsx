"use client";

import { useEffect, useState, useCallback } from "react";
import { MerchantChart } from "@/components/merchant-chart";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";

interface MerchantData {
  merchant: string;
  total: number;
  count: number;
  avgAmount: number;
  isRecurring: boolean;
}

export default function MerchantsPage() {
  const [data, setData] = useState<MerchantData[]>([]);
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
        `/api/analytics/spending-by-merchant?${params}`
      );
      const json = await response.json();
      setData(json.merchants || []);
    } catch {
      console.error("Failed to fetch merchant data");
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSpending = data.reduce((sum, d) => sum + d.total, 0);
  const recurringCount = data.filter((d) => d.isRecurring).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spending by Merchant</h1>
        <p className="text-gray-600">
          Total: <strong>{formatCurrency(totalSpending)}</strong> across{" "}
          {data.length} merchants ({recurringCount} recurring)
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

      {/* Chart + Table */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        {loading ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : (
          <MerchantChart data={data} />
        )}
      </div>
    </div>
  );
}
