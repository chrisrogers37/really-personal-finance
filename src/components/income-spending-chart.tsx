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
  grid: { stroke: "rgba(255, 255, 255, 0.06)" },
  axis: {
    tick: { fill: "#a1a1aa" },
    axisLine: { stroke: "rgba(255, 255, 255, 0.08)" },
    tickLine: { stroke: "rgba(255, 255, 255, 0.08)" },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "rgba(19, 17, 28, 0.9)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      backdropFilter: "blur(12px)",
    },
    labelStyle: { color: "#ffffff", fontWeight: 600 },
    itemStyle: { color: "#a1a1aa" },
  },
  referenceLine: { stroke: "rgba(255, 255, 255, 0.15)" },
  legend: { wrapperStyle: { color: "#a1a1aa" } },
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
          cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
        />
        <Legend wrapperStyle={CHART_THEME.legend.wrapperStyle} />
        <ReferenceLine
          y={0}
          stroke={CHART_THEME.referenceLine.stroke}
          strokeDasharray="3 3"
        />
        <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" fill="#ef4444" name="Spending" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
