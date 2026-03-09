"use client";

import { format, subDays, subMonths, startOfYear } from "date-fns";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const presets = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "3mo", days: 90 },
  { label: "YTD", days: -1 },
  { label: "All", days: -2 },
] as const;

function getPresetDates(preset: (typeof presets)[number]) {
  const today = format(new Date(), "yyyy-MM-dd");
  if (preset.days === -1) {
    // YTD
    return { start: format(startOfYear(new Date()), "yyyy-MM-dd"), end: today };
  }
  if (preset.days === -2) {
    // All time
    return { start: "2000-01-01", end: today };
  }
  return { start: format(subDays(new Date(), preset.days), "yyyy-MM-dd"), end: today };
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  function applyPreset(preset: (typeof presets)[number]) {
    const { start, end } = getPresetDates(preset);
    onStartDateChange(start);
    onEndDateChange(end);
  }

  return (
    <div className="bg-background-card backdrop-blur-xl p-4 rounded-2xl border border-border space-y-3">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const { start, end } = getPresetDates(preset);
          const isActive = startDate === start && endDate === end;
          return (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                isActive
                  ? "bg-accent text-foreground"
                  : "border border-border text-foreground-muted hover:bg-white/5"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom date pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
          />
        </div>
      </div>
    </div>
  );
}
