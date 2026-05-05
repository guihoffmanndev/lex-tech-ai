import type { CalculoHistorico } from "@/hooks/useCalculoHistorico";

// ─── Labels ───────────────────────────────────────────────────────────────────

export const AREA_LABELS: Record<string, string> = {
  trabalhista: "Trabalhista",
  civel: "Cível",
  penal: "Penal",
  empresarial: "Empresarial",
  tributario: "Tributário",
};

export const FIELD_LABELS: Record<string, string> = {
  // Common
  valor: "Valor",
  valorPrincipal: "Valor principal",
  valorFinanciado: "Valor financiado",
  dataInicial: "Data inicial",
  dataFinal: "Data final",
  dataFato: "Data do fato",
  dataCalculo: "Data do cálculo",
  indice: "Índice de correção",
  tipoObrigacao: "Tipo de obrigação",
  // Trabalhista
  salario: "Salário",
  tipoDesligamento: "Tipo de desligamento",
  mesesTrabalhados: "Meses trabalhados",
  anosTrabalhados: "Anos trabalhados",
  feriasVencidas: "Férias vencidas",
  dataAdmissao: "Data de admissão",
  dataDemissao: "Data de demissão",
  horasExtrasSemanais: "Horas extras semanais",
  percentualHE: "Percentual HE",
  adicionalNoturno: "Adicional noturno",
  adicionalInsalubridade: "Adicional insalubridade",
  grauInsalubridade: "Grau de insalubridade",
  adicionalPericulosidade: "Adicional periculosidade",
  // Empresarial
  taxaMensal: "Taxa mensal (%)",
  prazoMeses: "Prazo (meses)",
  ativos: "Ativos",
  passivos: "Passivos",
  participacao: "Participação (%)",
  metodo: "Método de avaliação",
  faturamentoMensal: "Faturamento mensal",
  margemLiquida: "Margem líquida (%)",
  periodoMeses: "Período (meses)",
  // Tributário
  rbt12: "RBT12",
  receitaMes: "Receita do mês",
  folha12m: "Folha 12 meses",
  atividade: "Atividade",
  anexo: "Anexo",
  aliquota: "Alíquota (%)",
  valorOperacao: "Valor da operação",
  regime: "Regime tributário",
  lucro: "Lucro",
  // Penal
  penaMeses: "Pena (meses)",
  penaMin: "Pena mínima",
  penaMax: "Pena máxima",
  circunstancias: "Circunstâncias",
  reincidente: "Reincidente",
  hediondo: "Crime hediondo",
  dataCrime: "Data do crime",
  dataDenuncia: "Data da denúncia",
  // Results
  valorCorrigido: "Valor corrigido",
  totalJuros: "Total juros",
  totalPago: "Total pago",
  totalGeral: "Total geral",
  liquidoDevido: "Líquido devido",
  prestacaoInicial: "Prestação inicial",
  prestacaoFinal: "Prestação final",
  aliquotaEfetiva: "Alíquota efetiva",
  penaDosada: "Pena dosada",
  progressaoEm: "Progressão em",
};

const LEGISLACAO: Record<string, Record<string, string>> = {
  civel: {
    default:
      "CC/2002; CPC/2015; Lei 14.905/2024; Resolução CNJ 569/2022",
    correcao:
      "CC/2002 art. 395-406; Lei 14.905/2024; IPCA/SELIC (BCB)",
    cumprimento:
      "CPC/2015 arts. 523-527; multa 10% + honorários 10%",
    precatorio:
      "CF/88 art. 100; EC 62/2009; EC 114/2021; EC 136/2025",
  },
  trabalhista: {
    default:
      "CLT; Súmulas TST 172, 320, 331; Lei 13.467/2017; IPCA-E/SELIC (BCB)",
    rescisao:
      "CLT arts. 477-500; Lei 8.036/90 (FGTS); Decreto 99.684/90",
    horasextras:
      "CLT arts. 58-74; Súmula TST 172; CF/88 art. 7º, XVI",
    liquidacao:
      "CLT art. 879; TST RA 2017 (IPCA-E + SELIC); Lei 14.905/2024",
  },
  penal: {
    default:
      "CP arts. 59-68, 109-118; Lei 7.210/84 (LEP); Lei 13.964/2019 (Pacote Anticrime)",
    dosimetria:
      "CP arts. 59-68; Súmula STJ 231",
    progressao:
      "LEP arts. 112-115; Lei 13.964/2019",
    prescricao:
      "CP arts. 107-120; Súmulas STJ 438, 441",
  },
  empresarial: {
    default:
      "CC/2002 arts. 1.031-1.032; Lei 6.404/76; CPC/2015 art. 606",
    haveres:
      "CC/2002 arts. 1.031-1.032; CPC/2015 art. 606; RESOLUÇÃO CFC",
    amortizacao:
      "CC/2002 art. 406; SFN; BCB Circular 3.905/2018",
    lucros:
      "CC/2002 arts. 402-404; Súmula STJ 54",
  },
  tributario: {
    default:
      "CTN; LC 123/2006; LC 87/96 (ICMS); Lei 10.637/02; Lei 10.833/03; Lei 9.249/95; Lei 9.430/96",
    simples:
      "LC 123/2006; Resolução CGSN 140/2018",
    icms:
      "LC 87/96; Convênio ICMS; EC 87/2015 (DIFAL); EC 132/2023",
    piscofins:
      "Lei 10.637/02; Lei 10.833/03; RE 574.706 STF",
    irpj:
      "Lei 9.249/95; Lei 9.430/96; LC 224/2025",
  },
};

export interface PdfOpcoes {
  numeroProcesso?: string;
  partes?: string;
  tribunal?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatKey(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value.toLocaleString("pt-BR");
    return String(value);
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  const str = String(value);
  // Numeric string — try to format as currency if it looks like one
  if (/^\d+(\.\d+)?$/.test(str) && str.length > 2) {
    const n = parseFloat(str);
    if (!isNaN(n) && n >= 0.01)
      return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return str;
}

export function getLegislacao(area: string, tipo: string): string {
  const areaMap = LEGISLACAO[area];
  if (!areaMap) return "Legislação federal aplicável";
  return areaMap[tipo] ?? areaMap["default"] ?? "Legislação federal aplicável";
}

function buildTableRows(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) => `
      <tr>
        <td style="border:1px solid #ddd;padding:5px 8px;color:#555;width:42%;">${formatKey(k)}</td>
        <td style="border:1px solid #ddd;padding:5px 8px;font-weight:500;">${formatValue(v)}</td>
      </tr>`
    )
    .join("");
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate and download a PDF from a saved calculation record.
 * Uses html2pdf.js (already in package.json) to convert HTML to PDF.
 */
export async function gerarPdf(
  calculo: CalculoHistorico,
  opcoes: PdfOpcoes = {}
): Promise<void> {
  // Dynamic import to avoid bundling issues in SSR/test environments
  const html2pdf = (await import("html2pdf.js")).default;

  const dataCalculo = new Date(calculo.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const areaLabel = AREA_LABELS[calculo.area] ?? calculo.area;
  const legislacao = getLegislacao(calculo.area, calculo.tipo);
  const titulo = calculo.titulo ?? calculo.tipo;

  const stepsHtml =
    calculo.steps_json && calculo.steps_json.length > 0
      ? `<h2 style="font-size:13px;margin:16px 0 6px;color:#1a1a1a;">Memória de cálculo</h2>
         <div style="font-size:10px;line-height:1.6;color:#333;background:#f9f9f9;border:1px solid #eee;padding:8px 10px;border-radius:4px;">
           ${(calculo.steps_json as string[])
             .map((s, i) => `<p style="margin:1px 0;">${i + 1}. ${String(s)}</p>`)
             .join("")}
         </div>`
      : "";

  const processoHtml = [
    opcoes.numeroProcesso
      ? `<p style="margin:2px 0;font-size:11px;"><strong>Processo:</strong> ${opcoes.numeroProcesso}</p>`
      : "",
    opcoes.partes
      ? `<p style="margin:2px 0;font-size:11px;"><strong>Partes:</strong> ${opcoes.partes}</p>`
      : "",
    opcoes.tribunal
      ? `<p style="margin:2px 0;font-size:11px;"><strong>Tribunal:</strong> ${opcoes.tribunal}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#1a1a1a;max-width:700px;margin:0 auto;">

  <!-- Header -->
  <div style="border-bottom:2px solid #1a1a1a;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1 style="font-size:16px;margin:0 0 2px;font-weight:700;letter-spacing:.3px;">Lex — Calculadora Jurídica</h1>
      <p style="font-size:12px;color:#555;margin:0;">${areaLabel} &mdash; ${titulo}</p>
      ${processoHtml}
    </div>
    <div style="text-align:right;font-size:10px;color:#888;">
      <p style="margin:0;">Data do cálculo:</p>
      <p style="margin:0;font-weight:600;color:#444;">${dataCalculo}</p>
    </div>
  </div>

  <!-- Inputs -->
  <h2 style="font-size:13px;margin:0 0 6px;color:#1a1a1a;">Dados de entrada</h2>
  <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px;">
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="border:1px solid #ddd;padding:5px 8px;text-align:left;width:42%;font-weight:600;">Campo</th>
        <th style="border:1px solid #ddd;padding:5px 8px;text-align:left;font-weight:600;">Valor</th>
      </tr>
    </thead>
    <tbody>${buildTableRows(calculo.inputs_json)}</tbody>
  </table>

  <!-- Result -->
  <h2 style="font-size:13px;margin:0 0 6px;color:#1a1a1a;">Resultado</h2>
  <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px;">
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="border:1px solid #ddd;padding:5px 8px;text-align:left;width:42%;font-weight:600;">Campo</th>
        <th style="border:1px solid #ddd;padding:5px 8px;text-align:left;font-weight:600;">Valor</th>
      </tr>
    </thead>
    <tbody>${buildTableRows(calculo.resultado_json)}</tbody>
  </table>

  ${stepsHtml}

  <!-- Footer -->
  <div style="border-top:1px solid #ccc;margin-top:20px;padding-top:10px;font-size:9px;color:#888;line-height:1.5;">
    <p style="margin:0 0 3px;"><strong style="color:#666;">Referências legislativas:</strong> ${legislacao}</p>
    <p style="margin:0;font-style:italic;">Este documento foi gerado automaticamente pela plataforma Lex em ${dataCalculo} e tem caráter meramente informativo. Os valores apurados devem ser conferidos e homologados pelo juízo competente. A Lex não se responsabiliza por divergências decorrentes de atualizações legislativas ou de índices econômicos posteriores à data do cálculo.</p>
  </div>

</div>`;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  wrapper.style.position = "absolute";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  document.body.appendChild(wrapper);

  const filename = `lex-${calculo.area}-${calculo.tipo}-${new Date(calculo.created_at).toISOString().slice(0, 10)}.pdf`;

  try {
    await html2pdf()
      .from(wrapper.firstElementChild as HTMLElement)
      .set({
        margin: [12, 12, 12, 12],
        filename,
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
}
