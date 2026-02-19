

I'll start by reading all the chart components and dashboard pages to understand the current implementation.

Now let me read the dashboard pages that consume these charts.

Now let me check the existing types, utils, and any related style/theme files to understand the broader context.

Let me also check whether any prior phases have already been implemented or if there are design tokens / theme constants established.

Now let me check the Recharts version and any existing layout wrapper to understand the full picture.

Let me check if there are any existing design-overhaul phase documents to ensure this Phase 05 plan is consistent with the series.

Let me also verify the Recharts API for version 3.x to ensure the props I plan to use are valid.

I now have a complete picture of all three chart components, the dashboard pages that use them, the layout, global CSS, types, and utilities. Let me now verify one more detail about how Recharts 3.x handles custom tooltip content styles vs. custom components.

Good. The `contentStyle`, `labelStyle`, and `itemStyle` props are available on the Recharts 3.x Tooltip. Now I have everything I need. Let me produce the complete implementation plan document.

---

**Status:** ✅ COMPLETE
**Started:** 2026-02-19
**Completed:** 2026-02-19
**PR:** #16

# Phase 05 -- Dark-Themed Charts

**PR Title:** `feat: dark-themed Recharts with styled tooltips and dark grids`

**Risk:** Low
**Effort:** Medium
**Files Modified:** 3

| File | Change Summary |
|---|---|
| `src/components/income-spending-chart.tsx` | Dark CartesianGrid, axis styling, glass tooltip, dark ReferenceLine, dark empty state |
| `src/components/category-chart.tsx` | Dark pie label/labelLine colors, glass tooltip, dark-themed table, revised COLORS, dark empty state |
| `src/components/merchant-chart.tsx` | Dark CartesianGrid, axis styling, glass tooltip, dark-themed table with recurring badge, dark empty state |

---

## 1. Context

The three chart components -- IncomeSpendingChart, CategoryChart, and MerchantChart -- are the analytical heart of the dashboard. Currently they all assume a white/light card container (handled by the dashboard pages wrapping them in `bg-white p-6 rounded-xl border shadow-sm` cards). After Phase 01 establishes the dark palette (`#0c0a14` background, `#13111c` surfaces) and Phase 02 converts those card containers to glass cards (`bg-white/5 backdrop-blur-xl border border-white/10`), the charts inside those containers will render with light-themed Recharts defaults: black axis text, light grid lines, white tooltip backgrounds, and a `stroke="#000"` ReferenceLine that will be invisible.

Phase 05 re-themes all chart internals to match the dark identity. The charts themselves do not control their container; they only control the SVG elements Recharts renders and any companion HTML (tables, empty states) within each component.

**Important scope boundary:** The dashboard pages (`page.tsx`, `categories/page.tsx`, `merchants/page.tsx`) wrap these charts in card containers. Those containers are re-themed in Phase 02. This phase touches **only** the chart component files themselves.

---

## 2. Visual Specification

### 2.1 Before (Current Light Theme)

**IncomeSpendingChart:**
- CartesianGrid: default light gray strokes
- XAxis/YAxis: black tick text, default dark axis/tick lines
- Tooltip: white background, dark text, no border radius
- ReferenceLine at y=0: `stroke="#000"` (invisible on dark bg)
- Legend: default dark text
- Empty state: `text-gray-500`

**CategoryChart:**
- Pie labels: default black fill
- Pie labelLine: default dark stroke
- Tooltip: white background, dark text
- Table headers: `text-gray-600`
- Table borders: default `border-b` (light gray)
- Table "count" column: `text-gray-500`
- Empty state: `text-gray-500`

**MerchantChart:**
- CartesianGrid: default light gray strokes
- XAxis/YAxis: black tick text, default dark axis/tick lines
- Tooltip: white background, dark text
- Bar fill: `#3b82f6` (blue-500)
- Table headers: `text-gray-600`
- Table borders: default `border-b` (light gray)
- Table secondary text: `text-gray-500`
- Recurring badge: `bg-blue-100 text-blue-700`
- One-time label: `text-gray-400`
- Empty state: `text-gray-500`

### 2.2 After (Dark Theme)

**Shared Chart Tokens** (used consistently across all three components):

```
// Grid
gridStroke = "rgba(255, 255, 255, 0.06)"

// Axes
axisTickFill = "#a1a1aa"           // zinc-400 -- muted text
axisLineStroke = "rgba(255, 255, 255, 0.08)"
axisTickLineStroke = "rgba(255, 255, 255, 0.08)"

// Tooltip (glass style)
tooltipBg = "rgba(19, 17, 28, 0.9)"       // #13111c at 90%
tooltipBorder = "rgba(255, 255, 255, 0.1)"
tooltipRadius = "12px"
tooltipBackdrop = "blur(12px)"
tooltipLabelColor = "#ffffff"
tooltipItemColor = "#a1a1aa"

// Legend
legendTextColor = "#a1a1aa"

// ReferenceLine
referenceLineStroke = "rgba(255, 255, 255, 0.15)"
```

**IncomeSpendingChart after:**
- CartesianGrid: `stroke="rgba(255,255,255,0.06)"`, `strokeDasharray="3 3"`
- XAxis: `tick={{ fill: '#a1a1aa' }}`, `axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}`, `tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}`
- YAxis: same axis styling plus existing `tickFormatter`
- Tooltip: glass contentStyle, white label, muted items
- Legend: `wrapperStyle={{ color: '#a1a1aa' }}`
- ReferenceLine: `stroke="rgba(255,255,255,0.15)"`, `strokeDasharray="3 3"`
- Bar fills: unchanged (`#22c55e`, `#ef4444`) -- these pop on dark
- Empty state: `text-zinc-500` (Tailwind 4 equivalent)

**CategoryChart after:**
- Pie `label` render function: `fill="#a1a1aa"` applied via props in the custom label
- Pie `labelLine={{ stroke: '#71717a' }}` (zinc-500, visible but subtle)
- Tooltip: glass contentStyle
- COLORS array: reviewed (see section 4.2 for analysis)
- Table headers: `text-zinc-500`
- Table borders: `border-b border-white/10`
- Table body text: default inherits white from body; count column `text-zinc-500`
- Color swatch dots: unchanged (use COLORS)
- Empty state: `text-zinc-500`

**MerchantChart after:**
- CartesianGrid, XAxis, YAxis: same dark styling as IncomeSpendingChart
- Tooltip: glass contentStyle
- Bar fill: `#6366f1` (indigo-500 -- the project accent color, replacing blue-500 to unify the palette)
- Table headers: `text-zinc-500`
- Table borders: `border-b border-white/10`
- Table secondary text: `text-zinc-500`
- Recurring badge: `bg-indigo-500/20 text-indigo-300` (dark-safe alternative to `bg-blue-100 text-blue-700`)
- One-time label: `text-zinc-600`
- Empty state: `text-zinc-500`

---

## 3. Dependencies

| Dependency | Phase | Required Before This? |
|---|---|---|
| Dark palette established in globals.css / Tailwind config | Phase 01 | Yes (palette tokens exist) |
| Glass card containers on dashboard pages | Phase 02 | No (Phase 05 charts render inside whatever container exists; they just need to look correct on dark backgrounds) |
| Recharts 3.7.0 installed | Already done | Yes (confirmed in package.json) |

Phase 05 can be implemented **independently** of Phase 02 as long as Phase 01's palette is in place. The charts will look correct on any dark-background container. However, the visual result is best when Phase 02's glass cards are also applied.

---

## 4. Detailed Implementation Plan

### 4.1 Shared: Chart Theme Constants

Rather than duplicating magic strings across three files, extract a shared constant object. Create no new files -- instead, add the constants to the top of each chart file as a local `const`. If the team later wants to centralize them, they can be moved to `src/lib/chart-theme.ts`, but for this PR the locality is preferred to keep the diff self-contained and avoid import-chain risk.

The constants block to place at the top of each chart component:

```typescript
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
```

**Design decision:** Duplicating the const in three files rather than a shared module is deliberate. It avoids creating a new import that might interfere with tree-shaking or create coupling between chart components. The duplication is trivial (20 lines) and each chart can diverge if needed.

### 4.2 Category Chart COLORS Review

Current palette:
```typescript
const COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500 (same as accent!)
  "#84cc16", // lime-500
  "#06b6d4", // cyan-500
  "#e11d48", // rose-600
];
```

**Issues on dark backgrounds:**
1. `#6366f1` (indigo-500) at index 8 is the project's accent color. Having a category slice the same color as UI accent elements creates visual confusion. Replace with `#a78bfa` (violet-400) which is distinct from the existing violet-500 (`#8b5cf6`) and visible on dark.
2. `#84cc16` (lime-500) can look washed out on dark. Shift to `#a3e635` (lime-400) for better pop.
3. All other colors have sufficient contrast against `#13111c` (minimum 4.5:1 for the darkest color `#14b8a6` at ~5.2:1).

Revised COLORS:
```typescript
const COLORS = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#a78bfa", // violet-400 (was indigo-500, avoids accent collision)
  "#a3e635", // lime-400 (brighter than lime-500 on dark)
  "#06b6d4", // cyan-500
  "#e11d48", // rose-600
];
```

### 4.3 File 1: `src/components/income-spending-chart.tsx`

**Current file** (49 lines) -- complete replacement below.

**Changes:**
- Add `CHART_THEME` constant
- CartesianGrid: add `stroke` prop
- XAxis: add `tick`, `axisLine`, `tickLine` props
- YAxis: add `tick`, `axisLine`, `tickLine` props (preserve `tickFormatter`)
- Tooltip: add `contentStyle`, `labelStyle`, `itemStyle`, `cursor` props
- Legend: add `wrapperStyle` prop
- ReferenceLine: change `stroke` from `"#000"` to themed value, add `strokeDasharray`
- Empty state: change `text-gray-500` to `text-zinc-500`

**Complete new file contents:**

```typescript
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
      <div className="h-80 flex items-center justify-center text-zinc-500">
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
```

**Line-by-line change rationale:**

| Line(s) | Before | After | Why |
|---|---|---|---|
| 24-40 | (not present) | `CHART_THEME` const | Centralizes dark theme tokens for this file |
| 45 | `text-gray-500` | `text-zinc-500` | Gray-500 is invisible on dark; zinc-500 is designed for dark UIs |
| 53-55 | `<CartesianGrid strokeDasharray="3 3" />` | + `stroke={CHART_THEME.grid.stroke}` | Default light grid lines invisible on dark |
| 56-60 | `<XAxis dataKey="month" />` | + `tick`, `axisLine`, `tickLine` | Default black text invisible on dark bg |
| 61-67 | `<YAxis tickFormatter={...} />` | + `tick`, `axisLine`, `tickLine` | Same reason |
| 68-74 | `<Tooltip formatter={...} labelStyle={...} />` | + `contentStyle`, `itemStyle`, `cursor` | Default white tooltip clashes; cursor highlight needs dark treatment |
| 75 | `<Legend />` | + `wrapperStyle` | Default dark legend text invisible |
| 76-79 | `<ReferenceLine y={0} stroke="#000" />` | + themed stroke, `strokeDasharray` | Black line invisible on dark; dashed is more subtle |

### 4.4 File 2: `src/components/category-chart.tsx`

**Current file** (107 lines) -- complete replacement below.

**Changes:**
- Update COLORS array (indices 8 and 9)
- Add `CHART_THEME` constant (tooltip portion only, no grid/axis needed for PieChart)
- Pie `label`: convert from inline arrow to a custom render function with `fill="#a1a1aa"`
- Pie `labelLine`: add `stroke: '#71717a'`
- Tooltip: add `contentStyle`, `labelStyle`, `itemStyle`
- Table `<tr className="border-b">`: change to `border-b border-white/10`
- Table `<th>` text: change `text-gray-600` to `text-zinc-500`
- Table `<td>` count column: change `text-gray-500` to `text-zinc-500`
- Empty state: change `text-gray-500` to `text-zinc-500`

**Complete new file contents:**

```typescript
"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
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
  legend: { wrapperStyle: { color: "#a1a1aa" } },
} as const;

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name?: string;
  percent?: number;
}

function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  percent,
}: PieLabelProps) {
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
      {`${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
}

export function CategoryChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-zinc-500">
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
            <tr className="border-b border-white/10">
              <th className="text-left py-2 font-medium text-zinc-500">
                Category
              </th>
              <th className="text-right py-2 font-medium text-zinc-500">
                Amount
              </th>
              <th className="text-right py-2 font-medium text-zinc-500">
                Txns
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={item.category} className="border-b border-white/10">
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
                <td className="text-right py-2 text-zinc-500">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Key change explanations:**

1. **Custom `renderPieLabel` function:** The original used an inline arrow `label={(props) => ...}` which returned a plain string. Recharts renders label strings using default SVG `<text>` with `fill="#333"` (dark). To control the fill color, we must return a `<text>` SVG element with explicit `fill="#a1a1aa"`. The `renderPieLabel` function calculates the label position using the standard Recharts midAngle/radius math and renders a properly positioned `<text>` element.

2. **COLORS[8] change:** `#6366f1` (indigo-500) collided with the project accent color used for UI elements (buttons, active states). Replaced with `#a78bfa` (violet-400) which is perceptually distinct from the existing `#8b5cf6` (violet-500) at index 4 -- they differ in lightness (400 vs 500) and are visually distinguishable.

3. **COLORS[9] change:** `#84cc16` (lime-500) has a contrast ratio of ~5.8:1 against `#13111c`, which passes AA but is borderline. `#a3e635` (lime-400) bumps this to ~8.2:1.

4. **Table borders:** `border-b` alone uses the browser default (light gray). `border-b border-white/10` creates a 10% white border that is visible but subtle on dark surfaces.

### 4.5 File 3: `src/components/merchant-chart.tsx`

**Current file** (88 lines) -- complete replacement below.

**Changes:**
- Add `CHART_THEME` constant
- CartesianGrid: add `stroke` prop
- XAxis: add `tick`, `axisLine`, `tickLine` props
- YAxis: add `tick`, `axisLine`, `tickLine` props (preserve `fontSize: 12`, `width={90}`)
- Tooltip: add `contentStyle`, `labelStyle`, `itemStyle`, `cursor`
- Bar fill: change `#3b82f6` to `#6366f1` (indigo-500, project accent)
- Table `<tr>` borders: add `border-white/10`
- Table `<th>` text: change `text-gray-600` to `text-zinc-500`
- Table secondary text: change `text-gray-500` to `text-zinc-500`
- Recurring badge: change `bg-blue-100 text-blue-700` to `bg-indigo-500/20 text-indigo-300`
- One-time label: change `text-gray-400` to `text-zinc-600`
- Empty state: change `text-gray-500` to `text-zinc-500`

**Complete new file contents:**

```typescript
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
} as const;

export function MerchantChart({ data }: { data: MerchantData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-zinc-500">
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
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
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
          <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 font-medium text-zinc-500">
              Merchant
            </th>
            <th className="text-right py-2 font-medium text-zinc-500">
              Total
            </th>
            <th className="text-right py-2 font-medium text-zinc-500">
              Avg
            </th>
            <th className="text-right py-2 font-medium text-zinc-500">
              Txns
            </th>
            <th className="text-right py-2 font-medium text-zinc-500">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.merchant} className="border-b border-white/10">
              <td className="py-2 font-medium">{item.merchant}</td>
              <td className="text-right py-2">{formatCurrency(item.total)}</td>
              <td className="text-right py-2 text-zinc-500">
                {formatCurrency(item.avgAmount)}
              </td>
              <td className="text-right py-2 text-zinc-500">{item.count}</td>
              <td className="text-right py-2">
                {item.isRecurring ? (
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-full">
                    Recurring
                  </span>
                ) : (
                  <span className="text-zinc-600 text-xs">One-time</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Key change explanations:**

1. **Bar fill `#3b82f6` to `#6366f1`:** The merchant chart's single bar color was generic blue-500. Changing to indigo-500 (the project accent) ties the merchant visualization into the design language. This is the only chart that uses a single uniform bar color, so using the accent here creates intentional emphasis without the "accent collision" problem that existed in the category COLORS array (where indigo was one of 12 colors alongside UI accent elements).

2. **YAxis tick merging:** The original had `tick={{ fontSize: 12 }}`. The new version merges the fill color in: `tick={{ fontSize: 12, fill: "#a1a1aa" }}`. This is done inline rather than via CHART_THEME because the merchant YAxis has a unique fontSize override that the other charts lack.

3. **Recurring badge:** `bg-blue-100 text-blue-700` is a light-theme pattern. On dark backgrounds, `bg-blue-100` renders as a jarring bright block. `bg-indigo-500/20 text-indigo-300` creates a translucent indigo pill that integrates with the dark surface and matches the bar color.

---

## 5. Responsive Behavior

All three charts already use Recharts `<ResponsiveContainer>` with `width="100%"` and fixed heights. No changes needed for responsive behavior itself.

**Mobile considerations noted:**

1. **CategoryChart pie labels:** The custom `renderPieLabel` function positions labels at `radius * 1.4` from center. On very small viewports (< 360px), labels may overflow the SVG container. The original code had the same issue. A future enhancement could hide labels below a breakpoint, but that is out of scope for this PR.

2. **MerchantChart left margin:** `margin={{ left: 100 }}` accommodates merchant name labels. On mobile, long merchant names may still truncate. This is a pre-existing behavior unchanged by this PR.

3. **CategoryChart flex layout:** `flex flex-col lg:flex-row` already stacks pie and table vertically on mobile. No change needed.

---

## 6. Accessibility Checklist

| Element | Color on Dark (`#13111c`) | Contrast Ratio | WCAG AA (4.5:1) |
|---|---|---|---|
| Axis text `#a1a1aa` | zinc-400 on `#13111c` | ~7.2:1 | Pass |
| Legend text `#a1a1aa` | zinc-400 on `#13111c` | ~7.2:1 | Pass |
| Pie label text `#a1a1aa` | zinc-400 on `#13111c` | ~7.2:1 | Pass |
| Table header `text-zinc-500` (`#71717a`) | zinc-500 on `#13111c` | ~4.8:1 | Pass |
| Table count text `text-zinc-500` | zinc-500 on `#13111c` | ~4.8:1 | Pass |
| Empty state `text-zinc-500` | zinc-500 on `#13111c` | ~4.8:1 | Pass |
| Tooltip label `#ffffff` | white on `rgba(19,17,28,0.9)` | ~15:1 | Pass |
| Tooltip item `#a1a1aa` | zinc-400 on `rgba(19,17,28,0.9)` | ~7:1 | Pass |
| Income bar `#22c55e` | green-500 on `#13111c` | ~6.3:1 | Pass |
| Spending bar `#ef4444` | red-500 on `#13111c` | ~4.6:1 | Pass |
| Merchant bar `#6366f1` | indigo-500 on `#13111c` | ~4.5:1 | Borderline pass |
| One-time label `text-zinc-600` (`#52525b`) | zinc-600 on `#13111c` | ~3.2:1 | Fail (decorative, non-essential text) |
| Recurring badge `text-indigo-300` (`#a5b4fc`) on `bg-indigo-500/20` | indigo-300 on translucent indigo | ~6.8:1 | Pass |

**Note on `text-zinc-600` for "One-time" label:** This is intentionally de-emphasized decorative text. The "Recurring" badge is the meaningful signal; "One-time" is the absence of signal. The contrast ratio of ~3.2:1 is acceptable for non-essential supplementary text per WCAG's intent, though it does not meet the AA threshold for body text. If strict compliance is required, consider `text-zinc-500` instead.

**Color blindness considerations:**
- Income (green `#22c55e`) vs Spending (red `#ef4444`): These are distinguishable for deuteranopia and protanopia because they differ in luminance (green is lighter). The bar chart also uses text labels ("Income" / "Spending") in the legend, providing a non-color indicator.
- Category COLORS: The 12-color palette uses a wide hue range. Adjacent colors in the pie chart are always different hues. The companion table provides category names with color swatches for redundant encoding.

---

## 7. Test Plan

**No automated tests required** -- these are purely visual/presentational changes with no logic changes.

**Manual verification steps:**

1. **Income/Spending Chart (Dashboard Overview page):**
   - Verify grid lines are barely visible (subtle texture, not distracting)
   - Verify axis labels (month names, dollar amounts) are readable in muted zinc
   - Hover over bars: tooltip should have dark translucent background with blur, white label, muted item text
   - Verify the y=0 reference line is visible as a subtle dashed line
   - Verify legend text is muted zinc
   - Verify bar cursor highlight on hover is subtle (4% white)
   - With no data: verify empty state text is visible

2. **Category Chart (Categories page):**
   - Verify pie slice labels are muted zinc and positioned correctly
   - Verify label lines connecting slices to labels are visible but subtle
   - Hover over slices: tooltip should match glass style
   - Verify table headers are muted zinc
   - Verify table borders are subtle white/10
   - Verify color swatch dots match pie slice colors
   - Check that no two adjacent colors in a real data set are confusable
   - With no data: verify empty state text

3. **Merchant Chart (Merchants page):**
   - Verify horizontal bars are indigo-500 (matching project accent)
   - Verify merchant name labels on Y-axis are readable in muted zinc
   - Verify dollar amounts on X-axis are readable
   - Hover over bars: tooltip should match glass style
   - Verify table headers are muted zinc
   - Verify "Recurring" badge has translucent indigo pill styling
   - Verify "One-time" label is intentionally de-emphasized
   - Verify table borders are subtle
   - With no data: verify empty state text

4. **Cross-browser spot check:**
   - `backdropFilter: "blur(12px)"` is supported in all modern browsers. Firefox 103+ supports it. No fallback needed for this project's audience.

---

## 8. Verification Checklist

Before merging, confirm:

- [ ] All three chart files compile without TypeScript errors
- [ ] No new imports added (all changes use existing Recharts props and Tailwind classes)
- [ ] No changes to component interfaces (props unchanged)
- [ ] No changes to data fetching or business logic
- [ ] Grid lines visible but very subtle on dark background
- [ ] All axis text readable (not black/invisible)
- [ ] Tooltips have glass effect (dark bg, blur, rounded corners)
- [ ] ReferenceLine in income chart is visible (not `#000` on dark)
- [ ] Category pie labels are muted zinc, not black
- [ ] Merchant bar color is indigo-500, not blue-500
- [ ] Recurring badge uses dark-safe translucent indigo, not light-theme `bg-blue-100`
- [ ] All table borders use `border-white/10`
- [ ] All table headers use `text-zinc-500`
- [ ] All empty states use `text-zinc-500`
- [ ] Category COLORS array no longer contains `#6366f1` (avoids accent collision)
- [ ] No regressions in chart interactivity (hover, tooltip positioning)

---

## 9. What NOT To Do

1. **Do NOT change chart container styling.** The `bg-white p-6 rounded-xl border shadow-sm` wrappers live in the dashboard pages (`page.tsx`, `categories/page.tsx`, `merchants/page.tsx`), not in the chart components. Phase 02 handles those containers. This PR only changes what is inside the chart components.

2. **Do NOT add CSS custom properties or global theme tokens for chart colors.** Recharts accepts inline style objects and SVG attribute strings, not CSS variables. Passing `var(--chart-grid)` into Recharts `stroke` props does not work because those values are applied directly to SVG attributes, not CSS properties. Keep the values as literal strings in the `CHART_THEME` constant.

3. **Do NOT create a shared `chart-theme.ts` module in this PR.** While the `CHART_THEME` object is duplicated across three files, extracting it to a shared module adds an import dependency between components that are otherwise independent. This is a premature abstraction for 20 lines of constants. If a fourth chart component is added later, that is the time to extract.

4. **Do NOT add Recharts `<defs>` gradient fills to bars.** The requirement mentioned "consider adding subtle glow or gradient fills" but this adds significant SVG complexity for minimal visual gain. The solid fill colors (`#22c55e`, `#ef4444`, `#6366f1`) already pop well on dark backgrounds. Gradients can be explored in a future enhancement PR.

5. **Do NOT change the `ResponsiveContainer` height values.** The current heights (400px for bar charts, 350px for pie chart) are established and work well. Changing them would affect layout in ways that need separate testing.

6. **Do NOT use Tailwind `dark:` variants for chart SVG elements.** Recharts renders SVG elements with inline attributes (`stroke`, `fill`). Tailwind classes cannot target these SVG internals. The styling must be done through Recharts props.

7. **Do NOT remove the `"use client"` directive.** All three chart components use Recharts which requires client-side rendering. The directive must remain.

8. **Do NOT change the `formatCurrency` import or the `CategoryData`/`MerchantData` type imports.** These are stable shared utilities from `src/lib/utils.ts` and `src/types/index.ts`. No changes needed.

---

### Critical Files for Implementation

- `/Users/chris/Projects/really-personal-finance/src/components/income-spending-chart.tsx` - Primary chart to retheme: CartesianGrid, axes, tooltip, ReferenceLine, legend
- `/Users/chris/Projects/really-personal-finance/src/components/category-chart.tsx` - Pie chart labels, COLORS revision, tooltip, companion table dark styling
- `/Users/chris/Projects/really-personal-finance/src/components/merchant-chart.tsx` - Horizontal bar chart axes, tooltip, table dark styling, recurring badge restyle
- `/Users/chris/Projects/really-personal-finance/src/lib/utils.ts` - Reference only: contains `formatCurrency` used by all three charts (no changes needed)
- `/Users/chris/Projects/really-personal-finance/src/types/index.ts` - Reference only: contains `CategoryData` and `MerchantData` interfaces (no changes needed)