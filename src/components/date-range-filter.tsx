"use client";

import { DATE_PRESETS, getPresetDates } from "@/lib/date-presets";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="bg-background-card backdrop-blur-xl p-4 rounded-2xl border border-border space-y-3">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => {
          const { start, end } = getPresetDates(preset);
          const isActive = startDate === start && endDate === end;
          return (
            <button
              key={preset.label}
              onClick={() => {
                onStartDateChange(start);
                onEndDateChange(end);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                isActive
                  ? "bg-accent text-white"
                  : "border border-border text-foreground-muted hover:bg-black/[0.04]"
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
