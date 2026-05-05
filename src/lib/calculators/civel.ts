import Decimal from "decimal.js";
import {
  diasCorridos,
  roundMoney,
  LEI_14905_DATA,
  firstDayOfMonth,
  addMonths,
  isBefore,
  isAfter,
} from "./engine";
import { fetchIndices, type NomeIndice } from "./indices";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TipoObrigacao = "civil" | "fazenda" | "consumerista" | "alimentar";

export interface DetalheMes {
  mes: string;        // "Jan/2020"
  dataRef: string;    // "2020-01"
  taxaMes: Decimal;   // ex: 0.21 (% mensal)
  fatorMes: Decimal;  // ex: 1.002100
  fatorAcumulado: Decimal; // produto até este mês
  valorBase: Decimal; // valor no início do mês
}

export interface ResultadoCorrecao {
  valorOriginal: Decimal;
  fatorCorrecao: Decimal;
  valorCorrigido: Decimal;
  juros: Decimal;
  total: Decimal;
  regimeJuros: "pre-14905" | "post-14905" | "misto";
  legislacao: string;
  detalhes: DetalheMes[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nomeMes(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function dataRefStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function legislacaoLabel(indice: NomeIndice, regime: ResultadoCorrecao["regimeJuros"]): string {
  const base = `${indice} — `;
  if (regime === "post-14905") return base + "art. 406 CC c/c Lei 14.905/2024";
  if (regime === "pre-14905") return base + "art. 406 CC (anterior à Lei 14.905/2024)";
  return base + "regime misto (pre e pós Lei 14.905/2024)";
}

// ─── Core: Correção Monetária ─────────────────────────────────────────────────

/**
 * Corrige monetariamente um valor pelo índice informado no período.
 * Usa registros mensais do Supabase (indices_economicos).
 *
 * @param valor - Valor a corrigir (Decimal)
 * @param dataInicial - Primeiro dia do mês de referência
 * @param dataFinal - Data-base do cálculo
 * @param indice - Índice de correção
 * @param incluirJuros - Se deve calcular juros de mora
 * @param tipoObrigacao - Define taxa de juros (1%/0,5% a.m.)
 */
export async function correcaoMonetaria(
  valor: Decimal,
  dataInicial: Date,
  dataFinal: Date,
  indice: NomeIndice,
  incluirJuros = false,
  tipoObrigacao: TipoObrigacao = "civil"
): Promise<ResultadoCorrecao> {
  // Fetch indices from Supabase
  const registros = await fetchIndices(indice, dataInicial, dataFinal);

  if (registros.length === 0) {
    throw new Error(
      `Nenhum registro do índice ${indice} encontrado para o período. Verifique se os dados estão sincronizados.`
    );
  }

  // Build month-by-month detail
  const detalhes: DetalheMes[] = [];
  let fatorAcumulado = new Decimal(1);
  let valorBase = valor;

  for (const reg of registros) {
    const taxaMes = reg.valor; // already a Decimal (%)
    const fatorMes = new Decimal(1).plus(taxaMes.div(100));
    fatorAcumulado = fatorAcumulado.times(fatorMes);

    const mesDate = new Date(reg.data_referencia + "T00:00:00");
    detalhes.push({
      mes: nomeMes(mesDate),
      dataRef: reg.data_referencia.substring(0, 7),
      taxaMes,
      fatorMes,
      fatorAcumulado,
      valorBase,
    });

    valorBase = roundMoney(valorBase.times(fatorMes));
  }

  const fatorCorrecao = fatorAcumulado;
  const valorCorrigido = roundMoney(valor.times(fatorCorrecao));

  // Determine regime
  const regime: ResultadoCorrecao["regimeJuros"] = isBefore(dataFinal, LEI_14905_DATA)
    ? "pre-14905"
    : isAfter(dataInicial, LEI_14905_DATA)
    ? "post-14905"
    : "misto";

  // Calculate juros de mora
  let juros = new Decimal(0);
  if (incluirJuros) {
    juros = await jurosMora(valorCorrigido, dataInicial, dataFinal, tipoObrigacao);
  }

  const total = roundMoney(valorCorrigido.plus(juros));

  return {
    valorOriginal: valor,
    fatorCorrecao,
    valorCorrigido,
    juros,
    total,
    regimeJuros: regime,
    legislacao: legislacaoLabel(indice, regime),
    detalhes,
  };
}

// ─── Taxa Legal (pós Lei 14.905/2024) ────────────────────────────────────────

/**
 * Taxa Legal = SELIC − IPCA, mínimo zero (art. 1º Lei 14.905/2024).
 * Retorna o fator acumulado (não percentual) para o período.
 */
export async function calcularTaxaLegal(
  dataInicial: Date,
  dataFinal: Date
): Promise<Decimal> {
  const [selic, ipca] = await Promise.all([
    fetchIndices("SELIC_META", dataInicial, dataFinal),
    fetchIndices("IPCA", dataInicial, dataFinal),
  ]);

  // Build map for IPCA by month
  const ipcaMap = new Map<string, Decimal>();
  for (const r of ipca) {
    ipcaMap.set(r.data_referencia.substring(0, 7), r.valor);
  }

  let fatorAcumulado = new Decimal(1);

  for (const s of selic) {
    const mes = s.data_referencia.substring(0, 7);
    const taxaIpca = ipcaMap.get(mes) ?? new Decimal(0);
    const taxaLegalMes = Decimal.max(s.valor.minus(taxaIpca), new Decimal(0));
    fatorAcumulado = fatorAcumulado.times(new Decimal(1).plus(taxaLegalMes.div(100)));
  }

  return fatorAcumulado.minus(1); // returns accumulated rate as decimal
}

// ─── Juros de Mora ────────────────────────────────────────────────────────────

/**
 * Calcula juros de mora cíveis sobre o valor corrigido.
 *
 * Regime pre-Lei 14.905/2024 (antes de 30/08/2024):
 *   - Civil / Consumerista: 1% a.m. simples (art. 406 CC + art. 52 §1 CDC)
 *   - Fazenda Pública / Alimentar: 0,5% a.m. simples (art. 1º-F Lei 9.494/1997)
 *
 * Regime pós-Lei 14.905/2024 (a partir de 30/08/2024):
 *   - Taxa Legal = SELIC − IPCA, mínimo zero, aplicada sobre valor corrigido
 */
export async function jurosMora(
  valorCorrigido: Decimal,
  dataFato: Date,
  dataCalculo: Date,
  tipoObrigacao: TipoObrigacao
): Promise<Decimal> {
  const dias = diasCorridos(dataFato, dataCalculo);
  if (dias <= 0) return new Decimal(0);

  const isPostLei = !isBefore(dataFato, LEI_14905_DATA);

  if (isPostLei) {
    // Taxa Legal acumulada para o período
    const fatorLegal = await calcularTaxaLegal(dataFato, dataCalculo);
    return roundMoney(valorCorrigido.times(fatorLegal));
  }

  // Juros simples pre-14905
  const taxaMensal = tipoObrigacao === "fazenda" || tipoObrigacao === "alimentar"
    ? new Decimal("0.005")  // 0,5% a.m.
    : new Decimal("0.01");  // 1% a.m.

  const meses = new Decimal(dias).div(30);
  return roundMoney(valorCorrigido.times(taxaMensal).times(meses));
}

// ─── Cumprimento de Sentença ──────────────────────────────────────────────────

/**
 * Cumprimento de sentença: multa 10% + honorários 10% (art. 523 CPC).
 * Incide sobre o débito atualizado na data da intimação.
 */
export function cumprimentoSentenca(debitoAtualizado: Decimal): {
  multa: Decimal;
  honorarios: Decimal;
  total: Decimal;
} {
  const multa = roundMoney(debitoAtualizado.times("0.10"));
  const honorarios = roundMoney(debitoAtualizado.times("0.10"));
  const total = roundMoney(debitoAtualizado.plus(multa).plus(honorarios));
  return { multa, honorarios, total };
}

// ─── Honorários Advocatícios ──────────────────────────────────────────────────

export type TipoHonorarios = "normal" | "fazenda";

export interface FaixaHonorarios {
  descricao: string;
  percentualMin: Decimal;
  percentualMax: Decimal;
  valorMin: Decimal;
  valorMax: Decimal;
}

export interface ResultadoHonorarios {
  tipo: TipoHonorarios;
  faixas: FaixaHonorarios[];
  legislacao: string;
}

/** Salário mínimo 2025 para cálculo dos limiares (art. 85 CPC). */
const SM_2025 = new Decimal("1518");

/**
 * Calcula a faixa de honorários advocatícios sucumbenciais (art. 85 CPC).
 *
 * Causas normais: 10–20% sobre o valor da condenação (§2).
 * Fazenda Pública: escalonado por faixas de SM (§3).
 */
export function honorariosAdvocaticios(
  valor: Decimal,
  tipo: TipoHonorarios
): ResultadoHonorarios {
  if (tipo === "normal") {
    return {
      tipo,
      faixas: [
        {
          descricao: "Honorários (art. 85 §2 CPC)",
          percentualMin: new Decimal("10"),
          percentualMax: new Decimal("20"),
          valorMin: roundMoney(valor.times("0.10")),
          valorMax: roundMoney(valor.times("0.20")),
        },
      ],
      legislacao: "Art. 85 §2 CPC — 10 a 20% sobre o valor da condenação",
    };
  }

  // Fazenda Pública — escalonado (art. 85 §3 CPC)
  // Base de cálculo é o valor integral; cada faixa tem % diferente
  const faixasSM = [
    { limite: new Decimal(200), min: new Decimal("10"), max: new Decimal("20") },
    { limite: new Decimal(2000), min: new Decimal("8"), max: new Decimal("10") },
    { limite: new Decimal(20000), min: new Decimal("5"), max: new Decimal("8") },
    { limite: new Decimal(100000), min: new Decimal("3"), max: new Decimal("5") },
  ];

  const faixas: FaixaHonorarios[] = [];
  let restante = valor;

  const limites = [
    { teto: SM_2025.times(200), descMin: "Sobre os primeiros 200 SM", descMax: "" },
    { teto: SM_2025.times(2000), descMin: "De 200 a 2.000 SM", descMax: "" },
    { teto: SM_2025.times(20000), descMin: "De 2.000 a 20.000 SM", descMax: "" },
    { teto: SM_2025.times(100000), descMin: "De 20.000 a 100.000 SM", descMax: "" },
  ];

  let anterior = new Decimal(0);

  for (let i = 0; i < faixasSM.length; i++) {
    const tetoFaixa = SM_2025.times(faixasSM[i].limite);
    if (anterior.gte(valor)) break;

    const baseNaFaixa = Decimal.min(valor, tetoFaixa).minus(anterior);
    if (baseNaFaixa.lte(0)) {
      anterior = tetoFaixa;
      continue;
    }

    faixas.push({
      descricao: limites[i].descMin,
      percentualMin: faixasSM[i].min,
      percentualMax: faixasSM[i].max,
      valorMin: roundMoney(baseNaFaixa.times(faixasSM[i].min).div(100)),
      valorMax: roundMoney(baseNaFaixa.times(faixasSM[i].max).div(100)),
    });

    anterior = tetoFaixa;
    restante = restante.minus(baseNaFaixa);
  }

  // Acima de 100.000 SM
  if (restante.gt(0)) {
    faixas.push({
      descricao: "Acima de 100.000 SM",
      percentualMin: new Decimal("1"),
      percentualMax: new Decimal("3"),
      valorMin: roundMoney(restante.times("0.01")),
      valorMax: roundMoney(restante.times("0.03")),
    });
  }

  return {
    tipo,
    faixas,
    legislacao: "Art. 85 §3 CPC — honorários escalonados contra Fazenda Pública",
  };
}

// ─── Precatório / RPV ─────────────────────────────────────────────────────────

export type EnteFederativo = "federal" | "estadual" | "municipal";
export type NaturezaCredito = "comum" | "alimentar";

export interface ResultadoPrecatorio {
  valor: Decimal;
  classificacao: "RPV" | "Precatorio";
  limiteRPV: Decimal;
  excedePorRPV: Decimal;
  natureza: NaturezaCredito;
  ente: EnteFederativo;
  observacao: string;
  legislacao: string;
}

/**
 * Classifica crédito judicial como RPV ou Precatório e calcula limites.
 *
 * RPV Federal (art. 100 §3 CF): até 60 SM para créditos comuns.
 * Créditos alimentares (art. 100 §2 CF): até 3× o limite do §3 = 180 SM.
 * Estados/Municípios: adotam 60 SM como referência padrão (podem reduzir por lei).
 */
export function precatorioRPV(
  valor: Decimal,
  natureza: NaturezaCredito,
  ente: EnteFederativo
): ResultadoPrecatorio {
  // Limites em SM (referência: 60 SM para comum, 180 SM para alimentar)
  const multiplicadorSM = natureza === "alimentar" ? 180 : 60;
  const limiteRPV = roundMoney(SM_2025.times(multiplicadorSM));

  const classificacao: "RPV" | "Precatorio" = valor.lte(limiteRPV) ? "RPV" : "Precatorio";
  const excedePorRPV = Decimal.max(new Decimal(0), valor.minus(limiteRPV));

  const smLabel = natureza === "alimentar" ? "180 SM" : "60 SM";
  const observacoes: Record<EnteFederativo, string> = {
    federal: `Limite RPV Federal: ${smLabel} = ${formatearBRL(limiteRPV)} (SM 2025: R$ 1.518,00)`,
    estadual: `Limite RPV Estadual: ${smLabel} = ${formatearBRL(limiteRPV)} (referência; pode variar por legislação estadual)`,
    municipal: `Limite RPV Municipal: ${smLabel} = ${formatearBRL(limiteRPV)} (referência; pode variar por lei municipal)`,
  };

  const legislacoes: Record<NaturezaCredito, string> = {
    comum: "Art. 100 §3 CF — RPV até 60 SM para pessoas físicas",
    alimentar: "Art. 100 §2 CF — RPV alimentar preferencial até 3× o limite (180 SM)",
  };

  return {
    valor,
    classificacao,
    limiteRPV,
    excedePorRPV,
    natureza,
    ente,
    observacao: observacoes[ente],
    legislacao: legislacoes[natureza],
  };
}

function formatearBRL(v: Decimal): string {
  return v.toNumber().toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Cláusula Penal ───────────────────────────────────────────────────────────

export type TipoClausulaPenal = "compensatoria" | "moratoria";

export interface ResultadoClausulaPenal {
  valorPrincipal: Decimal;
  percentual: Decimal;
  clausulaBruta: Decimal;
  clausulaAplicada: Decimal;
  limiteFoiAplicado: boolean;
  limiteLegal: Decimal;
  tipo: TipoClausulaPenal;
  isCDC: boolean;
  legislacao: string;
}

/**
 * Calcula cláusula penal contratual com limites legais.
 *
 * Compensatória (art. 412 CC): limitada ao valor da obrigação principal.
 * Moratória: sem limite no CC; CDC (art. 52 §1) limita a 2% para consumidores.
 */
export function clausulaPenal(
  valorPrincipal: Decimal,
  percentual: Decimal,
  tipo: TipoClausulaPenal,
  isCDC = false
): ResultadoClausulaPenal {
  const clausulaBruta = roundMoney(valorPrincipal.times(percentual.div(100)));

  let limiteLegal: Decimal;
  let limiteFoiAplicado = false;
  let clausulaAplicada: Decimal;
  let legislacao: string;

  if (tipo === "compensatoria") {
    limiteLegal = valorPrincipal; // art. 412 CC: não pode exceder o valor da obrigação
    limiteFoiAplicado = clausulaBruta.gt(limiteLegal);
    clausulaAplicada = limiteFoiAplicado ? limiteLegal : clausulaBruta;
    legislacao = "Art. 412 CC — cláusula compensatória limitada ao valor da obrigação";
  } else {
    if (isCDC) {
      limiteLegal = roundMoney(valorPrincipal.times("0.02")); // 2% (art. 52 §1 CDC)
      limiteFoiAplicado = clausulaBruta.gt(limiteLegal);
      clausulaAplicada = limiteFoiAplicado ? limiteLegal : clausulaBruta;
      legislacao = "Art. 52 §1 CDC — cláusula moratória limitada a 2% em relações de consumo";
    } else {
      limiteLegal = clausulaBruta; // sem limite legal no CC para moratória
      clausulaAplicada = clausulaBruta;
      legislacao = "Art. 408 CC — cláusula penal moratória (sem limite legal no Código Civil)";
    }
  }

  return {
    valorPrincipal,
    percentual,
    clausulaBruta,
    clausulaAplicada,
    limiteFoiAplicado,
    limiteLegal,
    tipo,
    isCDC,
    legislacao,
  };
}
