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

const CHART_THEME = {
  grid: { stroke: "rgba(0, 0, 0, 0.06)" },
  axis: {
    tick: { fill: "#6b7280" },
    axisLine: { stroke: "rgba(0, 0, 0, 0.08)" },
    tickLine: { stroke: "rgba(0, 0, 0, 0.08)" },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "#ffffff",
      border: "1px solid rgba(0, 0, 0, 0.1)",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    },
    labelStyle: { color: "#111827", fontWeight: 600 },
    itemStyle: { color: "#6b7280" },
  },
} as const;

export function MerchantChart({ data }: { data: MerchantData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-foreground-tertiary">
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
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_THEME.grid.stroke}
          />
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            tick={CHART_THEME.axis.tick}
            axisLine={CHART_THEME.axis.axisLine}
            tickLine={CHART_THEME.axis.tickLine}
          />
          <YAxis
            type="category"
            dataKey="merchant"
            width={90}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            axisLine={CHART_THEME.axis.axisLine}
            tickLine={CHART_THEME.axis.tickLine}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0))}
            contentStyle={CHART_THEME.tooltip.contentStyle}
            labelStyle={CHART_THEME.tooltip.labelStyle}
            itemStyle={CHART_THEME.tooltip.itemStyle}
            cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
          />
          <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-foreground-muted">
              Merchant
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Total
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Avg
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Txns
            </th>
            <th className="text-right py-2 font-medium text-foreground-muted">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.merchant} className="border-b border-border">
              <td className="py-2 font-medium">{item.merchant}</td>
              <td className="text-right py-2">{formatCurrency(item.total)}</td>
              <td className="text-right py-2 text-foreground-tertiary">
                {formatCurrency(item.avgAmount)}
              </td>
              <td className="text-right py-2 text-foreground-tertiary">{item.count}</td>
              <td className="text-right py-2">
                {item.isRecurring ? (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-accent/20 text-accent rounded-full">
                    Recurring
                  </span>
                ) : (
                  <span className="text-foreground-tertiary text-xs">One-time</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
