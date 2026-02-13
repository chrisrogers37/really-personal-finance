"use client";

import { useEffect, useState, useCallback } from "react";
import { MerchantChart } from "@/components/merchant-chart";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatCurrency } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import type { MerchantData } from "@/types";

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
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

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
