import { NextRequest, NextResponse } from "next/server";
import { sendDailyAlerts, sendWeeklyAlerts } from "@/lib/alerts";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") || "daily";

  if (type === "weekly") {
    await sendWeeklyAlerts();
    return NextResponse.json({ success: true, type: "weekly" });
  }

  await sendDailyAlerts();
  return NextResponse.json({ success: true, type: "daily" });
}
