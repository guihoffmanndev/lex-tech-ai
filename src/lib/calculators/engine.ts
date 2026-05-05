import Decimal from "decimal.js";

// Configure Decimal.js globally
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── Money Formatting ───────────────────────────────────────────────────────

export function formatBRL(value: Decimal | number | string): string {
  const n = new Decimal(value);
  return n.toNumber().toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseBRL(value: string): Decimal {
  // Remove R$, spaces, convert Brazilian number format to standard
  const cleaned = value
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return new Decimal(cleaned || "0");
}

// ─── Decimal arithmetic helpers ─────────────────────────────────────────────

export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function roundIndex(value: Decimal): Decimal {
  return value.toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
}

// ─── Date utilities ──────────────────────────────────────────────────────────

/** Returns number of calendar days between two dates (inclusive of start, exclusive of end) */
export function diasCorridos(inicio: Date, fim: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = fim.getTime() - inicio.getTime();
  return Math.floor(diff / msPerDay);
}

/** Parses a date string in YYYY-MM-DD format */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a Date to YYYY-MM-DD */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Formats a Date to DD/MM/YYYY (BCB API format) */
export function formatDateBCB(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}/${m}/${y}`;
}

/** Returns the first day of the month for a given date */
export function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Adds months to a date */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Returns true if date A is before date B */
export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

/** Returns true if date A is after date B */
export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

// ─── Rate conversion ─────────────────────────────────────────────────────────

/** Convert annual rate to monthly: (1 + annual)^(1/12) - 1 */
export function anualParaMensal(taxaAnual: Decimal): Decimal {
  return taxaAnual.plus(1).pow(new Decimal(1).div(12)).minus(1);
}

/** Convert monthly rate to annual: (1 + monthly)^12 - 1 */
export function mensalParaAnual(taxaMensal: Decimal): Decimal {
  return taxaMensal.plus(1).pow(12).minus(1);
}

// ─── Key legal date constants ─────────────────────────────────────────────────

/** Lei 14.905/2024 — novo regime de correção monetária e juros civis */
export const LEI_14905_DATA = new Date(2024, 7, 30); // 30/08/2024
