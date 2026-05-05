import Decimal from "decimal.js";
import { roundMoney } from "./engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnexoSimples = "I" | "II" | "III" | "IV" | "V";

export interface FaixaSimples {
  limiteMax: number; // limite superior da faixa (Infinity para última)
  aliquotaNominal: Decimal; // em decimal (ex: 0.04 para 4%)
  deducao: Decimal; // em R$
}

export interface ResultadoSimplesNacional {
  anexo: AnexoSimples;
  faixaNumero: number;
  rbt12: Decimal;
  receitaMes: Decimal;
  aliquotaNominal: Decimal;
  deducao: Decimal;
  aliquotaEfetiva: Decimal; // em decimal
  aliquotaEfetivaPct: Decimal; // em %
  dasMensal: Decimal;
  fatorR: Decimal | null; // só para serviços (Anexo III/V)
  legislacao: string;
}

export interface ResultadoIcms {
  valorOperacao: Decimal;
  aliquota: Decimal; // em decimal
  baseCalculo: Decimal; // "por dentro"
  icms: Decimal;
  legislacao: string;
}

export interface ResultadoIcmsST {
  valorProduto: Decimal;
  mva: Decimal; // em decimal
  mvaAjustada: Decimal | null;
  baseCalculoST: Decimal;
  aliquotaST: Decimal;
  icmsOperacaoPropria: Decimal;
  icmsST: Decimal;
  totalST: Decimal;
  legislacao: string;
}

export interface ResultadoDifal {
  baseCalculo: Decimal;
  aliquotaInterna: Decimal;
  aliquotaInterestadual: Decimal;
  difal: Decimal;
  fecop: Decimal; // Fundo Estadual de Combate à Pobreza (quando aplicável)
  legislacao: string;
}

export interface ResultadoPisCofins {
  faturamento: Decimal;
  regime: "cumulativo" | "nao-cumulativo";
  icmsExcluido: Decimal;
  baseCalculo: Decimal;
  pis: Decimal;
  cofins: Decimal;
  total: Decimal;
  legislacao: string;
}

export interface ResultadoIrpjCsll {
  lucro: Decimal;
  regime: "real" | "presumido";
  atividade?: string;
  percentualPresuncao: Decimal;
  baseIrpj: Decimal;
  irpjAliquota: Decimal;
  irpjAdicional: Decimal;
  irpjTotal: Decimal;
  baseCsll: Decimal;
  csll: Decimal;
  tributacaoTotal: Decimal;
  legislacao: string;
}

export interface ResultadoItbi {
  valorVenal: Decimal;
  valorTransacao: Decimal;
  baseCalculo: Decimal;
  aliquota: Decimal;
  itbi: Decimal;
  isento: boolean;
  legislacao: string;
}

export interface ResultadoItcmd {
  valorBem: Decimal;
  estado: string;
  tipo: "doacao" | "heranca";
  aliquota: Decimal;
  itcmd: Decimal;
  legislacao: string;
}

export interface ResultadoTributosAtraso {
  tributo: string;
  valorOriginal: Decimal;
  diasAtraso: number;
  multaMora: Decimal; // máx 20%
  selic: Decimal; // acumulada no período
  multoMesCalculo: Decimal; // 1% do mês de pagamento
  totalAcrescimos: Decimal;
  totalPagar: Decimal;
  legislacao: string;
}

export interface ResultadoInssPatronal {
  folhaBruta: Decimal;
  rat: Decimal; // RAT ajustado pelo FAP
  terceiros: Decimal; // % Sistema S
  inss20pct: Decimal;
  ratTotal: Decimal;
  terceirosTotal: Decimal;
  totalPatronal: Decimal;
  legislacao: string;
}

// ─── Tabelas Simples Nacional (LC 123/2006 — vigência 2018+) ─────────────────

const TABELA_SIMPLES: Record<AnexoSimples, FaixaSimples[]> = {
  I: [
    { limiteMax: 180_000, aliquotaNominal: new Decimal("0.04"), deducao: new Decimal(0) },
    { limiteMax: 360_000, aliquotaNominal: new Decimal("0.073"), deducao: new Decimal(5_940) },
    { limiteMax: 720_000, aliquotaNominal: new Decimal("0.095"), deducao: new Decimal(13_860) },
    { limiteMax: 1_800_000, aliquotaNominal: new Decimal("0.107"), deducao: new Decimal(22_500) },
    { limiteMax: 3_600_000, aliquotaNominal: new Decimal("0.143"), deducao: new Decimal(87_300) },
    { limiteMax: 4_800_000, aliquotaNominal: new Decimal("0.19"), deducao: new Decimal(378_000) },
  ],
  II: [
    { limiteMax: 180_000, aliquotaNominal: new Decimal("0.045"), deducao: new Decimal(0) },
    { limiteMax: 360_000, aliquotaNominal: new Decimal("0.078"), deducao: new Decimal(5_940) },
    { limiteMax: 720_000, aliquotaNominal: new Decimal("0.10"), deducao: new Decimal(13_860) },
    { limiteMax: 1_800_000, aliquotaNominal: new Decimal("0.112"), deducao: new Decimal(22_500) },
    { limiteMax: 3_600_000, aliquotaNominal: new Decimal("0.147"), deducao: new Decimal(85_500) },
    { limiteMax: 4_800_000, aliquotaNominal: new Decimal("0.30"), deducao: new Decimal(720_000) },
  ],
  III: [
    { limiteMax: 180_000, aliquotaNominal: new Decimal("0.06"), deducao: new Decimal(0) },
    { limiteMax: 360_000, aliquotaNominal: new Decimal("0.112"), deducao: new Decimal(9_360) },
    { limiteMax: 720_000, aliquotaNominal: new Decimal("0.135"), deducao: new Decimal(17_640) },
    { limiteMax: 1_800_000, aliquotaNominal: new Decimal("0.16"), deducao: new Decimal(35_640) },
    { limiteMax: 3_600_000, aliquotaNominal: new Decimal("0.21"), deducao: new Decimal(125_640) },
    { limiteMax: 4_800_000, aliquotaNominal: new Decimal("0.33"), deducao: new Decimal(648_000) },
  ],
  IV: [
    { limiteMax: 180_000, aliquotaNominal: new Decimal("0.045"), deducao: new Decimal(0) },
    { limiteMax: 360_000, aliquotaNominal: new Decimal("0.09"), deducao: new Decimal(8_100) },
    { limiteMax: 720_000, aliquotaNominal: new Decimal("0.102"), deducao: new Decimal(12_420) },
    { limiteMax: 1_800_000, aliquotaNominal: new Decimal("0.14"), deducao: new Decimal(39_780) },
    { limiteMax: 3_600_000, aliquotaNominal: new Decimal("0.22"), deducao: new Decimal(183_780) },
    { limiteMax: 4_800_000, aliquotaNominal: new Decimal("0.33"), deducao: new Decimal(828_000) },
  ],
  V: [
    { limiteMax: 180_000, aliquotaNominal: new Decimal("0.155"), deducao: new Decimal(0) },
    { limiteMax: 360_000, aliquotaNominal: new Decimal("0.18"), deducao: new Decimal(4_500) },
    { limiteMax: 720_000, aliquotaNominal: new Decimal("0.195"), deducao: new Decimal(9_900) },
    { limiteMax: 1_800_000, aliquotaNominal: new Decimal("0.205"), deducao: new Decimal(17_100) },
    { limiteMax: 3_600_000, aliquotaNominal: new Decimal("0.23"), deducao: new Decimal(62_100) },
    { limiteMax: 4_800_000, aliquotaNominal: new Decimal("0.305"), deducao: new Decimal(540_000) },
  ],
};

// ─── Simples Nacional ─────────────────────────────────────────────────────────

/**
 * Calcula o DAS do Simples Nacional.
 *
 * Fórmula: Alíquota Efetiva = (RBT12 × Alíq_Nominal − Dedução) / RBT12
 * DAS = Receita_Mês × Alíquota_Efetiva
 *
 * Para serviços do Anexo III/V: Fator R = Folha12m / RBT12
 *   ≥ 28% → Anexo III | < 28% → Anexo V
 *
 * @param rbt12 - Receita bruta dos últimos 12 meses
 * @param receitaMes - Receita bruta do mês de competência
 * @param anexo - Anexo I a V (para serviços com Fator R, informe o anexo resultante)
 * @param folha12m - Folha salarial 12 meses (apenas para serviços Anexo III/V)
 */
export function simplesNacional(
  rbt12: Decimal,
  receitaMes: Decimal,
  anexo: AnexoSimples,
  folha12m?: Decimal
): ResultadoSimplesNacional {
  const tabela = TABELA_SIMPLES[anexo];

  // Determina faixa pelo RBT12
  let faixaIdx = tabela.findIndex((f) => rbt12.lte(f.limiteMax));
  if (faixaIdx === -1) faixaIdx = tabela.length - 1; // última faixa

  const faixa = tabela[faixaIdx];

  // Fórmula oficial: (RBT12 × Alíq_Nominal − Dedução) / RBT12
  const numerador = rbt12.times(faixa.aliquotaNominal).minus(faixa.deducao);
  const aliquotaEfetiva = numerador.div(rbt12);
  const aliquotaEfetivaPct = aliquotaEfetiva.times(100);
  const dasMensal = roundMoney(receitaMes.times(aliquotaEfetiva));

  // Fator R apenas para Anexo III/V
  let fatorR: Decimal | null = null;
  if ((anexo === "III" || anexo === "V") && folha12m) {
    fatorR = folha12m.div(rbt12);
  }

  return {
    anexo,
    faixaNumero: faixaIdx + 1,
    rbt12,
    receitaMes,
    aliquotaNominal: faixa.aliquotaNominal.times(100),
    deducao: faixa.deducao,
    aliquotaEfetiva,
    aliquotaEfetivaPct: aliquotaEfetivaPct.toDecimalPlaces(4),
    dasMensal,
    fatorR,
    legislacao: "LC 123/2006 — Simples Nacional, tabela vigente desde jan/2018",
  };
}

/**
 * Calcula o Fator R e retorna o anexo correto para serviços.
 *
 * Fator R = Folha dos últimos 12 meses / RBT12
 *   ≥ 28% → Anexo III
 *   < 28% → Anexo V
 */
export function calcularFatorR(
  rbt12: Decimal,
  folha12m: Decimal
): { fatorR: Decimal; anexoResultante: "III" | "V" } {
  const fatorR = folha12m.div(rbt12);
  const anexoResultante: "III" | "V" = fatorR.gte("0.28") ? "III" : "V";
  return { fatorR, anexoResultante };
}

/**
 * Retorna comparativo entre os 5 anexos para a mesma RBT12 e receita mês.
 */
export function comparativoAnexos(
  rbt12: Decimal,
  receitaMes: Decimal
): ResultadoSimplesNacional[] {
  return (["I", "II", "III", "IV", "V"] as AnexoSimples[]).map((a) =>
    simplesNacional(rbt12, receitaMes, a)
  );
}

// ─── ICMS ─────────────────────────────────────────────────────────────────────

/**
 * Calcula ICMS "por dentro" (a base de cálculo inclui o próprio imposto).
 *
 * BC = Valor da Operação / (1 − alíquota)
 * ICMS = BC × alíquota
 *
 * @param valorOperacao - Valor do produto/serviço sem ICMS embutido
 * @param aliquotaPct - Alíquota em % (ex: 12 para 12%)
 */
export function icms(
  valorOperacao: Decimal,
  aliquotaPct: Decimal
): ResultadoIcms {
  const aliquota = aliquotaPct.div(100);
  const baseCalculo = roundMoney(valorOperacao.div(new Decimal(1).minus(aliquota)));
  const icmsVal = roundMoney(baseCalculo.times(aliquota));

  return {
    valorOperacao,
    aliquota,
    baseCalculo,
    icms: icmsVal,
    legislacao: "Art. 13 § 1º LC 87/1996 — ICMS calculado 'por dentro'",
  };
}

/**
 * Calcula ICMS-ST (Substituição Tributária) com MVA.
 *
 * BC-ST = (Valor Produto + IPI + Frete + outras despesas) × (1 + MVA)
 * ICMS-ST = (BC-ST × Alíq_Interna) − ICMS_Operação_Própria
 *
 * MVA Ajustada (para operações interestaduais):
 *   MVAaj = [(1 + MVA) × (1 − aliqInterest)] / (1 − aliqInterna) − 1
 *
 * @param valorProduto - Valor do produto
 * @param mvaPct - MVA em % (ex: 40 para 40%)
 * @param aliquotaInternaPct - Alíquota interna do estado destinatário em %
 * @param aliquotaInterestadualPct - Alíquota interestadual (7% ou 12%) — null se intra-estadual
 * @param despesasAcessorias - IPI, frete, seguro etc.
 */
export function icmsST(
  valorProduto: Decimal,
  mvaPct: Decimal,
  aliquotaInternaPct: Decimal,
  aliquotaInterestadualPct?: Decimal,
  despesasAcessorias: Decimal = new Decimal(0)
): ResultadoIcmsST {
  const mva = mvaPct.div(100);
  const aliqInterna = aliquotaInternaPct.div(100);

  let mvaAjustada: Decimal | null = null;
  let aliqOperacaoPropria = aliqInterna;

  if (aliquotaInterestadualPct) {
    const aliqInterest = aliquotaInterestadualPct.div(100);
    aliqOperacaoPropria = aliqInterest;
    // MVA Ajustada
    mvaAjustada = new Decimal(1)
      .plus(mva)
      .times(new Decimal(1).minus(aliqInterest))
      .div(new Decimal(1).minus(aliqInterna))
      .minus(1);
  }

  const mvaUsada = mvaAjustada ?? mva;
  const baseTotal = valorProduto.plus(despesasAcessorias);
  const baseCalculoST = roundMoney(baseTotal.times(new Decimal(1).plus(mvaUsada)));
  const icmsOperacaoPropria = roundMoney(baseTotal.times(aliqOperacaoPropria));
  const icmsSTVal = roundMoney(baseCalculoST.times(aliqInterna).minus(icmsOperacaoPropria));
  const totalST = roundMoney(baseTotal.plus(icmsSTVal));

  return {
    valorProduto,
    mva: mva.times(100),
    mvaAjustada: mvaAjustada ? mvaAjustada.times(100).toDecimalPlaces(4) : null,
    baseCalculoST,
    aliquotaST: aliquotaInternaPct,
    icmsOperacaoPropria,
    icmsST: icmsSTVal,
    totalST,
    legislacao: "Convênio ICMS 142/2018 — Substituição Tributária, MVA ajustada para interestaduais",
  };
}

/**
 * Calcula DIFAL — Diferencial de Alíquota (EC 87/2015 / LC 190/2022).
 *
 * DIFAL = BC × (Alíq_Interna − Alíq_Interestadual)
 *
 * @param baseCalculo - Base de cálculo da operação
 * @param aliquotaInternaPct - Alíquota interna do estado destinatário em %
 * @param aliquotaInterestadualPct - Alíquota interestadual praticada em %
 * @param fecopPct - Alíquota do FECOP (Fundo de Combate à Pobreza) em %
 */
export function difal(
  baseCalculo: Decimal,
  aliquotaInternaPct: Decimal,
  aliquotaInterestadualPct: Decimal,
  fecopPct: Decimal = new Decimal(0)
): ResultadoDifal {
  const aliqInterna = aliquotaInternaPct.div(100);
  const aliqInterest = aliquotaInterestadualPct.div(100);
  const fecopRate = fecopPct.div(100);

  const difalVal = roundMoney(baseCalculo.times(aliqInterna.minus(aliqInterest)));
  const fecopVal = roundMoney(baseCalculo.times(fecopRate));

  return {
    baseCalculo,
    aliquotaInterna: aliquotaInternaPct,
    aliquotaInterestadual: aliquotaInterestadualPct,
    difal: difalVal,
    fecop: fecopVal,
    legislacao: "EC 87/2015 c/c LC 190/2022 — DIFAL para operações interestaduais",
  };
}

// ─── PIS/COFINS ───────────────────────────────────────────────────────────────

/**
 * Calcula PIS e COFINS.
 *
 * Regime cumulativo (Lucro Presumido / Simples exceto Anexo I/II):
 *   PIS: 0,65% | COFINS: 3,00%
 *
 * Regime não-cumulativo (Lucro Real):
 *   PIS: 1,65% | COFINS: 7,60%
 *
 * Exclusão do ICMS da base (RE 574.706 — Tema 69 STF):
 *   Base = Faturamento − ICMS destacado na NF
 *
 * @param faturamento - Receita bruta do período
 * @param regime - "cumulativo" ou "nao-cumulativo"
 * @param icmsNf - ICMS destacado na nota fiscal (para exclusão RE 574.706)
 */
export function pisCofins(
  faturamento: Decimal,
  regime: "cumulativo" | "nao-cumulativo",
  icmsNf: Decimal = new Decimal(0)
): ResultadoPisCofins {
  const icmsExcluido = icmsNf;
  const baseCalculo = roundMoney(faturamento.minus(icmsExcluido));

  let aliqPis: Decimal;
  let aliqCofins: Decimal;

  if (regime === "cumulativo") {
    aliqPis = new Decimal("0.0065");
    aliqCofins = new Decimal("0.03");
  } else {
    aliqPis = new Decimal("0.0165");
    aliqCofins = new Decimal("0.076");
  }

  const pisVal = roundMoney(baseCalculo.times(aliqPis));
  const cofinsVal = roundMoney(baseCalculo.times(aliqCofins));
  const total = roundMoney(pisVal.plus(cofinsVal));

  return {
    faturamento,
    regime,
    icmsExcluido,
    baseCalculo,
    pis: pisVal,
    cofins: cofinsVal,
    total,
    legislacao:
      regime === "cumulativo"
        ? "Lei 9.718/1998 — PIS/COFINS cumulativo; RE 574.706 (exclusão ICMS)"
        : "Lei 10.637/2002 e 10.833/2003 — PIS/COFINS não-cumulativo; RE 574.706 (exclusão ICMS)",
  };
}

// ─── IRPJ / CSLL ─────────────────────────────────────────────────────────────

/**
 * Percentuais de presunção do Lucro Presumido por atividade (art. 15 Lei 9.249/1995).
 */
export const PERCENTUAIS_PRESUNCAO: Record<string, { irpj: number; csll: number; label: string }> = {
  comercio: { irpj: 8, csll: 12, label: "Comércio / Indústria" },
  servicos_geral: { irpj: 32, csll: 32, label: "Prestação de Serviços em Geral" },
  servicos_transporte: { irpj: 16, csll: 12, label: "Transportadora (cargas)" },
  servicos_transporte_passageiros: { irpj: 16, csll: 12, label: "Transportadora (passageiros)" },
  financeiras: { irpj: 32, csll: 32, label: "Financeiras / Bancos" },
  construcao: { irpj: 8, csll: 12, label: "Construção Civil (empreitada material)" },
  construcao_mao_obra: { irpj: 32, csll: 32, label: "Construção Civil (somente mão de obra)" },
  hospitais: { irpj: 8, csll: 12, label: "Hospitais e Clínicas" },
  rural: { irpj: 8, csll: 12, label: "Atividade Rural" },
};

/**
 * Calcula IRPJ e CSLL.
 *
 * Lucro Real:
 *   IRPJ = Lucro × 15% + (max(Lucro − 20.000, 0) × 10%)  [adicional]
 *   CSLL = Lucro × 9%
 *
 * Lucro Presumido:
 *   Base IRPJ = Faturamento × % Presunção
 *   IRPJ = Base × 15% + adicional
 *   Base CSLL = Faturamento × % Presunção CSLL
 *   CSLL = Base × 9%
 *
 * @param lucroOuFaturamento - Lucro (Lucro Real) ou Faturamento (Lucro Presumido)
 * @param regime - "real" ou "presumido"
 * @param atividade - Chave de PERCENTUAIS_PRESUNCAO (apenas Lucro Presumido)
 */
export function irpjCsll(
  lucroOuFaturamento: Decimal,
  regime: "real" | "presumido",
  atividade: string = "servicos_geral"
): ResultadoIrpjCsll {
  const LIMITE_ADICIONAL = new Decimal(20_000); // R$20.000/mês para adicional 10%
  const ALIQ_IRPJ = new Decimal("0.15");
  const ALIQ_ADICIONAL = new Decimal("0.10");
  const ALIQ_CSLL = new Decimal("0.09");

  const presuncao = PERCENTUAIS_PRESUNCAO[atividade] ?? PERCENTUAIS_PRESUNCAO["servicos_geral"];
  const pctIrpj = new Decimal(presuncao.irpj).div(100);
  const pctCsll = new Decimal(presuncao.csll).div(100);

  let baseIrpj: Decimal;
  let baseCsll: Decimal;
  let percentualPresuncao: Decimal;

  if (regime === "real") {
    baseIrpj = lucroOuFaturamento;
    baseCsll = lucroOuFaturamento;
    percentualPresuncao = new Decimal(100);
  } else {
    baseIrpj = roundMoney(lucroOuFaturamento.times(pctIrpj));
    baseCsll = roundMoney(lucroOuFaturamento.times(pctCsll));
    percentualPresuncao = new Decimal(presuncao.irpj);
  }

  const irpjAliquota = roundMoney(baseIrpj.times(ALIQ_IRPJ));
  const excedente = Decimal.max(new Decimal(0), baseIrpj.minus(LIMITE_ADICIONAL));
  const irpjAdicional = roundMoney(excedente.times(ALIQ_ADICIONAL));
  const irpjTotal = roundMoney(irpjAliquota.plus(irpjAdicional));
  const csll = roundMoney(baseCsll.times(ALIQ_CSLL));
  const tributacaoTotal = roundMoney(irpjTotal.plus(csll));

  return {
    lucro: lucroOuFaturamento,
    regime,
    atividade,
    percentualPresuncao,
    baseIrpj,
    irpjAliquota,
    irpjAdicional,
    irpjTotal,
    baseCsll,
    csll,
    tributacaoTotal,
    legislacao:
      regime === "real"
        ? "Decreto 9.580/2018 (RIR) — Lucro Real: IRPJ 15% + adicional 10%; CSLL 9%"
        : "Lei 9.249/1995 art. 15/16 — Lucro Presumido: percentuais de presunção por atividade",
  };
}

// ─── ITBI ─────────────────────────────────────────────────────────────────────

/**
 * Calcula ITBI (Imposto de Transmissão de Bens Imóveis).
 *
 * Base = maior valor entre: valor venal (IPTU) e valor da transação.
 * Imunidade: financiamentos SFH (até limite legal — imunidade parcial).
 *
 * @param valorVenal - Valor venal do imóvel (base IPTU)
 * @param valorTransacao - Valor da compra e venda / escritura
 * @param aliquotaPct - Alíquota municipal em % (típico: 2% a 3%)
 */
export function itbi(
  valorVenal: Decimal,
  valorTransacao: Decimal,
  aliquotaPct: Decimal
): ResultadoItbi {
  const baseCalculo = Decimal.max(valorVenal, valorTransacao);
  const aliquota = aliquotaPct.div(100);
  const itbiVal = roundMoney(baseCalculo.times(aliquota));

  return {
    valorVenal,
    valorTransacao,
    baseCalculo,
    aliquota: aliquotaPct,
    itbi: itbiVal,
    isento: false,
    legislacao: "Art. 156 II CF/1988 c/c Tema 1.113 STJ — base = maior valor (venal ou transação)",
  };
}

// ─── ITCMD ────────────────────────────────────────────────────────────────────

/**
 * Alíquotas ITCMD por estado (progressivas onde aplicável — EC 132/2023).
 * Simplificado: alíquota única representativa por estado.
 */
const ALIQUOTAS_ITCMD: Record<string, { doacao: number; heranca: number }> = {
  SP: { doacao: 4, heranca: 4 },
  RJ: { doacao: 8, heranca: 8 },
  MG: { doacao: 5, heranca: 5 },
  RS: { doacao: 4, heranca: 6 },
  PR: { doacao: 4, heranca: 4 },
  SC: { doacao: 1, heranca: 1 },
  BA: { doacao: 8, heranca: 8 },
  GO: { doacao: 2, heranca: 2 },
  PE: { doacao: 8, heranca: 8 },
  CE: { doacao: 8, heranca: 8 },
  DF: { doacao: 4, heranca: 6 },
  AM: { doacao: 2, heranca: 2 },
  PA: { doacao: 2, heranca: 2 },
  MT: { doacao: 2, heranca: 2 },
  MS: { doacao: 6, heranca: 6 },
  ES: { doacao: 4, heranca: 4 },
  MA: { doacao: 1, heranca: 1 },
  PI: { doacao: 4, heranca: 4 },
  RN: { doacao: 3, heranca: 3 },
  AL: { doacao: 2, heranca: 4 },
  SE: { doacao: 8, heranca: 8 },
  PB: { doacao: 2, heranca: 4 },
  TO: { doacao: 2, heranca: 2 },
  RO: { doacao: 4, heranca: 4 },
  AC: { doacao: 2, heranca: 4 },
  AP: { doacao: 4, heranca: 4 },
  RR: { doacao: 4, heranca: 4 },
};

/**
 * Calcula ITCMD (Imposto de Transmissão Causa Mortis e Doação).
 *
 * @param valorBem - Valor do bem transmitido
 * @param estado - Sigla do estado (ex: "SP", "RJ")
 * @param tipo - "doacao" ou "heranca"
 */
export function itcmd(
  valorBem: Decimal,
  estado: string,
  tipo: "doacao" | "heranca"
): ResultadoItcmd {
  const aliquotas = ALIQUOTAS_ITCMD[estado.toUpperCase()] ?? { doacao: 4, heranca: 4 };
  const aliquotaPct = new Decimal(aliquotas[tipo]);
  const aliquota = aliquotaPct.div(100);
  const itcmdVal = roundMoney(valorBem.times(aliquota));

  return {
    valorBem,
    estado: estado.toUpperCase(),
    tipo,
    aliquota: aliquotaPct,
    itcmd: itcmdVal,
    legislacao: `Art. 155 I CF/1988 — ITCMD ${estado.toUpperCase()} ${aliquotaPct}% (${tipo}); progressividade prevista EC 132/2023`,
  };
}

// ─── Tributos em Atraso ───────────────────────────────────────────────────────

/**
 * Calcula acréscimos em tributos pagos em atraso (art. 61 Lei 9.430/1996).
 *
 * Multa de mora: 0,33% por dia (cap 20%)
 * Juros: SELIC acumulada desde o mês seguinte ao vencimento
 * Multa do mês de pagamento: 1%
 *
 * @param tributo - Nome do tributo
 * @param valorOriginal - Valor do tributo sem acréscimos
 * @param diasAtraso - Dias de atraso no pagamento
 * @param selicAcumuladaPct - SELIC acumulada no período em % (informada pelo usuário)
 */
export function tributosEmAtraso(
  tributo: string,
  valorOriginal: Decimal,
  diasAtraso: number,
  selicAcumuladaPct: Decimal
): ResultadoTributosAtraso {
  const TAXA_MORA_DIA = new Decimal("0.0033"); // 0,33% ao dia
  const CAP_MULTA = new Decimal("0.20"); // cap 20%
  const MULTA_MES_PAGAMENTO = new Decimal("0.01"); // 1%

  // Multa de mora: 0,33%/dia, máximo 20%
  const multaMoraRaw = TAXA_MORA_DIA.times(diasAtraso);
  const multaMoraPct = Decimal.min(multaMoraRaw, CAP_MULTA);
  const multaMoraVal = roundMoney(valorOriginal.times(multaMoraPct));

  // SELIC acumulada no período
  const selicVal = roundMoney(valorOriginal.times(selicAcumuladaPct.div(100)));

  // 1% do mês de pagamento
  const multoMesVal = roundMoney(valorOriginal.times(MULTA_MES_PAGAMENTO));

  const totalAcrescimos = roundMoney(multaMoraVal.plus(selicVal).plus(multoMesVal));
  const totalPagar = roundMoney(valorOriginal.plus(totalAcrescimos));

  return {
    tributo,
    valorOriginal,
    diasAtraso,
    multaMora: multaMoraVal,
    selic: selicVal,
    multoMesCalculo: multoMesVal,
    totalAcrescimos,
    totalPagar,
    legislacao: "Art. 61 Lei 9.430/1996 — multa mora 0,33%/dia (cap 20%) + SELIC + 1% mês pagamento",
  };
}

// ─── INSS Patronal ────────────────────────────────────────────────────────────

/**
 * Calcula contribuição previdenciária patronal.
 *
 * Contribuição Patronal: 20% sobre folha bruta
 * RAT (Risco Ambiental do Trabalho): 1%, 2% ou 3% × FAP (0,5 a 2,0)
 * Sistema S (Terceiros): ~5,8% (varia por atividade)
 *
 * @param folhaBruta - Folha salarial bruta do período
 * @param ratPct - RAT ajustado (RAT × FAP) em % (ex: 2 para 2%)
 * @param terceirosPct - % de contribuição ao Sistema S (ex: 5.8)
 */
export function inssPatronal(
  folhaBruta: Decimal,
  ratPct: Decimal,
  terceirosPct: Decimal
): ResultadoInssPatronal {
  const ALIQ_PATRONAL = new Decimal("0.20");

  const inss20 = roundMoney(folhaBruta.times(ALIQ_PATRONAL));
  const ratTotal = roundMoney(folhaBruta.times(ratPct.div(100)));
  const terceirosTotal = roundMoney(folhaBruta.times(terceirosPct.div(100)));
  const totalPatronal = roundMoney(inss20.plus(ratTotal).plus(terceirosTotal));

  return {
    folhaBruta,
    rat: ratPct,
    terceiros: terceirosPct,
    inss20pct: inss20,
    ratTotal,
    terceirosTotal,
    totalPatronal,
    legislacao: "Art. 22 Lei 8.212/1991 — contribuição patronal 20% + RAT×FAP + Sistema S",
  };
}
