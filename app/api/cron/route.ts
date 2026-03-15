import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const CRON_SECRET = process.env.CRON_SECRET;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

type ExpenseRow = {
  amount: number | string | null;
  category: string | null;
  description: string | null;
  expense_date: string | null;
  created_at?: string | null;
};

type UserRow = {
  wa_id: string;
  name?: string | null;
};

type BillRow = {
  title: string;
  amount: number | string | null;
  due_day: number;
};

const TIPS = [
  "💡 Consejo 1/5\n\nRegistra tus gastos tal como hablas:\n• supermercado 12€\n• taxi 8€\n• café 3,50\n\nCuanto más natural escribas, más fácil será usar EuroChat.",
  "💡 Consejo 2/5\n\nUsa “resumen hoy” cada noche para ver en qué se fue tu dinero durante el día.",
  "💡 Consejo 3/5\n\nUsa “ranking” para descubrir tu categoría más fuerte del mes.\n\nVer tu top de gasto ayuda muchísimo a corregir hábitos.",
  "💡 Consejo 4/5\n\nUsa “proyeccion” para saber si tu ritmo actual te puede llevar a pasarte antes de fin de mes.",
  "💡 Consejo 5/5\n\nSi te equivocas, escribe “borrar ultimo gasto”.\n\nAsí mantienes tu historial limpio sin complicarte.",
];

const WEEKLY_TIPS = [
  "💡 Consejo semanal\n\nHaz una pausa de 30 segundos y revisa tu “ranking”. Tu categoría principal suele mostrar dónde más puedes mejorar.",
  "💡 Consejo semanal\n\nAntes de dormir, prueba “resumen hoy”. Ver tu día cerrado te ayuda a no gastar en automático.",
  "💡 Consejo semanal\n\nSi un gasto fue impulsivo, anótalo igual. Registrar también lo incómodo es lo que más cambia hábitos.",
  "💡 Consejo semanal\n\nLa mejor forma de usar EuroChat es registrar en el momento, no al final del día. Eso reduce olvidos y mejora la proyección.",
  "💡 Consejo semanal\n\nNo intentes ser perfecto: intenta ser constante. Un registro simple cada día vale más que un control perfecto una vez al mes.",
];

function formatAmount(value: number) {
  return Number(value.toFixed(2)).toString().replace(".", ",");
}

function getMadridParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday,
  };
}

function getMadridDateString(date = new Date()) {
  const p = getMadridParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(
    2,
    "0"
  )}`;
}

function ymdToUtcDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDays(ymd: string, days: number) {
  const dt = ymdToUtcDate(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffDaysInclusive(fromYmd: string, toYmd: string) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return (
    Math.floor(
      (ymdToUtcDate(toYmd).getTime() - ymdToUtcDate(fromYmd).getTime()) / msPerDay
    ) + 1
  );
}

function firstDayOfMonth(ymd: string) {
  const [y, m] = ymd.split("-");
  return `${y}-${m}-01`;
}

function daysInMonth(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isLastDayOfMonth(ymd: string) {
  const [, , d] = ymd.split("-").map(Number);
  return d === daysInMonth(ymd);
}

function summarizeByCategory(rows: ExpenseRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const category = row.category || "Otros";
    const amount = Number(row.amount || 0);
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});
}

function totalAmount(rows: ExpenseRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function topCategory(summary: Record<string, number>) {
  const entries = Object.entries(summary);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return { category: entries[0][0], amount: entries[0][1] };
}

function mostExpensiveDay(rows: ExpenseRow[]) {
  const byDay = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.expense_date || "unknown";
    acc[key] = (acc[key] || 0) + Number(row.amount || 0);
    return acc;
  }, {});

  const entries = Object.entries(byDay).filter(([k]) => k !== "unknown");
  if (!entries.length) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return { date: entries[0][0], amount: entries[0][1] };
}

function getIsoWeekKey(ymd: string) {
  const date = ymdToUtcDate(ymd);
  const target = new Date(date.valueOf());
  const dayNr = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const weekNumber =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("wa_id, name")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("GET USERS ERROR:", error);
    return [];
  }

  return (data || []) as UserRow[];
}

async function getExpensesInRange(waId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category, description, expense_date, created_at")
    .eq("wa_id", waId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: true });

  if (error) {
    console.error("GET EXPENSES RANGE ERROR:", waId, error);
    return [];
  }

  return (data || []) as ExpenseRow[];
}

async function getBillsDueToday(waId: string, todayDay: number) {
  const { data, error } = await supabase
    .from("bills")
    .select("title, amount, due_day")
    .eq("wa_id", waId)
    .eq("is_active", true)
    .eq("due_day", todayDay)
    .order("title", { ascending: true });

  if (error) {
    console.error("GET BILLS DUE TODAY ERROR:", waId, error);
    return [];
  }

  return (data || []) as BillRow[];
}

async function getFirstUseDateYmd(waId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("created_at")
    .eq("wa_id", waId)
    .eq("direction", "incoming")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("GET FIRST USE ERROR:", waId, error);
    return null;
  }

  if (!data?.created_at) return null;

  return getMadridDateString(new Date(data.created_at));
}

async function hasDelivery(waId: string, reportType: string, reportKey: string) {
  const { data, error } = await supabase
    .from("report_deliveries")
    .select("id")
    .eq("wa_id", waId)
    .eq("report_type", reportType)
    .eq("report_key", reportKey)
    .maybeSingle();

  if (error) {
    console.error("DELIVERY CHECK ERROR:", error);
    return false;
  }

  return !!data;
}

async function countDeliveries(waId: string, reportType: string) {
  const { count, error } = await supabase
    .from("report_deliveries")
    .select("*", { count: "exact", head: true })
    .eq("wa_id", waId)
    .eq("report_type", reportType);

  if (error) {
    console.error("DELIVERY COUNT ERROR:", error);
    return 0;
  }

  return count || 0;
}

async function markDelivery(waId: string, reportType: string, reportKey: string) {
  const { error } = await supabase.from("report_deliveries").insert({
    wa_id: waId,
    report_type: reportType,
    report_key: reportKey,
  });

  if (error) {
    console.error("DELIVERY MARK ERROR:", error);
  }
}

async function sendWhatsAppText(to: string, body: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("Missing WhatsApp env vars.");
    return false;
  }

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const text = await response.text();

  console.log("CRON META STATUS:", response.status);
  console.log("CRON META RESPONSE:", text);

  return response.ok;
}

async function saveOutgoingMessage(
  waId: string,
  message: string,
  messageType: "report" | "tip" | "bill_reminder"
) {
  const { error } = await supabase.from("messages").insert({
    wa_id: waId,
    message,
    direction: "outgoing",
    message_type: messageType,
  });

  if (error) {
    console.error("SAVE OUTGOING ERROR:", error);
  }
}

async function getUsageBasedProjection(waId: string, todayYmd: string) {
  const monthStart = firstDayOfMonth(todayYmd);
  const rows = await getExpensesInRange(waId, monthStart, todayYmd);

  if (!rows.length) {
    return {
      totalToday: 0,
      totalSinceStart: 0,
      daysOfUse: 0,
      daysRemaining: 0,
      projection: 0,
      mode: "none" as const,
    };
  }

  const firstUsageDay = rows[0].expense_date || todayYmd;
  const totalToday = totalAmount(rows.filter((r) => r.expense_date === todayYmd));
  const totalSinceStart = totalAmount(rows);

  const daysOfUse = diffDaysInclusive(firstUsageDay, todayYmd);
  const [, , dayNum] = todayYmd.split("-").map(Number);
  const daysRemaining = Math.max(daysInMonth(todayYmd) - dayNum, 0);

  if (daysOfUse <= 1) {
    return {
      totalToday,
      totalSinceStart,
      daysOfUse,
      daysRemaining,
      projection: totalToday * daysRemaining,
      mode: "first_day" as const,
    };
  }

  const dailyAverage = totalSinceStart / daysOfUse;

  return {
    totalToday,
    totalSinceStart,
    daysOfUse,
    daysRemaining,
    projection: dailyAverage * daysRemaining,
    mode: "average" as const,
  };
}

async function buildDailyReport(waId: string, todayYmd: string) {
  const rows = await getExpensesInRange(waId, todayYmd, todayYmd);
  const summary = summarizeByCategory(rows);
  const total = totalAmount(rows);
  const projection = await getUsageBasedProjection(waId, todayYmd);

  const categoryLines = Object.entries(summary)
    .map(([category, amount]) => `• ${category}: ${formatAmount(amount)}€`)
    .join("\n");

  if (!rows.length) {
    return `📊 Resumen de hoy\n\nHoy no registraste gastos.\n\n📈 Proyección\nPor ahora no hay suficiente actividad para proyectar el fin del mes.`;
  }

  let projectionText =
    "Por ahora no hay suficiente actividad para proyectar el fin del mes.";

  if (projection.daysOfUse === 1) {
    projectionText = `Como hoy fue tu primer día de uso este mes, si sigues así podrías gastar ${formatAmount(
      projection.projection
    )}€ hasta el fin del mes.`;
  } else if (projection.daysOfUse > 1) {
    const avg = projection.totalSinceStart / projection.daysOfUse;
    projectionText = `Tu media diaria desde que empezaste es ${formatAmount(
      avg
    )}€.\nSi sigues así, podrías gastar ${formatAmount(
      projection.projection
    )}€ hasta el fin del mes.`;
  }

  return `📊 Resumen de hoy\n\n${categoryLines}\n\nTotal: ${formatAmount(
    total
  )}€\n\n📈 Proyección\n${projectionText}`;
}

async function buildWeeklyReport(
  waId: string,
  weekStartYmd: string,
  weekEndYmd: string
) {
  const rows = await getExpensesInRange(waId, weekStartYmd, weekEndYmd);
  const summary = summarizeByCategory(rows);
  const total = totalAmount(rows);
  const top = topCategory(summary);

  if (!rows.length) {
    return `📅 Resumen semanal\n\nSemana pasada: ${weekStartYmd} → ${weekEndYmd}\n\nNo registraste gastos la semana pasada.`;
  }

  const categoryLines = Object.entries(summary)
    .map(([category, amount]) => `• ${category}: ${formatAmount(amount)}€`)
    .join("\n");

  return `📅 Resumen semanal\n\nSemana pasada: ${weekStartYmd} → ${weekEndYmd}\n\n${categoryLines}\n\nTotal: ${formatAmount(
    total
  )}€${
    top
      ? `\n\nTu categoría principal fue ${top.category} con ${formatAmount(
          top.amount
        )}€.`
      : ""
  }`;
}

async function buildMonthlyReport(waId: string, monthEndYmd: string) {
  const monthStartYmd = firstDayOfMonth(monthEndYmd);
  const rows = await getExpensesInRange(waId, monthStartYmd, monthEndYmd);
  const summary = summarizeByCategory(rows);
  const total = totalAmount(rows);
  const top = topCategory(summary);
  const expensiveDay = mostExpensiveDay(rows);

  if (!rows.length) {
    return `🧾 Informe mensual\n\nMes: ${monthStartYmd.slice(
      0,
      7
    )}\n\nNo registraste gastos este mes.`;
  }

  const categoryLines = Object.entries(summary)
    .map(([category, amount]) => `• ${category}: ${formatAmount(amount)}€`)
    .join("\n");

  return `🧾 Informe mensual completo\n\nMes: ${monthStartYmd.slice(
    0,
    7
  )}\n\n${categoryLines}\n\nTotal del mes: ${formatAmount(total)}€${
    top
      ? `\nTu categoría principal fue ${top.category} con ${formatAmount(
          top.amount
        )}€.`
      : ""
  }${
    expensiveDay
      ? `\nDía con más gasto: ${expensiveDay.date} (${formatAmount(
          expensiveDay.amount
        )}€).`
      : ""
  }\n\nSigue así 💪`;
}

async function buildTipMessageForUser(waId: string, todayYmd: string, weekday: string) {
  if (!["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday)) {
    return null;
  }

  const firstUseYmd = await getFirstUseDateYmd(waId);
  if (!firstUseYmd) return null;

  const daysSinceFirstUse = diffDaysInclusive(firstUseYmd, todayYmd);

  if (daysSinceFirstUse >= 2 && daysSinceFirstUse <= 7) {
    const onboardingSent = await countDeliveries(waId, "tip_onboarding");

    if (onboardingSent < 5) {
      const tipNumber = onboardingSent + 1;
      const reportKey = `${todayYmd}_onboarding_${tipNumber}`;

      const alreadySent = await hasDelivery(waId, "tip_onboarding", reportKey);
      if (alreadySent) return null;

      return {
        reportType: "tip_onboarding",
        reportKey,
        body: TIPS[onboardingSent],
      };
    }

    return null;
  }

  if (daysSinceFirstUse > 7 && weekday === "Fri") {
    const weekKey = getIsoWeekKey(todayYmd);
    const reportKey = `weekly_tip_${weekKey}`;

    const alreadySent = await hasDelivery(waId, "tip_weekly", reportKey);
    if (alreadySent) return null;

    const weeksSinceFirstUse = Math.floor((daysSinceFirstUse - 1) / 7);
    const tipIndex = weeksSinceFirstUse % WEEKLY_TIPS.length;

    return {
      reportType: "tip_weekly",
      reportKey,
      body: WEEKLY_TIPS[tipIndex],
    };
  }

  return null;
}

function buildBillsReminderMessage(bills: BillRow[]) {
  const lines = bills.map(
    (bill) =>
      `• ${bill.title} — ${
        bill.amount !== null ? `${formatAmount(Number(bill.amount))}€` : "sin importe"
      }`
  );

  return `🔔 Recordatorio de pago\n\nHoy vencen estas cuentas:\n\n${lines.join(
    "\n"
  )}\n\nEvita olvidos y mantén tu control al día.`;
}

async function runBillsJob(todayYmd: string) {
  const users = await getAllUsers();
  const todayDay = Number(todayYmd.slice(-2));
  let remindersSent = 0;

  for (const user of users) {
    const bills = await getBillsDueToday(user.wa_id, todayDay);
    if (!bills.length) continue;

    const reportKey = `${todayYmd}_day_${todayDay}`;
    const alreadySent = await hasDelivery(
      user.wa_id,
      "bill_reminder",
      reportKey
    );

    if (alreadySent) continue;

    const message = buildBillsReminderMessage(bills);
    const sent = await sendWhatsAppText(user.wa_id, message);

    if (sent) {
      await saveOutgoingMessage(user.wa_id, message, "bill_reminder");
      await markDelivery(user.wa_id, "bill_reminder", reportKey);
      remindersSent++;
    }
  }

  return {
    ok: true,
    job: "bills",
    users: users.length,
    remindersSent,
    todayYmd,
  };
}

async function runTipsJob(todayYmd: string, weekday: string) {
  const users = await getAllUsers();
  let tipsSent = 0;

  for (const user of users) {
    const tip = await buildTipMessageForUser(user.wa_id, todayYmd, weekday);
    if (!tip) continue;

    const sent = await sendWhatsAppText(user.wa_id, tip.body);

    if (sent) {
      await saveOutgoingMessage(user.wa_id, tip.body, "tip");
      await markDelivery(user.wa_id, tip.reportType, tip.reportKey);
      tipsSent++;
    }
  }

  return {
    ok: true,
    job: "tips",
    users: users.length,
    tipsSent,
    todayYmd,
    weekday,
  };
}

async function runReportsJob(todayYmd: string, weekday: string) {
  const users = await getAllUsers();

  let dailySent = 0;
  let weeklySent = 0;
  let monthlySent = 0;

  for (const user of users) {
    const waId = user.wa_id;

    const dailyKey = todayYmd;
    const dailyAlreadySent = await hasDelivery(waId, "daily", dailyKey);

    if (!dailyAlreadySent) {
      const dailyMessage = await buildDailyReport(waId, todayYmd);
      const sent = await sendWhatsAppText(waId, dailyMessage);

      if (sent) {
        await saveOutgoingMessage(waId, dailyMessage, "report");
        await markDelivery(waId, "daily", dailyKey);
        dailySent++;
      }
    }

    if (weekday === "Mon") {
      const previousSunday = addDays(todayYmd, -1);
      const previousMonday = addDays(todayYmd, -7);
      const weeklyKey = `${previousMonday}_${previousSunday}`;

      const weeklyAlreadySent = await hasDelivery(waId, "weekly", weeklyKey);

      if (!weeklyAlreadySent) {
        const weeklyMessage = await buildWeeklyReport(
          waId,
          previousMonday,
          previousSunday
        );
        const sent = await sendWhatsAppText(waId, weeklyMessage);

        if (sent) {
          await saveOutgoingMessage(waId, weeklyMessage, "report");
          await markDelivery(waId, "weekly", weeklyKey);
          weeklySent++;
        }
      }
    }

    if (isLastDayOfMonth(todayYmd)) {
      const monthlyKey = todayYmd.slice(0, 7);

      const monthlyAlreadySent = await hasDelivery(waId, "monthly", monthlyKey);

      if (!monthlyAlreadySent) {
        const monthlyMessage = await buildMonthlyReport(waId, todayYmd);
        const sent = await sendWhatsAppText(waId, monthlyMessage);

        if (sent) {
          await saveOutgoingMessage(waId, monthlyMessage, "report");
          await markDelivery(waId, "monthly", monthlyKey);
          monthlySent++;
        }
      }
    }
  }

  return {
    ok: true,
    job: "reports",
    users: users.length,
    dailySent,
    weeklySent,
    monthlySent,
    todayYmd,
    weekday,
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayYmd = getMadridDateString(new Date());
  const madridNow = getMadridParts(new Date());
  const job = req.nextUrl.searchParams.get("job");

  if (job === "tips") {
    const result = await runTipsJob(todayYmd, madridNow.weekday);
    return NextResponse.json(result);
  }

  if (job === "reports") {
    const result = await runReportsJob(todayYmd, madridNow.weekday);
    return NextResponse.json(result);
  }

  if (job === "bills") {
    const result = await runBillsJob(todayYmd);
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      error: "Missing or invalid job param. Use ?job=tips or ?job=reports or ?job=bills",
    },
    { status: 400 }
  );
}