import Decimal from "decimal.js";
import { roundMoney } from "./engine";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Representação canônica de pena: 1 mês = 30 dias, 1 ano = 360 dias (convenção penal). */
export interface Pena {
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
}

export interface FaseDosimetria {
  fase: 1 | 2 | 3;
  descricao: string;
  pena: Pena;
  ajuste: string;
  fundamento: string;
}

export interface ResultadoDosimetria {
  penaBase: Pena;
  penaIntermediaria: Pena;
  penaDef: Pena;
  fases: FaseDosimetria[];
  regimeInicial: "fechado" | "semiaberto" | "aberto";
  legislacao: string;
}

export type TipoProgressao =
  | "primario_sem_violencia"
  | "primario_com_violencia"
  | "primario_hediondo"
  | "primario_hediondo_morte"
  | "reincidente_sem_violencia"
  | "reincidente_com_violencia"
  | "reincidente_hediondo"
  | "reincidente_hediondo_morte"
  | "organizacao_criminosa_lider";

export interface ResultadoProgressao {
  penaTotal: Pena;
  fracao: number;
  fracaoLabel: string;
  diasMinimos: number;
  penaMinima: Pena;
  dataProgressao: Date | null;
  tipoProgressao: TipoProgressao;
  legislacao: string;
}

export interface ResultadoPrescricao {
  prazoAnos: number;
  reducaoAplicada: boolean;
  prazoEfetivo: number; // em anos, já com redução
  prescreveu: boolean;
  diasParaPrescricao: number | null; // null se já prescreveu
  dataPrescricao: Date | null;
  legislacao: string;
}

export interface ResultadoRemicao {
  diasRemidosTrabalho: number;
  diasRemidosEstudo: number;
  totalRemido: number;
  penaOriginal: Pena;
  penaRestante: Pena;
  legislacao: string;
}

export interface ResultadoMultaPenal {
  diasMulta: number;
  valorDia: Decimal;
  valorBruto: Decimal;
  valorMinimoDia: Decimal;
  valorMaximoDia: Decimal;
  legislacao: string;
}

export type TipoConcurso =
  | "material"
  | "formal_proprio"
  | "continuidade_simples"
  | "continuidade_qualificada";

export interface ResultadoConcurso {
  penas: Pena[];
  tipo: TipoConcurso;
  fracao: number;
  penaMaisGrave: Pena;
  penaDef: Pena;
  limitado40Anos: boolean;
  legislacao: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SM_2025 = new Decimal("1518");

/** Converte anos + meses + dias para total de dias (convenção penal: 1 ano = 360 dias). */
export function penaParaDias(anos: number, meses = 0, dias = 0): number {
  return anos * 360 + meses * 30 + dias;
}

/** Converte total de dias para representação em anos/meses/dias. */
export function diasParaPena(totalDias: number): Pena {
  const anos = Math.floor(totalDias / 360);
  const restoDias = totalDias % 360;
  const meses = Math.floor(restoDias / 30);
  const dias = restoDias % 30;
  return { anos, meses, dias, totalDias };
}

/** Formata pena para exibição legível. */
export function formatarPena(pena: Pena): string {
  const partes: string[] = [];
  if (pena.anos > 0) partes.push(`${pena.anos} ano${pena.anos !== 1 ? "s" : ""}`);
  if (pena.meses > 0) partes.push(`${pena.meses} ${pena.meses !== 1 ? "meses" : "mês"}`);
  if (pena.dias > 0) partes.push(`${pena.dias} dia${pena.dias !== 1 ? "s" : ""}`);
  return partes.length > 0 ? partes.join(", ") : "0 dias";
}

// ─── Regime Inicial ───────────────────────────────────────────────────────────

/**
 * Define o regime inicial de cumprimento de pena (art. 33 CP).
 *
 * Primário:
 *   > 8 anos → fechado obrigatório
 *   4–8 anos → semiaberto
 *   ≤ 4 anos → aberto
 *
 * Reincidente: sempre no mínimo semiaberto; fechado se > 4 anos.
 */
export function regimeInicial(
  penaDias: number,
  reincidente: boolean
): "fechado" | "semiaberto" | "aberto" {
  if (penaDias > penaParaDias(8)) return "fechado";
  if (reincidente) return penaDias > penaParaDias(4) ? "fechado" : "semiaberto";
  if (penaDias > penaParaDias(4)) return "semiaberto";
  return "aberto";
}

// ─── Dosimetria ───────────────────────────────────────────────────────────────

/**
 * Calcula a pena pelo sistema trifásico (arts. 59, 61-65, 67, 68 CP).
 *
 * Fase 1 — Pena-base: min + (desf / 8) × (max − min).
 * Fase 2 — Agravantes/atenuantes: ±1/6 por cada; limitado ao min/max.
 * Fase 3 — Causas de aumento/diminuição: aplicadas sequencialmente.
 */
export function dosimetria(params: {
  penaMinDias: number;
  penaMaxDias: number;
  circunstanciasDesfavoraveis: number; // 0–8
  agravantes: number;
  atenuantes: number;
  causaAumentoPct: number;  // ex: 33.33 para 1/3
  causaDiminuicaoPct: number; // ex: 33.33 para 1/3
  reincidente: boolean;
}): ResultadoDosimetria {
  const {
    penaMinDias,
    penaMaxDias,
    circunstanciasDesfavoraveis,
    agravantes,
    atenuantes,
    causaAumentoPct,
    causaDiminuicaoPct,
    reincidente,
  } = params;

  const fases: FaseDosimetria[] = [];

  // ── Fase 1: Pena-base ────────────────────────────────────────────────────
  const nDesf = Math.min(8, Math.max(0, circunstanciasDesfavoraveis));
  const penaBaseDias = Math.round(
    penaMinDias + (nDesf / 8) * (penaMaxDias - penaMinDias)
  );
  const penaBase = diasParaPena(penaBaseDias);

  fases.push({
    fase: 1,
    descricao: "Pena-base",
    pena: penaBase,
    ajuste: nDesf === 0
      ? "Todas as circunstâncias neutras → pena mínima"
      : `${nDesf} de 8 circunstâncias desfavoráveis`,
    fundamento: "Art. 59 CP",
  });

  // ── Fase 2: Agravantes/Atenuantes ────────────────────────────────────────
  const netCirc = agravantes - atenuantes;
  let penaIntermDias = penaBaseDias;

  if (netCirc !== 0) {
    const ajusteDias = Math.round((Math.abs(netCirc) / 6) * penaBaseDias);
    penaIntermDias = netCirc > 0
      ? penaBaseDias + ajusteDias
      : penaBaseDias - ajusteDias;

    // STJ Súmula 231: atenuante não reduz abaixo do mínimo legal
    penaIntermDias = Math.max(penaMinDias, penaIntermDias);
    // Doutrina majoritária: agravante não ultrapassa o máximo
    penaIntermDias = Math.min(penaMaxDias, penaIntermDias);
  }

  const penaInterm = diasParaPena(penaIntermDias);
  const ajusteLabel2 = netCirc === 0
    ? "Sem agravantes ou atenuantes"
    : netCirc > 0
    ? `+${agravantes} agravante(s), −${atenuantes} atenuante(s) → +1/6 por unidade líquida`
    : `+${agravantes} agravante(s), −${atenuantes} atenuante(s) → −1/6 por unidade líquida`;

  fases.push({
    fase: 2,
    descricao: "Circunstâncias legais",
    pena: penaInterm,
    ajuste: ajusteLabel2,
    fundamento: "Arts. 61-67 CP; Súmula 231 STJ",
  });

  // ── Fase 3: Causas de aumento/diminuição ─────────────────────────────────
  let penaDefDias = penaIntermDias;

  if (causaAumentoPct > 0) {
    penaDefDias = Math.round(penaDefDias * (1 + causaAumentoPct / 100));
  }
  if (causaDiminuicaoPct > 0) {
    penaDefDias = Math.round(penaDefDias * (1 - causaDiminuicaoPct / 100));
  }

  // Máximo absoluto: 40 anos (art. 75 CP)
  penaDefDias = Math.min(penaDefDias, penaParaDias(40));
  penaDefDias = Math.max(penaDefDias, 1);

  const penaDef = diasParaPena(penaDefDias);

  const aumentoParts: string[] = [];
  if (causaAumentoPct > 0) aumentoParts.push(`+${causaAumentoPct.toFixed(2)}%`);
  if (causaDiminuicaoPct > 0) aumentoParts.push(`−${causaDiminuicaoPct.toFixed(2)}%`);

  fases.push({
    fase: 3,
    descricao: "Causas de aumento/diminuição",
    pena: penaDef,
    ajuste: aumentoParts.length > 0 ? aumentoParts.join("; ") : "Sem causas de aumento ou diminuição",
    fundamento: "Art. 68 CP",
  });

  const regime = regimeInicial(penaDefDias, reincidente);

  return {
    penaBase,
    penaIntermediaria: penaInterm,
    penaDef,
    fases,
    regimeInicial: regime,
    legislacao: "Arts. 59, 61-68 e 33 CP — sistema trifásico",
  };
}

// ─── Progressão de Regime ─────────────────────────────────────────────────────

const FRACOES_PROGRESSAO: Record<TipoProgressao, { fracao: number; label: string; lei: string }> = {
  primario_sem_violencia:       { fracao: 0.16, label: "1/6 (16%)", lei: "Art. 112, I, LEP (Lei 13.964/2019)" },
  primario_com_violencia:       { fracao: 0.20, label: "1/5 (20%)", lei: "Art. 112, II, LEP (Lei 13.964/2019)" },
  reincidente_sem_violencia:    { fracao: 0.25, label: "1/4 (25%)", lei: "Art. 112, III, LEP (Lei 13.964/2019)" },
  reincidente_com_violencia:    { fracao: 0.30, label: "3/10 (30%)", lei: "Art. 112, IV, LEP (Lei 13.964/2019)" },
  primario_hediondo:            { fracao: 0.40, label: "2/5 (40%)", lei: "Art. 112, V, LEP (Lei 13.964/2019)" },
  primario_hediondo_morte:      { fracao: 0.50, label: "1/2 (50%)", lei: "Art. 112, VI, LEP (Lei 13.964/2019)" },
  reincidente_hediondo:         { fracao: 0.60, label: "3/5 (60%)", lei: "Art. 112, VII, LEP (Lei 13.964/2019)" },
  reincidente_hediondo_morte:   { fracao: 0.70, label: "7/10 (70%)", lei: "Art. 112, VIII, LEP (Lei 13.964/2019)" },
  organizacao_criminosa_lider:  { fracao: 0.70, label: "7/10 (70%)", lei: "Art. 112, VIII, LEP + Art. 2º §4 Lei 12.850/2013" },
};

/**
 * Calcula o tempo mínimo para progressão de regime (art. 112 LEP).
 *
 * @param penaTotalDias - Pena total em dias
 * @param tipo - Tipo de progressão conforme art. 112 LEP
 * @param dataInicioAtual - Data de início do cumprimento no regime atual
 */
export function progressaoRegime(
  penaTotalDias: number,
  tipo: TipoProgressao,
  dataInicioAtual: Date | null = null
): ResultadoProgressao {
  const { fracao, label, lei } = FRACOES_PROGRESSAO[tipo];
  const diasMinimos = Math.ceil(penaTotalDias * fracao);
  const penaMinima = diasParaPena(diasMinimos);
  const penaTotal = diasParaPena(penaTotalDias);

  let dataProgressao: Date | null = null;
  if (dataInicioAtual) {
    dataProgressao = new Date(dataInicioAtual);
    dataProgressao.setDate(dataProgressao.getDate() + diasMinimos);
  }

  return {
    penaTotal,
    fracao,
    fracaoLabel: label,
    diasMinimos,
    penaMinima,
    dataProgressao,
    tipoProgressao: tipo,
    legislacao: lei,
  };
}

// ─── Prescrição ───────────────────────────────────────────────────────────────

/** Tabela art. 109 CP: retorna prazo prescricional em anos conforme pena em dias. */
function prazoPrescricionalAnos(penaDias: number): number {
  const anos = penaDias / 360;
  if (anos > 12) return 20;
  if (anos > 8)  return 16;
  if (anos > 4)  return 12;
  if (anos > 2)  return 8;
  if (anos > 1)  return 4;
  return 3;
}

/**
 * Calcula a prescrição da pretensão punitiva (art. 109 CP).
 *
 * Redução pela metade (art. 115 CP):
 *   - Réu menor de 21 anos na data do fato
 *   - Réu maior de 70 anos na data da sentença
 *
 * @param penaDias - Pena máxima abstrata (PPP) ou pena aplicada (retroativa)
 * @param dataReferencia - Data do fato ou da sentença
 * @param reducaoIdade - Se aplica redução pela metade do art. 115 CP
 */
export function prescricao(
  penaDias: number,
  dataReferencia: Date,
  reducaoIdade: boolean
): ResultadoPrescricao {
  const prazoAnos = prazoPrescricionalAnos(penaDias);
  const prazoEfetivo = reducaoIdade ? prazoAnos / 2 : prazoAnos;

  const dataPrescricao = new Date(dataReferencia);
  dataPrescricao.setFullYear(dataPrescricao.getFullYear() + prazoEfetivo);

  const hoje = new Date();
  const prescreveu = dataPrescricao <= hoje;

  let diasParaPrescricao: number | null = null;
  if (!prescreveu) {
    diasParaPrescricao = Math.ceil(
      (dataPrescricao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    prazoAnos,
    reducaoAplicada: reducaoIdade,
    prazoEfetivo,
    prescreveu,
    diasParaPrescricao,
    dataPrescricao,
    legislacao: reducaoIdade
      ? "Art. 109 CP c/c art. 115 CP (redução pela metade)"
      : "Art. 109 CP",
  };
}

// ─── Detração ─────────────────────────────────────────────────────────────────

/**
 * Desconta da pena o tempo de prisão provisória (art. 42 CP).
 */
export function detracao(penaDias: number, diasPreso: number): {
  penaOriginal: Pena;
  diasDetrados: number;
  penaRestante: Pena;
  legislacao: string;
} {
  const diasRestantes = Math.max(0, penaDias - diasPreso);
  return {
    penaOriginal: diasParaPena(penaDias),
    diasDetrados: Math.min(diasPreso, penaDias),
    penaRestante: diasParaPena(diasRestantes),
    legislacao: "Art. 42 CP — detração penal",
  };
}

// ─── Remição ──────────────────────────────────────────────────────────────────

/**
 * Calcula dias remidos por trabalho e/ou estudo (art. 126 LEP).
 *
 * Trabalho: 1 dia remido para cada 3 dias trabalhados.
 * Estudo: 1 dia remido para cada 12 horas de estudo (mínimo 1 hora/dia).
 */
export function remicao(
  penaDias: number,
  diasTrabalhados: number,
  horasEstudo: number
): ResultadoRemicao {
  const diasRemidosTrabalho = Math.floor(diasTrabalhados / 3);
  const diasRemidosEstudo = Math.floor(horasEstudo / 12);
  const totalRemido = diasRemidosTrabalho + diasRemidosEstudo;
  const diasRestantes = Math.max(0, penaDias - totalRemido);

  return {
    diasRemidosTrabalho,
    diasRemidosEstudo,
    totalRemido,
    penaOriginal: diasParaPena(penaDias),
    penaRestante: diasParaPena(diasRestantes),
    legislacao: "Art. 126 LEP — 1 dia remido para 3 trabalhados; 1 dia para 12h estudo",
  };
}

// ─── Livramento Condicional ───────────────────────────────────────────────────

/**
 * Calcula requisito temporal do livramento condicional (art. 83 CP).
 *
 * - Primário, não hediondo: 1/3 da pena
 * - Reincidente, não hediondo: 1/2 da pena
 * - Hediondo ou equiparado: 2/3 da pena (vedado para reincidente específico)
 */
export function livramentoCondicional(
  penaDias: number,
  tipo: "primario_nao_hediondo" | "reincidente_nao_hediondo" | "hediondo"
): {
  fracao: string;
  diasMinimos: number;
  penaMinima: Pena;
  vedado: boolean;
  legislacao: string;
} {
  const fracoes = {
    primario_nao_hediondo:    { f: 1 / 3, label: "1/3" },
    reincidente_nao_hediondo: { f: 1 / 2, label: "1/2" },
    hediondo:                 { f: 2 / 3, label: "2/3" },
  };

  const { f, label } = fracoes[tipo];
  const diasMinimos = Math.ceil(penaDias * f);

  return {
    fracao: label,
    diasMinimos,
    penaMinima: diasParaPena(diasMinimos),
    vedado: false, // reincidente específico em hediondo: juiz analisa caso a caso
    legislacao: `Art. 83 CP — livramento condicional após ${label} da pena`,
  };
}

// ─── Multa Penal ─────────────────────────────────────────────────────────────

/**
 * Calcula a pena de multa (art. 49 CP).
 *
 * Dias-multa: 10 a 360 dias.
 * Valor do dia-multa: 1/30 SM a 5× SM.
 * SM 2025 = R$ 1.518,00.
 */
export function multaPenal(diasMulta: number, valorDia: Decimal): ResultadoMultaPenal {
  const valorMinimoDia = roundMoney(SM_2025.div(30)); // R$ 50,60
  const valorMaximoDia = roundMoney(SM_2025.times(5)); // R$ 7.590,00
  const valorDiaLimitado = Decimal.max(valorMinimoDia, Decimal.min(valorDia, valorMaximoDia));
  const valorBruto = roundMoney(new Decimal(diasMulta).times(valorDiaLimitado));

  return {
    diasMulta,
    valorDia: valorDiaLimitado,
    valorBruto,
    valorMinimoDia,
    valorMaximoDia,
    legislacao: "Art. 49 CP — multa: 10 a 360 dias-multa; 1/30 a 5× SM/dia",
  };
}

// ─── Concurso de Crimes ───────────────────────────────────────────────────────

/**
 * Calcula a pena no concurso de crimes (arts. 69-71 CP).
 *
 * Material (art. 69): soma de todas as penas.
 * Formal próprio (art. 70): maior pena + aumento proporcional (1/6 a 1/2).
 * Continuidade delitiva (art. 71): maior pena + aumento progressivo por número de crimes.
 *
 * Limite máximo: 40 anos (art. 75 CP).
 */
export function concursoCrimes(
  penasDias: number[],
  tipo: TipoConcurso
): ResultadoConcurso {
  const penas = penasDias.map(diasParaPena);
  const sorted = [...penasDias].sort((a, b) => b - a);
  const penaMaisGraveDias = sorted[0];
  const n = penasDias.length;

  let penaDef: number;
  let fracao = 0;

  if (tipo === "material") {
    penaDef = penasDias.reduce((a, b) => a + b, 0);
    fracao = 0;
  } else if (tipo === "formal_proprio") {
    // Fração: 1/6 por crime adicional, máximo 1/2 (art. 70)
    fracao = Math.min(1 / 6 * (n - 1), 1 / 2);
    penaDef = Math.round(penaMaisGraveDias * (1 + fracao));
  } else if (tipo === "continuidade_simples") {
    // STJ/STF: escalonado pelo número de infrações
    const fracoes: Record<number, number> = {
      2: 1 / 6, 3: 1 / 5, 4: 1 / 4, 5: 1 / 3, 6: 1 / 2,
    };
    fracao = n >= 7 ? 2 / 3 : (fracoes[n] ?? 1 / 6);
    penaDef = Math.round(penaMaisGraveDias * (1 + fracao));
  } else {
    // Continuidade qualificada (art. 71 §ú): até o triplo da pena mais grave
    fracao = 2; // triplo = +200%
    penaDef = penaMaisGraveDias * 3;
  }

  // Limite art. 75 CP: 40 anos
  const limite40 = penaParaDias(40);
  const limitado = penaDef > limite40;
  if (limitado) penaDef = limite40;

  const legislacaoMap: Record<TipoConcurso, string> = {
    material:               "Art. 69 CP — concurso material: soma das penas",
    formal_proprio:         "Art. 70 CP — concurso formal próprio: maior pena + 1/6 a 1/2",
    continuidade_simples:   "Art. 71 CP — continuidade delitiva: maior pena + 1/6 a 2/3",
    continuidade_qualificada: "Art. 71 §ú CP — continuidade qualificada: até o triplo",
  };

  return {
    penas,
    tipo,
    fracao,
    penaMaisGrave: diasParaPena(penaMaisGraveDias),
    penaDef: diasParaPena(penaDef),
    limitado40Anos: limitado,
    legislacao: legislacaoMap[tipo],
  };
}
