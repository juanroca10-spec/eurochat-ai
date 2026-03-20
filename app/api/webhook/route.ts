import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "eurochat_verify_token";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MONTHLY_PAYMENT_LINK =
  "https://buy.stripe.com/test_dRm4gA7tY4TT8a58WI7bW00";
const YEARLY_PAYMENT_LINK =
  "https://buy.stripe.com/test_28E14oeWqgCBbmh1ug7bW01";

type ParsedEntry = {
  amount: number | null;
  category: string;
  subcategory: string | null;
  description: string;
  entryType: "income" | "expense";
};

type ParsedBill = {
  title: string;
  amount: number | null;
  dueDay: number | null;
  category: string;
  subcategory: string | null;
};

function normalizeText(message: string) {
  return message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function formatAmount(value: number) {
  return Number(value.toFixed(2)).toString().replace(".", ",");
}

function formatDateShort(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizePhoneDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function isIncomeText(text: string) {
  return (
    text.includes("recibi") ||
    text.includes("me pagaron") ||
    text.includes("me ingresaron") ||
    text.includes("salario") ||
    text.includes("nomina") ||
    text.includes("ingreso") ||
    text.includes("cobre") ||
    text.includes("cobré") ||
    text.includes("recibo")
  );
}

function parseBillRegistration(message: string): ParsedBill | null {
  const text = normalizeText(message);

  const dueDayMatch =
    text.match(/\bdia\s+(\d{1,2})\b/) ||
    text.match(/\bdía\s+(\d{1,2})\b/) ||
    text.match(/\bvenc(e|e el)?\s+(\d{1,2})\b/);

  let dueDay: number | null = null;

  if (dueDayMatch) {
    const rawDay = dueDayMatch[dueDayMatch.length - 1];
    dueDay = Number(rawDay);

    if (Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      dueDay = null;
    }
  }

  const amountMatch =
    text.match(/(\d+[.,]?\d*)\s*€/) ||
    text.match(/€\s*(\d+[.,]?\d*)/) ||
    text.match(/(\d+[.,]?\d*)/);

  const amount = amountMatch ? Number(amountMatch[1].replace(",", ".")) : null;

  if (!dueDay) return null;

  let title = message.trim();

  title = title.replace(/(\d+[.,]?\d*)\s*€/gi, "");
  title = title.replace(/€\s*(\d+[.,]?\d*)/gi, "");
  title = title.replace(/\bd[ií]a\s+\d{1,2}\b/gi, "");
  title = title.replace(/\bvence\b/gi, "");
  title = title.replace(/\bel\b/gi, "");

  // remove números soltos que tenham ficado no título
  title = title.replace(/\b\d+[.,]?\d*\b/g, "");

  title = title.replace(/\s+/g, " ").trim();

  if (!title) title = "Cuenta";

  return {
  title,
  amount,
  dueDay,
  category: "Fijos",
  subcategory: null,
};
}

function extractBillDeleteTitle(message: string) {
  const text = message.trim();
  const normalized = normalizeText(text);

  if (
    normalized.startsWith("borrar cuenta ") ||
    normalized.startsWith("eliminar cuenta ")
  ) {
    return text.replace(/^(borrar|eliminar)\s+cuenta\s+/i, "").trim();
  }

  return null;
}

function parseOpeningBalance(message: string) {
  const text = normalizeText(message);

  if (
    !text.includes("saldo inicial") &&
    !text.includes("mi saldo inicial")
  ) {
    return null;
  }

  const amountMatch =
    text.match(/(\d+[.,]?\d*)\s*€?/) ||
    text.match(/€\s*(\d+[.,]?\d*)/);

  if (!amountMatch) return null;

  const amount = Number(amountMatch[1].replace(",", "."));

  if (Number.isNaN(amount)) return null;

  return amount;
}

function getTodayDateRange() {
  const now = new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getMonthDateRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function hasActiveSubscription(waId: string) {
  const normalized = normalizePhoneDigits(waId);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, wa_id")
    .in("wa_id", [normalized, `+${normalized}`]);

  if (error) {
    console.error("SUBSCRIPTION CHECK ERROR:", error);
    return false;
  }

  const subscription = (data || []).find((item) => item.status === "active");

  if (!subscription) return false;

  if (!subscription.current_period_end) return true;

  const now = new Date();
  const end = new Date(subscription.current_period_end);

  return end > now;
}

async function getOpeningBalance(waId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select("opening_balance")
    .eq("wa_id", waId)
    .maybeSingle();

  if (error) {
    console.error("GET OPENING BALANCE ERROR:", error);
    return null;
  }

  return Number(data?.opening_balance || 0);
}

function buildSubscriptionPitchMessage() {
  return [
    "🚀 EuroChat AI",
    "",
    "Controla tus gastos por WhatsApp en segundos, sin hojas, sin apps complejas y sin perder tiempo.",
    "",
    "Con tu plan obtienes:",
    "• registro ilimitado de gastos",
    "• registro de ingresos",
    "• resúmenes automáticos",
    "• proyección del mes",
    "• ranking de categorías",
    "• consejos y reportes automáticos",
    "• gestión de cuentas fijas",
    "",
    "💳 Elige tu plan:",
    "",
    "Mensual — 10€/mes",
    `${MONTHLY_PAYMENT_LINK}`,
    "",
    "🔥 Anual — 50€/año",
    "Solo 4,16€/mes",
    `${YEARLY_PAYMENT_LINK}`,
    "",
    "El plan anual es la mejor opción: pagas mucho menos y mantienes el control todo el año.",
    "",
    "Activa tu acceso y empieza ahora.",
  ].join("\n");
}

async function saveOpeningBalance(waId: string, amount: number) {
  const { error } = await supabase.from("user_settings").upsert(
    {
      wa_id: waId,
      opening_balance: amount,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "wa_id",
    }
  );

  if (error) {
    console.error("SAVE OPENING BALANCE ERROR:", error);
    return false;
  }

  return true;
}

async function ensureUserExists(waId: string, name?: string) {
  const { data, error } = await supabase
    .from("users")
    .select("wa_id")
    .eq("wa_id", waId)
    .maybeSingle();

  if (error) {
    console.error("USER LOOKUP ERROR:", error);
    return;
  }

  if (!data) {
    const { error: insertError } = await supabase.from("users").insert({
      wa_id: waId,
      name: name || null,
    });

    if (insertError) {
      console.error("USER INSERT ERROR:", insertError);
    }
  }
}

async function saveMessage(
  waId: string,
  message: string,
  direction: "incoming" | "outgoing"
) {
  const { error } = await supabase.from("messages").insert({
    wa_id: waId,
    message,
    direction,
  });

  if (error) {
    console.error("MESSAGE SAVE ERROR:", error);
  }
}

async function getRecentIncomingMessages(waId: string, limit = 5) {
  const { data, error } = await supabase
    .from("messages")
    .select("message, created_at")
    .eq("wa_id", waId)
    .eq("direction", "incoming")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("RECENT MESSAGES ERROR:", error);
    return [];
  }

  return data || [];
}

async function getTodayTotal(waId: string) {
  const { start, end } = getTodayDateRange();

  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .eq("wa_id", waId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    console.error("SUPABASE TODAY TOTAL ERROR:", error);
    return null;
  }

  return (data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

async function getTodayExpenseCount(waId: string) {
  const { start, end } = getTodayDateRange();

  const { count, error } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("wa_id", waId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    console.error("SUPABASE TODAY COUNT ERROR:", error);
    return null;
  }

  return count || 0;
}

async function getTodaySummary(waId: string) {
  const { start, end } = getTodayDateRange();

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category")
    .eq("wa_id", waId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (error) {
    console.error("SUPABASE TODAY SUMMARY ERROR:", error);
    return null;
  }

  const rows = data || [];

  const summary = rows.reduce<Record<string, number>>((acc, item) => {
    const category = item.category || "Otros";
    const amount = Number(item.amount || 0);
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return { summary, total };
}

async function getMonthSummary(waId: string) {
  const { start, end } = getMonthDateRange();

  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category")
    .eq("wa_id", waId)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("SUPABASE MONTH SUMMARY ERROR:", error);
    return null;
  }

  const rows = data || [];

  const summary = rows.reduce<Record<string, number>>((acc, item) => {
    const category = item.category || "Otros";
    const amount = Number(item.amount || 0);
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});

  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return { summary, total, rows };
}

async function getMonthCashflow(waId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = monthStart.toISOString().slice(0, 10);
  const endDate = monthEnd.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("cashflow_entries")
    .select("amount, type")
    .eq("wa_id", waId)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate);

  if (error) {
    console.error("SUPABASE MONTH CASHFLOW ERROR:", error);
    return null;
  }

  const rows = data || [];

  const income = rows
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenses = rows
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const available = income - expenses;

  return {
    income,
    expenses,
    available,
  };
}

async function getRealisticProjection(waId: string) {
  const cashflow = await getMonthCashflow(waId);
  const expenseProjection = await getUsageBasedProjection(waId);
  const pendingBills = await getPendingBillsTotalThisMonth(waId);

  if (!cashflow || !expenseProjection || !pendingBills) {
    return null;
  }

  const projectedVariableExpenses = expenseProjection.projection;
  const pendingFixedBills = pendingBills.total;

  const estimatedEndBalance =
    cashflow.available - projectedVariableExpenses - pendingFixedBills;

  return {
    income: cashflow.income,
    currentExpenses: cashflow.expenses,
    availableToday: cashflow.available,
    projectedVariableExpenses,
    pendingFixedBills,
    estimatedEndBalance,
    pendingBillsList: pendingBills.bills,
    daysOfUse: expenseProjection.daysOfUse,
  };
}

async function getRealAvailableBalance(waId: string) {
  const openingBalance = await getOpeningBalance(waId);
  const cashflow = await getMonthCashflow(waId);

  if (openingBalance === null || !cashflow) {
    return null;
  }

  const realAvailable =
    openingBalance + cashflow.income - cashflow.expenses;

  return {
    openingBalance,
    income: cashflow.income,
    expenses: cashflow.expenses,
    realAvailable,
  };
}

async function getRealEndOfMonthBalance(waId: string) {
  const openingBalance = await getOpeningBalance(waId);
  const cashflow = await getMonthCashflow(waId);
  const realisticProjection = await getRealisticProjection(waId);

  if (
    openingBalance === null ||
    !cashflow ||
    !realisticProjection
  ) {
    return null;
  }

  const realAvailableToday =
    openingBalance + cashflow.income - cashflow.expenses;

  const realEstimatedEndBalance =
    realAvailableToday -
    realisticProjection.projectedVariableExpenses -
    realisticProjection.pendingFixedBills;

  return {
    openingBalance,
    income: cashflow.income,
    currentExpenses: cashflow.expenses,
    realAvailableToday,
    projectedVariableExpenses: realisticProjection.projectedVariableExpenses,
    pendingFixedBills: realisticProjection.pendingFixedBills,
    pendingBillsList: realisticProjection.pendingBillsList,
    realEstimatedEndBalance,
  };
}

async function getLastExpenses(waId: string, limit = 5) {
  const { data, error } = await supabase
    .from("expenses")
    .select("amount, category, description, created_at")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("SUPABASE LAST EXPENSES ERROR:", error);
    return null;
  }

  return data || [];
}

async function getBills(waId: string) {
  const { data, error } = await supabase
    .from("bills")
    .select("id, title, amount, due_day, is_active")
    .eq("wa_id", waId)
    .eq("is_active", true)
    .order("due_day", { ascending: true });

  if (error) {
    console.error("GET BILLS ERROR:", error);
    return null;
  }

  return data || [];
}

async function getPendingBillsTotalThisMonth(waId: string) {
  const now = new Date();
  const todayDay = now.getDate();

  const { data, error } = await supabase
    .from("bills")
    .select("title, amount, due_day")
    .eq("wa_id", waId)
    .eq("is_active", true)
    .gte("due_day", todayDay)
    .order("due_day", { ascending: true });

  if (error) {
    console.error("GET PENDING BILLS TOTAL ERROR:", error);
    return null;
  }

  const bills = data || [];

  const total = bills.reduce(
    (sum, bill) => sum + Number(bill.amount || 0),
    0
  );

  return {
    total,
    bills,
  };
}

async function deactivateBillByTitle(waId: string, title: string) {
  const bills = await getBills(waId);

  if (!bills || bills.length === 0) {
    return { ok: false as const, reason: "not_found" };
  }

  const normalizeBillName = (value: string) =>
    normalizeText(value)
      .replace(/\b\d+[.,]?\d*\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedTarget = normalizeBillName(title);

  let matched =
    bills.find(
      (bill) => normalizeBillName(bill.title) === normalizedTarget
    ) ||
    bills.find((bill) =>
      normalizeBillName(bill.title).includes(normalizedTarget)
    ) ||
    bills.find((bill) =>
      normalizedTarget.includes(normalizeBillName(bill.title))
    );

  if (!matched) {
    return { ok: false as const, reason: "not_found" };
  }

  const { error } = await supabase
    .from("bills")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matched.id);

  if (error) {
    console.error("DEACTIVATE BILL ERROR:", error);
    return { ok: false as const, reason: "error" };
  }

  return { ok: true as const, title: matched.title };
}

async function deleteLastExpense(waId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount, category, description")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("SUPABASE DELETE LAST LOOKUP ERROR:", error);
    return null;
  }

  if (!data) return false;

  const { error: deleteError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", data.id);

  if (deleteError) {
    console.error("SUPABASE DELETE LAST ERROR:", deleteError);
    return null;
  }

  return data;
}

function getTopCategory(summary: Record<string, number>) {
  const entries = Object.entries(summary);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return {
    category: entries[0][0],
    amount: entries[0][1],
  };
}

function buildCategoryRanking(summary: Record<string, number>) {
  const entries = Object.entries(summary);

  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);

  const medals = ["🥇", "🥈", "🥉"];

  const lines = entries.map(([category, amount], index) => {
    const prefix = index < 3 ? medals[index] : `${index + 1}️⃣`;
    return `${prefix} ${category} — ${formatAmount(amount)}€`;
  });

  return lines.join("\n");
}

function buildPendingBillsLines(
  bills: Array<{ title: string; amount: number | string | null }>
) {
  if (!bills || bills.length === 0) return "";

  return bills
    .map(
      (bill) =>
        `• ${bill.title} — ${
          bill.amount !== null
            ? `${formatAmount(Number(bill.amount))}€`
            : "sin importe"
        }`
    )
    .join("\n");
}

async function getUsageBasedProjection(waId: string) {
  const now = new Date();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const { data: monthExpenses, error: monthError } = await supabase
    .from("expenses")
    .select("amount, created_at")
    .eq("wa_id", waId)
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString())
    .order("created_at", { ascending: true });

  if (monthError) {
    console.error("SUPABASE PROJECTION MONTH ERROR:", monthError);
    return null;
  }

  const rows = monthExpenses || [];

  if (rows.length === 0) {
    return {
      totalToday: 0,
      totalSinceStart: 0,
      daysOfUse: 0,
      daysRemaining: 0,
      projection: 0,
      mode: "none" as const,
    };
  }

  const firstExpenseDate = new Date(rows[0].created_at);
  const firstUsageDay = new Date(firstExpenseDate);
  firstUsageDay.setHours(0, 0, 0, 0);

  const totalToday = rows
    .filter((item) => {
      const d = new Date(item.created_at);
      return d >= todayStart && d <= todayEnd;
    })
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalSinceStart = rows.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysOfUse =
    Math.floor((todayStart.getTime() - firstUsageDay.getTime()) / msPerDay) + 1;

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();

  const currentDay = now.getDate();
  const daysRemaining = Math.max(daysInMonth - currentDay, 0);

  let projection = 0;
  let mode: "first_day" | "average" | "none" = "none";

  if (daysOfUse <= 1) {
    projection = totalToday * daysRemaining;
    mode = "first_day";
  } else {
    const dailyAverage = totalSinceStart / daysOfUse;
    projection = dailyAverage * daysRemaining;
    mode = "average";
  }

  return {
    totalToday,
    totalSinceStart,
    daysOfUse,
    daysRemaining,
    projection,
    mode,
  };
}

function parseEntryWithRules(message: string): ParsedEntry {
  const text = normalizeText(message);

  const amountMatch =
    text.match(/(\d+[.,]?\d*)\s*€/) ||
    text.match(/€\s*(\d+[.,]?\d*)/) ||
    text.match(/(\d+[.,]?\d*)/);

  const amount = amountMatch ? Number(amountMatch[1].replace(",", ".")) : null;

  const entryType: "income" | "expense" = isIncomeText(text)
    ? "income"
    : "expense";

  let category = entryType === "income" ? "Ingreso" : "Otros";

  if (entryType === "expense") {
    if (
      text.includes("supermercado") ||
      text.includes("mercado") ||
      text.includes("mercadona") ||
      text.includes("lidl") ||
      text.includes("carrefour") ||
      text.includes("dia") ||
      text.includes("cafe") ||
      text.includes("cafeteria") ||
      text.includes("restaurante") ||
      text.includes("comida") ||
      text.includes("cena") ||
      text.includes("almuerzo") ||
      text.includes("desayuno") ||
      text.includes("merienda")
    ) {
      category = "Alimentación";
    } else if (
      text.includes("uber") ||
      text.includes("taxi") ||
      text.includes("cabify") ||
      text.includes("bolt") ||
      text.includes("metro") ||
      text.includes("tren") ||
      text.includes("bus") ||
      text.includes("autobus") ||
      text.includes("transporte") ||
      text.includes("gasolina") ||
      text.includes("parking") ||
      text.includes("peaje") ||
      text.includes("aeropuerto")
    ) {
      category = "Transporte";
    } else if (
      text.includes("cine") ||
      text.includes("netflix") ||
      text.includes("spotify") ||
      text.includes("ocio") ||
      text.includes("bar") ||
      text.includes("fiesta") ||
      text.includes("discoteca") ||
      text.includes("copas") ||
      text.includes("cerveza") ||
      text.includes("vino")
    ) {
      category = "Ocio";
    } else if (
      text.includes("farmacia") ||
      text.includes("medico") ||
      text.includes("medicina") ||
      text.includes("salud") ||
      text.includes("hospital")
    ) {
      category = "Salud";
    }
  }

  return {
  amount,
  category,
  subcategory: null,
  description: message.trim(),
  entryType,
};
}

function looksLikeContinuation(message: string) {
  const text = normalizeText(message);

  if (/^\d+[.,]?\d*\s*€?$/.test(text)) return true;
  if (text.startsWith("y ")) return true;
  if (text.startsWith("tambien ")) return true;
  if (text.startsWith("también ")) return true;
  if (text.startsWith("en ")) return true;
  if (text.startsWith("de ")) return true;

  return false;
}

function mergeWithContext(currentMessage: string, previousMessages: string[]) {
  if (!looksLikeContinuation(currentMessage)) {
    return currentMessage;
  }

  const lastRelevant = previousMessages.find((msg) => {
    const normalized = normalizeText(msg);

    if (normalized === normalizeText(currentMessage)) return false;
    if (normalized === "hola") return false;
    if (normalized === "ayuda") return false;
    if (normalized.includes("resumen")) return false;
    if (normalized.includes("total")) return false;
    if (normalized.includes("proyeccion")) return false;
    if (normalized.includes("ranking")) return false;
    if (normalized.includes("saldo")) return false;
    if (normalized.includes("dinero disponible")) return false;
    if (normalized.includes("flujo")) return false;
    if (normalized.includes("cuentas")) return false;

    return true;
  });

  if (!lastRelevant) return currentMessage;

  return `${lastRelevant} ${currentMessage}`;
}

async function parseEntryWithOpenAI(
  message: string,
  contextMessages: string[]
): Promise<ParsedEntry | null> {
  if (!OPENAI_API_KEY) return null;

  const contextBlock = contextMessages.length
    ? contextMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")
    : "Sin contexto previo.";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Extrae un movimiento financiero del mensaje del usuario usando también el contexto reciente si ayuda.

Devuelve SOLO JSON válido, sin markdown, sin explicación, sin texto extra.

Formato exacto:
{
  "amount": number | null,
  "category": string,
  "subcategory": string | null,
  "description": string,
  "entryType": "income" | "expense"
}

Reglas:
- Si el texto habla de dinero recibido, salario, cobro o ingreso, entryType = "income".
- Si el texto habla de gasto o compra, entryType = "expense".
- Si no hay importe claro, amount = null.
- La descripción debe ser breve y útil.
- No inventes datos.

Contexto reciente:
${contextBlock}

Mensaje actual:
${message}`,
      }),
    });

    const result = await response.json();

    const outputText =
      result?.output?.[0]?.content?.[0]?.text ||
      result?.output_text ||
      "";

    if (!outputText) {
      console.error("OPENAI EMPTY RESPONSE:", result);
      return null;
    }

    const parsed = JSON.parse(outputText.trim());

    return {
  amount:
    typeof parsed.amount === "number" ? parsed.amount : null,
  category:
    typeof parsed.category === "string"
      ? parsed.category
      : parsed.entryType === "income"
      ? "Ingreso"
      : "Otros",
  subcategory:
    typeof parsed.subcategory === "string" ? parsed.subcategory : null,
  description:
    typeof parsed.description === "string"
      ? parsed.description
      : message.trim(),
  entryType: parsed.entryType === "income" ? "income" : "expense",
};
  } catch (error) {
    console.error("OPENAI PARSE ERROR:", error);
    return null;
  }
}

async function parseEntrySmart(message: string, waId: string) {
  const recentMessagesRows = await getRecentIncomingMessages(waId, 5);
  const recentMessages = recentMessagesRows.map((row) => row.message);

  const mergedMessage = mergeWithContext(message, recentMessages);
  const ruleParsed = parseEntryWithRules(mergedMessage);

  const shouldUseAI =
    ruleParsed.amount === null ||
    ruleParsed.category === "Otros" ||
    mergedMessage !== message;

  if (!shouldUseAI) {
    return ruleParsed;
  }

  console.log("Using OpenAI fallback for parsing:", message);
  console.log("Merged context message:", mergedMessage);

  const aiParsed = await parseEntryWithOpenAI(mergedMessage, recentMessages);

  if (aiParsed && aiParsed.amount !== null) {
    console.log("AI PARSED RESULT:", aiParsed);
    return aiParsed;
  }

  return ruleParsed;
}

async function buildDailyControlMessage(waId: string) {
  const todayTotal = await getTodayTotal(waId);
  const todayCount = await getTodayExpenseCount(waId);
  const projectionData = await getUsageBasedProjection(waId);

  if (
    todayTotal === null ||
    todayCount === null ||
    !projectionData ||
    projectionData.daysOfUse === 0
  ) {
    return "";
  }

  if (todayCount < 3) {
    return "";
  }

  const { totalSinceStart, daysOfUse, projection } = projectionData;

  if (daysOfUse === 1) {
    return `\n\n⚠️ Hoy ya gastaste ${formatAmount(
      todayTotal
    )}€.\n\n🔴 Control del día: alto.\nComo acabas de empezar a usar EuroChat, esta proyección es inicial.\nSi sigues así, podrías gastar ${formatAmount(
      projection
    )}€ hasta el fin del mes.`;
  }

  const dailyAverage = totalSinceStart / daysOfUse;

  if (todayTotal < dailyAverage * 0.9) {
    return `\n\nHoy llevas ${formatAmount(
      todayTotal
    )}€ gastados.\n\n🟢 Control del día: muy bien.\nEstás por debajo de tu media diaria desde que empezaste a usar EuroChat.`;
  }

  if (todayTotal <= dailyAverage * 1.2) {
    return `\n\nHoy llevas ${formatAmount(
      todayTotal
    )}€ gastados.\n\n🟠 Control del día: cuidado.\nYa superaste tu media diaria desde que empezaste a usar EuroChat.`;
  }

  return `\n\n⚠️ Hoy ya gastaste ${formatAmount(
    todayTotal
  )}€.\n\n🔴 Control del día: alto.\nTu media diaria desde que empezaste es ${formatAmount(
    dailyAverage
  )}€.\nSi sigues así, podrías gastar ${formatAmount(
    projection
  )}€ hasta el fin del mes.`;
}

async function markIncomingMessageAsRead(messageId: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !messageId) {
    return;
  }

  try {
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
          status: "read",
          message_id: messageId,
        }),
      }
    );

    const resultText = await response.text();

    console.log("MARK AS READ STATUS:", response.status);
    console.log("MARK AS READ RESPONSE:", resultText);
  } catch (error) {
    console.error("MARK AS READ ERROR:", error);
  }
}

async function sendWhatsAppText(to: string, body: string) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("Missing WhatsApp env vars.");
    return;
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

  const resultText = await response.text();
  console.log("SEND MESSAGE STATUS:", response.status);
  console.log("SEND MESSAGE RESPONSE:", resultText);
}

async function buildReply(message: string, waId: string) {
  const text = normalizeText(message);

  const deleteBillTitle = extractBillDeleteTitle(message);
  if (deleteBillTitle) {
    const result = await deactivateBillByTitle(waId, deleteBillTitle);

    if (result.ok) {
      return {
        reply: `🗑️ Cuenta desactivada\n\n${result.title} ya no volverá a recordarse.`,
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply:
        "No encontré esa cuenta fija.\n\nPrueba algo como:\n• borrar cuenta alquiler\n• eliminar cuenta internet",
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  const bill = parseBillRegistration(message);
  if (bill && bill.dueDay) {
    const { error } = await supabase.from("bills").insert({
      wa_id: waId,
      title: bill.title,
      amount: bill.amount,
      due_day: bill.dueDay,
      frequency: "monthly",
      category: "Fijos",
      is_active: true,
    });

    if (error) {
      console.error("BILL INSERT ERROR:", error);
      return {
        reply: "No pude guardar esa cuenta fija.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `📌 Cuenta registrada\n\nConcepto: ${bill.title}\nImporte: ${
        bill.amount !== null ? `${formatAmount(bill.amount)}€` : "sin importe"
      }\nVence cada mes el día ${bill.dueDay}.`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
  text === "saldo estimado" ||
  text === "fin de mes" ||
  text === "saldo fin de mes"
) {
  const realisticProjection = await getRealisticProjection(waId);

  if (!realisticProjection) {
    return {
      reply: "No pude calcular tu saldo estimado a fin de mes.",
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  return {
    reply: `📈 Proyección financiera\n\nIngresos del mes: ${formatAmount(
  realisticProjection.income
)}€\nGastos actuales: ${formatAmount(
  realisticProjection.currentExpenses
)}€\nDisponible hoy: ${formatAmount(
  realisticProjection.availableToday
)}€\n\nGasto variable estimado hasta fin de mes: ${formatAmount(
  realisticProjection.projectedVariableExpenses
)}€\nCuentas fijas pendientes: ${formatAmount(
  realisticProjection.pendingFixedBills
)}€\nSaldo estimado a fin de mes: ${formatAmount(
  realisticProjection.estimatedEndBalance
)}€${
  realisticProjection.pendingBillsList &&
  realisticProjection.pendingBillsList.length > 0
    ? `\n\nIncluye:\n${buildPendingBillsLines(
        realisticProjection.pendingBillsList
      )}`
    : ""
}`,
    parsed: {
      amount: null,
      category: "Otros",
      description: message.trim(),
      entryType: "expense",
    },
    shouldSaveEntry: false,
  };
}
  if (text === "hola" || text === "hi" || text === "hello") {
    return {
      reply:
        "Hola 👋 Soy EuroChat AI.\n\nAhora puedes registrar gastos, ingresos y cuentas fijas por WhatsApp.\n\nEjemplos:\n• supermercado 12€\n• taxi 8€\n• recibí 1800€\n• alquiler 650€ día 5\n• internet 30€ día 12\n\nTambién puedes pedir:\n• total hoy\n• resumen hoy\n• resumen mes\n• dinero disponible\n• saldo\n• flujo\n• proyeccion\n• saldo estimado\n• mis cuentas\n• borrar cuenta alquiler\n• ranking\n• ultimos gastos\n• borrar ultimo gasto",
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "dinero real disponible" ||
    text === "saldo real" ||
    text === "dinero disponible real"
  ) {
    const realBalance = await getRealAvailableBalance(waId);

    if (!realBalance) {
      return {
        reply: "No pude calcular tu dinero real disponible.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `💳 Dinero real disponible\n\nSaldo inicial: ${formatAmount(
        realBalance.openingBalance
      )}€\nIngresos del mes: ${formatAmount(
        realBalance.income
      )}€\nGastos del mes: ${formatAmount(
        realBalance.expenses
      )}€\n\nDisponible real: ${formatAmount(
        realBalance.realAvailable
      )}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "saldo real estimado" ||
    text === "saldo real fin de mes" ||
    text === "dinero real a fin de mes"
  ) {
    const realEndBalance = await getRealEndOfMonthBalance(waId);

    if (!realEndBalance) {
      return {
        reply: "No pude calcular tu saldo real estimado a fin de mes.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `📉 Saldo real estimado a fin de mes\n\nSaldo inicial: ${formatAmount(
        realEndBalance.openingBalance
      )}€\nIngresos del mes: ${formatAmount(
        realEndBalance.income
      )}€\nGastos ya realizados: ${formatAmount(
        realEndBalance.currentExpenses
      )}€\n\nDisponible real hoy: ${formatAmount(
        realEndBalance.realAvailableToday
      )}€\n\nGasto variable estimado: ${formatAmount(
        realEndBalance.projectedVariableExpenses
      )}€\nCuentas fijas pendientes: ${formatAmount(
        realEndBalance.pendingFixedBills
      )}€\n\nSaldo real estimado a fin de mes: ${formatAmount(
        realEndBalance.realEstimatedEndBalance
      )}€${
        realEndBalance.pendingBillsList &&
        realEndBalance.pendingBillsList.length > 0
          ? `\n\nIncluye:\n${buildPendingBillsLines(
              realEndBalance.pendingBillsList
            )}`
          : ""
      }`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "dinero disponible" ||
    text === "saldo" ||
    text === "flujo" ||
    text === "saldo actual"
  ) {
    const cashflow = await getMonthCashflow(waId);

    if (!cashflow) {
      return {
        reply: "No pude calcular tu flujo actual.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `💰 Flujo actual del mes\n\nIngresos: ${formatAmount(
        cashflow.income
      )}€\nGastos: ${formatAmount(cashflow.expenses)}€\nDisponible: ${formatAmount(
        cashflow.available
      )}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "saldo estimado" ||
    text === "fin de mes" ||
    text === "saldo fin de mes"
  ) {
    const realisticProjection = await getRealisticProjection(waId);

    if (!realisticProjection) {
      return {
        reply: "No pude calcular tu saldo estimado a fin de mes.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `📈 Proyección financiera\n\nIngresos del mes: ${formatAmount(
        realisticProjection.income
      )}€\nGastos actuales: ${formatAmount(
        realisticProjection.currentExpenses
      )}€\nDisponible hoy: ${formatAmount(
        realisticProjection.availableToday
      )}€\n\nGasto estimado hasta fin de mes: ${formatAmount(
        realisticProjection.projectedVariableExpenses
      )}€\nSaldo estimado a fin de mes: ${formatAmount(
        realisticProjection.estimatedEndBalance
      )}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "total hoy" ||
    text === "gaste hoy" ||
    text === "gasté hoy" ||
    text === "cuanto gaste hoy" ||
    text === "cuánto gasté hoy" ||
    text === "cuanto gaste hoy?" ||
    text === "cuánto gasté hoy?"
  ) {
    const total = await getTodayTotal(waId);

    return {
      reply:
        total === null
          ? "No pude calcular tu total de hoy."
          : `Hoy has gastado ${formatAmount(total)}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "resumen" ||
    text === "resumen hoy" ||
    text === "resumen de hoy"
  ) {
    const todaySummary = await getTodaySummary(waId);

    if (!todaySummary) {
      return {
        reply: "No pude generar tu resumen de hoy.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    const { summary, total } = todaySummary;
    const categories = Object.entries(summary);

    if (categories.length === 0) {
      return {
        reply: "Hoy todavía no tienes gastos registrados.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    const lines = categories.map(
      ([category, amount]) => `• ${category}: ${formatAmount(amount)}€`
    );

    return {
      reply: `📊 Resumen de hoy\n\n${lines.join("\n")}\n\nTotal: ${formatAmount(
        total
      )}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (text === "resumen mes" || text === "mes por categoria") {
    const monthSummary = await getMonthSummary(waId);

    if (!monthSummary) {
      return {
        reply: "No pude generar tu resumen mensual.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    const entries = Object.entries(monthSummary.summary);

    if (entries.length === 0) {
      return {
        reply: "Este mes todavía no tienes gastos registrados.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    const lines = entries.map(
      ([category, amount]) => `• ${category}: ${formatAmount(amount)}€`
    );

    return {
      reply: `📊 Resumen del mes\n\n${lines.join("\n")}\n\nTotal: ${formatAmount(
        monthSummary.total
      )}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (
    text === "ranking" ||
    text === "ranking mes" ||
    text === "ranking categorias"
  ) {
    const monthSummary = await getMonthSummary(waId);

    if (!monthSummary) {
      return {
        reply: "No pude calcular tu ranking este mes.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    const ranking = buildCategoryRanking(monthSummary.summary);

    if (!ranking) {
      return {
        reply: "Este mes todavía no tienes gastos registrados.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `📊 Tu ranking de gastos este mes\n\n${ranking}\n\nTotal: ${formatAmount(
        monthSummary.total
      )}€`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (text === "proyeccion" || text === "proyeccion mes") {
  const realisticProjection = await getRealisticProjection(waId);
  const expenseProjection = await getUsageBasedProjection(waId);

  if (!realisticProjection || !expenseProjection) {
    return {
      reply: "Todavía no tienes suficientes datos este mes para proyectar.",
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  const monthSummary = await getMonthSummary(waId);
  const topCategory = monthSummary
    ? getTopCategory(monthSummary.summary)
    : null;

  return {
    reply: `📈 Proyección del mes\n\nIngresos del mes: ${formatAmount(
  realisticProjection.income
)}€\nGastos actuales: ${formatAmount(
  realisticProjection.currentExpenses
)}€\nDisponible hoy: ${formatAmount(
  realisticProjection.availableToday
)}€\n\nGasto variable estimado hasta fin de mes: ${formatAmount(
  realisticProjection.projectedVariableExpenses
)}€\nCuentas fijas pendientes: ${formatAmount(
  realisticProjection.pendingFixedBills
)}€\nSaldo estimado a fin de mes: ${formatAmount(
  realisticProjection.estimatedEndBalance
)}€${
  topCategory
    ? `\n\nTu categoría principal es ${topCategory.category} con ${formatAmount(
        topCategory.amount
      )}€.`
    : ""
}${
  realisticProjection.pendingBillsList &&
  realisticProjection.pendingBillsList.length > 0
    ? `\n\nIncluye:\n${buildPendingBillsLines(
        realisticProjection.pendingBillsList
      )}`
    : ""
}`,
    parsed: {
      amount: null,
      category: "Otros",
      description: message.trim(),
      entryType: "expense",
    },
    shouldSaveEntry: false,
  };
}

  if (text === "ultimos gastos" || text === "ultimos 5 gastos") {
    const expenses = await getLastExpenses(waId, 5);

    if (!expenses || expenses.length === 0) {
      return {
        reply: "Todavía no tienes gastos registrados.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    const lines = expenses.map(
      (item) =>
        `• ${item.description} — ${formatAmount(Number(item.amount))}€ (${item.category})\n  ${formatDateShort(
          item.created_at
        )}`
    );

    return {
      reply: `🧾 Últimos gastos\n\n${lines.join("\n\n")}`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  if (text === "borrar ultimo gasto" || text === "borrar ultimo") {
    const deleted = await deleteLastExpense(waId);

    if (deleted === null) {
      return {
        reply: "No pude borrar tu último gasto.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    if (deleted === false) {
      return {
        reply: "No tienes gastos para borrar.",
        parsed: {
          amount: null,
          category: "Otros",
          description: message.trim(),
          entryType: "expense",
        },
        shouldSaveEntry: false,
      };
    }

    return {
      reply: `🗑️ Último gasto borrado\n\n${deleted.description} — ${formatAmount(
        Number(deleted.amount)
      )}€ (${deleted.category})`,
      parsed: {
        amount: null,
        category: "Otros",
        description: message.trim(),
        entryType: "expense",
      },
      shouldSaveEntry: false,
    };
  }

  const parsed = await parseEntrySmart(message, waId);

  if (parsed.amount === null) {
    return {
      reply:
        "No entendí el movimiento.\n\nPrueba algo como:\n• supermercado 12€\n• taxi 8€\n• café 3,50\n• recibí 1800€\n• salario 2200€\n• me pagaron 950€\n• alquiler 650€ día 5",
      parsed,
      shouldSaveEntry: false,
    };
  }

  if (parsed.entryType === "income") {
    return {
      reply: `💰 Ingreso registrado\nConcepto: ${parsed.description}\nImporte: ${formatAmount(
        parsed.amount
      )}€`,
      parsed,
      shouldSaveEntry: true,
    };
  }

  return {
    reply: `✅ Gasto registrado\nCategoría: ${parsed.category}\nImporte: ${formatAmount(
      parsed.amount
    )}€`,
    parsed,
    shouldSaveEntry: true,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("WHATSAPP WEBHOOK EVENT:");
    console.log(JSON.stringify(body, null, 2));

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      console.log("Nenhuma mensagem encontrada no payload.");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const from = message.from;
    const text = message?.text?.body?.trim() || "";
    const messageId = message?.id || "";
    const contactName =
      body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name;

    console.log("FROM:", from);
    console.log("TEXT:", text);
    console.log("MESSAGE ID:", messageId);

    await ensureUserExists(from, contactName);
    await saveMessage(from, text, "incoming");

    if (messageId) {
      await markIncomingMessageAsRead(messageId);
    }

    const hasAccess = await hasActiveSubscription(from);

    if (!hasAccess) {
      const salesMessage = buildSubscriptionPitchMessage();
      await sendWhatsAppText(from, salesMessage);
      await saveMessage(from, salesMessage, "outgoing");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { reply, parsed, shouldSaveEntry } = await buildReply(text, from);

    console.log("PARSED:", parsed);
    console.log("REPLY:", reply);

    let finalReply = reply;

    if (shouldSaveEntry && parsed.amount !== null) {
      const cashflowInsert = await supabase.from("cashflow_entries").insert({
        wa_id: from,
        type: parsed.entryType,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        source: "whatsapp",
      });

      if (cashflowInsert.error) {
        console.error("CASHFLOW INSERT ERROR:", cashflowInsert.error);
      }

      if (parsed.entryType === "expense") {
        const expenseInsert = await supabase.from("expenses").insert({
          wa_id: from,
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          source: "whatsapp",
        });

        if (expenseInsert.error) {
          console.error("SUPABASE INSERT ERROR:", expenseInsert.error);
        } else {
          console.log("Expense saved successfully.");
          finalReply += await buildDailyControlMessage(from);
        }
      }
    }

    await sendWhatsAppText(from, finalReply);
    await saveMessage(from, finalReply, "outgoing");

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook POST error:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}