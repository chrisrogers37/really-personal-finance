"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: string;
  income: number;
  spending: number;
  net: number;
}

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
  referenceLine: { stroke: "rgba(0, 0, 0, 0.12)" },
  legend: { wrapperStyle: { color: "#6b7280" } },
} as const;

export function IncomeSpendingChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-foreground-tertiary">
        No data available. Connect a bank account to get started.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_THEME.grid.stroke}
        />
        <XAxis
          dataKey="month"
          tick={CHART_THEME.axis.tick}
          axisLine={CHART_THEME.axis.axisLine}
          tickLine={CHART_THEME.axis.tickLine}
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={CHART_THEME.axis.tick}
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
        <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
        <ReferenceLine
          y={0}
          stroke={CHART_THEME.referenceLine.stroke}
          strokeDasharray="3 3"
        />
        <Bar dataKey="income" fill="#059669" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" fill="#3b82f6" name="Spending" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
