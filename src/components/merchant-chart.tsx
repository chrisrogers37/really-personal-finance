"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MerchantData } from "@/types";

export function MerchantChart({ data }: { data: MerchantData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No spending data available.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data.slice(0, 10)}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v.toLocaleString()}`}
          />
          <YAxis type="category" dataKey="merchant" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
          <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 font-medium text-gray-600">
              Merchant
            </th>
            <th className="text-right py-2 font-medium text-gray-600">
              Total
            </th>
            <th className="text-right py-2 font-medium text-gray-600">
              Avg
            </th>
            <th className="text-right py-2 font-medium text-gray-600">
              Txns
            </th>
            <th className="text-right py-2 font-medium text-gray-600">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.merchant} className="border-b">
              <td className="py-2 font-medium">{item.merchant}</td>
              <td className="text-right py-2">{formatCurrency(item.total)}</td>
              <td className="text-right py-2 text-gray-500">
                {formatCurrency(item.avgAmount)}
              </td>
              <td className="text-right py-2 text-gray-500">{item.count}</td>
              <td className="text-right py-2">
                {item.isRecurring ? (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Recurring
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">One-time</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
