import { db } from "@/db";
import { transactions, telegramConfigs } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatCurrency } from "@/lib/utils";
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from "date-fns";

export async function getDailySummary(userId: string): Promise<string> {
  const today = format(new Date(), "yyyy-MM-dd");

  const results = await db
    .select({
      total: sql<string>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
      count: sql<number>`COUNT(CASE WHEN ${transactions.amount} > 0 THEN 1 END)`,
      income: sql<string>`ABS(SUM(CASE WHEN ${transactions.amount} < 0 THEN ${transactions.amount} ELSE 0 END))`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.date, today)));

  const { total, count, income } = results[0];
  const spending = parseFloat(total || "0");
  const incomeAmt = parseFloat(income || "0");

  // Top merchants today
  const topMerchants = await db
    .select({
      merchant: sql<string>`COALESCE(${transactions.merchantName}, ${transactions.name})`,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.date, today),
        sql`${transactions.amount} > 0`
      )
    )
    .groupBy(
      sql`COALESCE(${transactions.merchantName}, ${transactions.name})`
    )
    .orderBy(sql`SUM(${transactions.amount}) DESC`)
    .limit(5);

  let msg = `<b>Daily Summary — ${today}</b>\n\n`;
  msg += `Spent: <b>${formatCurrency(spending)}</b> (${count} transactions)\n`;
  if (incomeAmt > 0) {
    msg += `Income: <b>${formatCurrency(incomeAmt)}</b>\n`;
  }

  if (topMerchants.length > 0) {
    msg += `\n<b>Top Spending:</b>\n`;
    for (const m of topMerchants) {
      msg += `  ${m.merchant}: ${formatCurrency(parseFloat(m.total))}\n`;
    }
  }

  return msg;
}

export async function getWeeklyComparison(userId: string): Promise<string> {
  const now = new Date();
  const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekStart = format(
    startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );
  const lastWeekEnd = format(
    endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const [thisWeek] = await db
    .select({
      total: sql<string>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, thisWeekStart),
        lte(transactions.date, thisWeekEnd)
      )
    );

  const [lastWeek] = await db
    .select({
      total: sql<string>`SUM(CASE WHEN ${transactions.amount} > 0 THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, lastWeekStart),
        lte(transactions.date, lastWeekEnd)
      )
    );

  const thisWeekTotal = parseFloat(thisWeek?.total || "0");
  const lastWeekTotal = parseFloat(lastWeek?.total || "0");
  const diff = thisWeekTotal - lastWeekTotal;
  const pctChange = lastWeekTotal > 0 ? (diff / lastWeekTotal) * 100 : 0;

  let msg = `<b>Weekly Comparison</b>\n\n`;
  msg += `This week: <b>${formatCurrency(thisWeekTotal)}</b>\n`;
  msg += `Last week: ${formatCurrency(lastWeekTotal)}\n`;
  if (diff > 0) {
    msg += `\nUp ${formatCurrency(diff)} (+${pctChange.toFixed(1)}%) from last week`;
  } else if (diff < 0) {
    msg += `\nDown ${formatCurrency(Math.abs(diff))} (${pctChange.toFixed(1)}%) from last week`;
  } else {
    msg += `\nSame as last week`;
  }

  return msg;
}

export async function detectAnomalies(userId: string): Promise<string | null> {
  // Compare this week's merchant spending to the 4-week average
  const now = new Date();
  const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const fourWeeksAgo = format(subWeeks(now, 4), "yyyy-MM-dd");

  // This week's spending by merchant
  const thisWeekMerchants = await db
    .select({
      merchant: sql<string>`COALESCE(${transactions.merchantName}, ${transactions.name})`,
      total: sql<string>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, thisWeekStart),
        sql`${transactions.amount} > 0`
      )
    )
    .groupBy(
      sql`COALESCE(${transactions.merchantName}, ${transactions.name})`
    );

  // 4-week average by merchant
  const avgMerchants = await db
    .select({
      merchant: sql<string>`COALESCE(${transactions.merchantName}, ${transactions.name})`,
      avgWeekly: sql<string>`SUM(${transactions.amount}) / 4`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, fourWeeksAgo),
        lte(transactions.date, thisWeekStart),
        sql`${transactions.amount} > 0`
      )
    )
    .groupBy(
      sql`COALESCE(${transactions.merchantName}, ${transactions.name})`
    );

  const avgMap = new Map(avgMerchants.map((m) => [m.merchant, parseFloat(m.avgWeekly)]));

  const anomalies: string[] = [];

  for (const m of thisWeekMerchants) {
    const thisWeekAmt = parseFloat(m.total);
    const avgAmt = avgMap.get(m.merchant);

    if (avgAmt && avgAmt > 0 && thisWeekAmt > avgAmt * 2 && thisWeekAmt > 20) {
      anomalies.push(
        `<b>${m.merchant}</b>: ${formatCurrency(thisWeekAmt)} this week (avg: ${formatCurrency(avgAmt)}/week)`
      );
    }
  }

  if (anomalies.length === 0) return null;

  return `<b>Unusual Spending Alert</b>\n\n${anomalies.join("\n")}`;
}

/**
 * Send daily alerts to all enabled Telegram users.
 * Called from the cron endpoint.
 */
export async function sendDailyAlerts() {
  const configs = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.enabled, true));

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      // Daily summary
      const summary = await getDailySummary(config.userId);
      await sendTelegramMessage(config.chatId, summary);

      // Anomaly detection
      const anomaly = await detectAnomalies(config.userId);
      if (anomaly) {
        await sendTelegramMessage(config.chatId, anomaly);
      }
    })
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `Daily alerts: ${failures.length}/${configs.length} failed`,
      failures.map((f) => (f as PromiseRejectedResult).reason)
    );
  }
}

/**
 * Send weekly comparison to all enabled Telegram users.
 * Called from the weekly cron endpoint.
 */
export async function sendWeeklyAlerts() {
  const configs = await db
    .select()
    .from(telegramConfigs)
    .where(eq(telegramConfigs.enabled, true));

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const comparison = await getWeeklyComparison(config.userId);
      await sendTelegramMessage(config.chatId, comparison);
    })
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    console.error(
      `Weekly alerts: ${failures.length}/${configs.length} failed`,
      failures.map((f) => (f as PromiseRejectedResult).reason)
    );
  }
}
