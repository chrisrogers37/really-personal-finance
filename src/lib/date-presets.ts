import { format, subDays, startOfYear } from "date-fns";

export const DATE_PRESETS = [
  { label: "7d", type: "relative", days: 7 },
  { label: "30d", type: "relative", days: 30 },
  { label: "3mo", type: "relative", days: 90 },
  { label: "YTD", type: "ytd", days: 0 },
  { label: "All", type: "all", days: 0 },
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];

export function getPresetDates(preset: DatePreset): {
  start: string;
  end: string;
} {
  const today = format(new Date(), "yyyy-MM-dd");
  if (preset.type === "ytd") {
    return {
      start: format(startOfYear(new Date()), "yyyy-MM-dd"),
      end: today,
    };
  }
  if (preset.type === "all") {
    return { start: "2000-01-01", end: today };
  }
  return {
    start: format(subDays(new Date(), preset.days), "yyyy-MM-dd"),
    end: today,
  };
}
