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

export function IncomeSpendingChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No data available. Connect a bank account to get started.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value ?? 0))}
          labelStyle={{ fontWeight: "bold" }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#000" />
        <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spending" fill="#ef4444" name="Spending" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
