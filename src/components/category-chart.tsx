"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { CategoryData } from "@/types";

const COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#a78bfa", // violet-400 (avoids indigo accent collision)
  "#a3e635", // lime-400 (brighter on dark)
  "#06b6d4", // cyan-500
  "#e11d48", // rose-600
];

const CHART_THEME = {
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
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderPieLabel(props: any) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const name = String(props.name ?? "");
  const percent = Number(props.percent ?? 0);

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#a1a1aa"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-foreground-tertiary">
        No spending data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="lg:w-1/2">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={130}
              innerRadius={60}
              dataKey="total"
              nameKey="category"
              label={renderPieLabel}
              labelLine={{ stroke: "#71717a" }}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value ?? 0))}
              contentStyle={CHART_THEME.tooltip.contentStyle}
              labelStyle={CHART_THEME.tooltip.labelStyle}
              itemStyle={CHART_THEME.tooltip.itemStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="lg:w-1/2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium text-foreground-muted">
                Category
              </th>
              <th className="text-right py-2 font-medium text-foreground-muted">
                Amount
              </th>
              <th className="text-right py-2 font-medium text-foreground-muted">
                Txns
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.category} className="border-b border-border">
                <td className="py-2 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  {item.category}
                </td>
                <td className="text-right py-2 font-medium">
                  {formatCurrency(item.total)}
                </td>
                <td className="text-right py-2 text-foreground-tertiary">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
