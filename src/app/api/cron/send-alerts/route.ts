import { NextRequest, NextResponse } from "next/server";
import { sendDailyAlerts, sendWeeklyAlerts } from "@/lib/alerts";
import { requireCronAuth, withErrorHandling } from "@/lib/api-helpers";

export const maxDuration = 60;

async function _GET(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const type = request.nextUrl.searchParams.get("type") || "daily";

  if (type === "weekly") {
    await sendWeeklyAlerts();
    return NextResponse.json({ success: true, type: "weekly" });
  }

  await sendDailyAlerts();
  return NextResponse.json({ success: true, type: "daily" });
}

export const GET = withErrorHandling(_GET);
