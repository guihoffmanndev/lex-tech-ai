// src/lib/pdf/gerarExcel.ts
import * as XLSX from "xlsx";
import type { CalculoHistorico } from "@/hooks/useCalculoHistorico";
import {
  FIELD_LABELS,
  AREA_LABELS,
  getLegislacao,
  type PdfOpcoes,
} from "@/lib/pdf/gerarPdf";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();
}

const MONETARY_KEYS = /valor|total|liquido|bruto|salario|multa|juros|honorar|prestac|haveres|lucro|fgts|inss|irrf|debito|excede/i;

function isMonetary(key: string): boolean {
  return MONETARY_KEYS.test(key);
}

function toCell(key: string, raw: unknown): XLSX.CellObject {
  if (raw === null || raw === undefined) return { t: "s", v: "—" };
  if (typeof raw === "boolean") return { t: "s", v: raw ? "Sim" : "Não" };

  const str = String(raw);
  const num = parseFloat(str);

  if (!isNaN(num) && isFinite(num) && isMonetary(key)) {
    return { t: "n", v: num, z: 'R$ #.##0,00' };
  }
  if (!isNaN(num) && isFinite(num) && /^\d+(\.\d+)?$/.test(str) && str.length > 1) {
    return { t: "n", v: num };
  }
  return { t: "s", v: str };
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

// ─── Sheet builders ──────────────────────────────────────────────────────────

function buildResumoSheet(
  calculo: CalculoHistorico,
  opcoes: PdfOpcoes
): XLSX.WorkSheet {
  const rows: (string | XLSX.CellObject)[][] = [];
  const dataCalculo = new Date(calculo.created_at).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const area = AREA_LABELS[calculo.area] ?? calculo.area;
  const titulo = calculo.titulo ?? calculo.tipo;

  // Header info
  rows.push(["Lex — Calculadora Jurídica", ""]);
  rows.push([`${area} — ${titulo}`, ""]);
  rows.push(["Data do cálculo", dataCalculo]);
  if (opcoes.numeroProcesso) rows.push(["Processo", opcoes.numeroProcesso]);
  if (opcoes.partes)         rows.push(["Partes", opcoes.partes]);
  if (opcoes.tribunal)       rows.push(["Tribunal", opcoes.tribunal]);
  rows.push(["", ""]);

  // Inputs
  rows.push(["Dados de Entrada", ""]);
  rows.push(["Campo", "Valor"]);
  const skipKeys = new Set(["numeroProcesso", "clienteProcesso"]);
  for (const [k, v] of Object.entries(calculo.inputs_json)) {
    if (skipKeys.has(k)) continue;
    rows.push([labelFor(k), toCell(k, v)]);
  }
  rows.push(["", ""]);

  // Results
  rows.push(["Resultado", ""]);
  rows.push(["Campo", "Valor"]);
  for (const [k, v] of Object.entries(calculo.resultado_json)) {
    rows.push([labelFor(k), toCell(k, v)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [35, 25]);
  return ws;
}

function buildMemoriaSheet(calculo: CalculoHistorico): XLSX.WorkSheet {
  const steps = calculo.steps_json;

  if (!steps || steps.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([["Sem memória de cálculo disponível"]]);
    setColWidths(ws, [45]);
    return ws;
  }

  const firstStep = steps[0];

  if (typeof firstStep === "string") {
    // Array of strings — single column
    const rows: (string | XLSX.CellObject)[][] = [["#", "Descrição"]];
    (steps as string[]).forEach((s, i) => rows.push([String(i + 1), s]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    setColWidths(ws, [6, 55]);
    return ws;
  }

  // Array of objects — dynamic columns
  const obj = firstStep as Record<string, unknown>;
  const headers = Object.keys(obj);
  const rows: (string | XLSX.CellObject)[][] = [headers.map(labelFor)];
  for (const step of steps as Record<string, unknown>[]) {
    rows.push(headers.map((h) => toCell(h, step[h])));
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, headers.map(() => 20));
  return ws;
}

function buildLegislacaoSheet(calculo: CalculoHistorico): XLSX.WorkSheet {
  const leg = getLegislacao(calculo.area, calculo.tipo);
  const dataCalculo = new Date(calculo.created_at).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const rows = [
    ["Referências Legislativas"],
    [leg],
    [""],
    ["Aviso Legal"],
    [
      `Este documento foi gerado automaticamente pela plataforma Lex em ${dataCalculo} ` +
      "e tem caráter meramente informativo. Os valores apurados devem ser conferidos e " +
      "homologados pelo juízo competente. A Lex não se responsabiliza por divergências " +
      "decorrentes de atualizações legislativas ou de índices econômicos posteriores à data do cálculo.",
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [80]);
  return ws;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate and download an Excel workbook from a saved calculation record.
 * Uses SheetJS (xlsx) for in-browser workbook generation without a server.
 */
export function gerarExcel(calculo: CalculoHistorico, opcoes: PdfOpcoes = {}): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildResumoSheet(calculo, opcoes), "Resumo");
  XLSX.utils.book_append_sheet(wb, buildMemoriaSheet(calculo), "Memória de Cálculo");
  XLSX.utils.book_append_sheet(wb, buildLegislacaoSheet(calculo), "Legislação");

  const date = new Date(calculo.created_at).toISOString().slice(0, 10);
  const filename = `lex-${calculo.area}-${calculo.tipo}-${date}.xlsx`;

  XLSX.writeFile(wb, filename);
}
