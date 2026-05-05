import Decimal from "decimal.js";
import { roundMoney } from "./engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParcelaAmortizacao {
  numero: number;
  prestacao: Decimal;
  amortizacao: Decimal;
  juros: Decimal;
  saldoDevedor: Decimal;
}

export interface ResultadoAmortizacao {
  sistema: "price" | "sac";
  pv: Decimal;
  taxaMensal: Decimal;
  prazoMeses: number;
  prestacaoInicial: Decimal;
  prestacaoFinal: Decimal;
  totalPago: Decimal;
  totalJuros: Decimal;
  parcelas: ParcelaAmortizacao[];
  legislacao: string;
}

export interface ResultadoHaveres {
  patrimonioLiquido: Decimal;
  participacaoPct: Decimal;
  haveresBrutos: Decimal;
  deducoes: Decimal;
  haveresLiquidos: Decimal;
  legislacao: string;
}

export interface ResultadoLucrosCessantes {
  rendimentoMedioMensal: Decimal;
  mesesAfastamento: number;
  totalBruto: Decimal;
  correcaoMonetaria: Decimal;
  totalCorrigido: Decimal;
  legislacao: string;
}

// ─── Sistema Price (Tabela PRICE / Sistema Francês) ───────────────────────────

/**
 * Calcula amortização pelo Sistema Price (prestações constantes).
 *
 * PMT = PV × i / (1 − (1 + i)^−n)
 *
 * @param pv - Capital financiado
 * @param taxaMensalPct - Taxa de juros mensal em % (ex: 1 para 1% a.m.)
 * @param prazoMeses - Número de parcelas
 */
export function sistemaPrice(
  pv: Decimal,
  taxaMensalPct: Decimal,
  prazoMeses: number
): ResultadoAmortizacao {
  const i = taxaMensalPct.div(100);
  // PMT = PV × i / (1 − (1 + i)^−n)
  const fator = new Decimal(1).plus(i).pow(-prazoMeses);
  const pmt = roundMoney(pv.times(i).div(new Decimal(1).minus(fator)));

  const parcelas: ParcelaAmortizacao[] = [];
  let saldo = pv;

  for (let k = 1; k <= prazoMeses; k++) {
    const juros = roundMoney(saldo.times(i));
    const amortizacao = roundMoney(pmt.minus(juros));
    saldo = k === prazoMeses ? new Decimal(0) : roundMoney(saldo.minus(amortizacao));

    parcelas.push({ numero: k, prestacao: pmt, amortizacao, juros, saldoDevedor: saldo });
  }

  const totalPago = roundMoney(pmt.times(prazoMeses));
  const totalJuros = roundMoney(totalPago.minus(pv));

  return {
    sistema: "price",
    pv,
    taxaMensal: taxaMensalPct,
    prazoMeses,
    prestacaoInicial: pmt,
    prestacaoFinal: pmt,
    totalPago,
    totalJuros,
    parcelas,
    legislacao: "Sistema Price (Tabela PRICE/Francês) — prestações constantes",
  };
}

// ─── Sistema SAC (Amortização Constante) ─────────────────────────────────────

/**
 * Calcula amortização pelo Sistema SAC (amortização constante).
 *
 * Amortização = PV / n (constante)
 * Juros mês k = Saldo_(k−1) × i
 * Prestação mês k = Amortização + Juros mês k  →  decrescente
 *
 * @param pv - Capital financiado
 * @param taxaMensalPct - Taxa de juros mensal em % (ex: 1 para 1% a.m.)
 * @param prazoMeses - Número de parcelas
 */
export function sistemaSAC(
  pv: Decimal,
  taxaMensalPct: Decimal,
  prazoMeses: number
): ResultadoAmortizacao {
  const i = taxaMensalPct.div(100);
  const amortizacaoConstante = roundMoney(pv.div(prazoMeses));

  const parcelas: ParcelaAmortizacao[] = [];
  let saldo = pv;
  let totalPago = new Decimal(0);

  for (let k = 1; k <= prazoMeses; k++) {
    const juros = roundMoney(saldo.times(i));
    // Last installment: clear remaining saldo (absorbs rounding residue)
    const amortizacao = k === prazoMeses ? saldo : amortizacaoConstante;
    const prestacao = roundMoney(amortizacao.plus(juros));
    saldo = k === prazoMeses ? new Decimal(0) : roundMoney(saldo.minus(amortizacao));

    totalPago = totalPago.plus(prestacao);
    parcelas.push({ numero: k, prestacao, amortizacao, juros, saldoDevedor: saldo });
  }

  totalPago = roundMoney(totalPago);
  const totalJuros = roundMoney(totalPago.minus(pv));

  return {
    sistema: "sac",
    pv,
    taxaMensal: taxaMensalPct,
    prazoMeses,
    prestacaoInicial: parcelas[0].prestacao,
    prestacaoFinal: parcelas[parcelas.length - 1].prestacao,
    totalPago,
    totalJuros,
    parcelas,
    legislacao: "Sistema SAC (Amortização Constante) — amortização fixa, prestação decrescente",
  };
}

// ─── Apuração de Haveres ──────────────────────────────────────────────────────

/**
 * Apuração de haveres do sócio retirante (art. 1.031 CC).
 *
 * Calcula o valor da quota com base no patrimônio líquido contábil ou balanço
 * de determinação, conforme participação societária do sócio retirante.
 *
 * @param patrimonioLiquido - PL da empresa na data-base de dissolução
 * @param participacaoPct - Participação do sócio em % (ex: 30 para 30%)
 * @param deducoes - Débitos do sócio com a sociedade (opcional)
 */
export function apuracaoHaveres(
  patrimonioLiquido: Decimal,
  participacaoPct: Decimal,
  deducoes: Decimal = new Decimal(0)
): ResultadoHaveres {
  const haveresBrutos = roundMoney(patrimonioLiquido.times(participacaoPct.div(100)));
  const haveresLiquidos = roundMoney(haveresBrutos.minus(deducoes));

  return {
    patrimonioLiquido,
    participacaoPct,
    haveresBrutos,
    deducoes,
    haveresLiquidos,
    legislacao: "Art. 1.031 CC — haveres apurados pelo PL na data da resolução da quota",
  };
}

// ─── Rateio de Créditos na Falência ───────────────────────────────────────────

/**
 * Classes de credores na ordem de prioridade da Lei 14.112/2020
 * (reforma da Lei 11.101/2005)
 */
export type ClasseCredor =
  | "trabalhista"
  | "garantia_real"
  | "tributario"
  | "quirografario"
  | "subordinado";

export interface Credor {
  nome: string;
  classe: ClasseCredor;
  valorCredito: Decimal;
}

export interface CredorRateio extends Credor {
  valorRecebido: Decimal;
  percentualRecuperacao: Decimal;
}

export interface ResultadoRateioPorClasse {
  classe: ClasseCredor;
  totalCreditos: Decimal;
  totalRecebido: Decimal;
  percentualRecuperacao: Decimal;
  credores: CredorRateio[];
}

export interface ResultadoRateioCreditosFalencia {
  ativoDisponivel: Decimal;
  totalCreditos: Decimal;
  totalDistribuido: Decimal;
  saldoRemanescente: Decimal;
  porClasse: ResultadoRateioPorClasse[];
  legislacao: string;
}

// Limite trabalhista: 150 salários mínimos por credor (Lei 11.101/2005 art. 83, I)
// Valor do salário mínimo vigente (2024): R$ 1.412,00
const SALARIO_MINIMO = new Decimal("1412.00");
const LIMITE_TRABALHISTA = SALARIO_MINIMO.times(150);

const ORDEM_CLASSES: ClasseCredor[] = [
  "trabalhista",
  "garantia_real",
  "tributario",
  "quirografario",
  "subordinado",
];

/**
 * Calcula o rateio de créditos na falência conforme a ordem de prioridade
 * estabelecida pela Lei 11.101/2005 com as alterações da Lei 14.112/2020.
 *
 * Atenção: créditos trabalhistas acima de 150 salários mínimos por credor
 * são reclassificados como quirografários antes do rateio.
 *
 * @param ativoDisponivel - Ativo líquido disponível para distribuição
 * @param credores - Lista de credores com classe e valor do crédito
 */
export function rateioCreditosFalencia(
  ativoDisponivel: Decimal,
  credores: Credor[]
): ResultadoRateioCreditosFalencia {
  // Reclassifica excesso trabalhista (> 150 SM) como quirografário
  const credoresNormalizados: Credor[] = [];
  for (const c of credores) {
    if (c.classe === "trabalhista" && c.valorCredito.gt(LIMITE_TRABALHISTA)) {
      credoresNormalizados.push({
        ...c,
        valorCredito: LIMITE_TRABALHISTA,
      });
      credoresNormalizados.push({
        nome: `${c.nome} (excesso trabalhista)`,
        classe: "quirografario",
        valorCredito: c.valorCredito.minus(LIMITE_TRABALHISTA),
      });
    } else {
      credoresNormalizados.push(c);
    }
  }

  let ativoRestante = ativoDisponivel;
  const porClasse: ResultadoRateioPorClasse[] = [];

  for (const classe of ORDEM_CLASSES) {
    const credoresClasse = credoresNormalizados.filter((c) => c.classe === classe);
    if (credoresClasse.length === 0) continue;

    const totalCreditos = credoresClasse.reduce(
      (acc, c) => acc.plus(c.valorCredito),
      new Decimal(0)
    );

    let totalRecebido: Decimal;
    let proporcao: Decimal;

    if (ativoRestante.gte(totalCreditos)) {
      // Classe paga integralmente
      totalRecebido = totalCreditos;
      proporcao = new Decimal(1);
    } else if (ativoRestante.gt(0)) {
      // Pagamento proporcional dentro da classe
      totalRecebido = ativoRestante;
      proporcao = ativoRestante.div(totalCreditos);
    } else {
      totalRecebido = new Decimal(0);
      proporcao = new Decimal(0);
    }

    const credoresRateio: CredorRateio[] = credoresClasse.map((c) => {
      const valorRecebido = roundMoney(c.valorCredito.times(proporcao));
      const percentualRecuperacao = c.valorCredito.gt(0)
        ? roundMoney(valorRecebido.div(c.valorCredito).times(100))
        : new Decimal(0);
      return { ...c, valorRecebido, percentualRecuperacao };
    });

    const percentualRecuperacaoClasse = totalCreditos.gt(0)
      ? roundMoney(totalRecebido.div(totalCreditos).times(100))
      : new Decimal(0);

    porClasse.push({
      classe,
      totalCreditos,
      totalRecebido,
      percentualRecuperacao: percentualRecuperacaoClasse,
      credores: credoresRateio,
    });

    ativoRestante = roundMoney(ativoRestante.minus(totalRecebido));
  }

  const totalDistribuido = roundMoney(
    ativoDisponivel.minus(ativoRestante.lt(0) ? new Decimal(0) : ativoRestante)
  );
  const totalCreditos = credoresNormalizados.reduce(
    (acc, c) => acc.plus(c.valorCredito),
    new Decimal(0)
  );

  return {
    ativoDisponivel,
    totalCreditos,
    totalDistribuido,
    saldoRemanescente: ativoRestante.lt(0) ? new Decimal(0) : ativoRestante,
    porClasse,
    legislacao:
      "Lei 11.101/2005 art. 83 c/c Lei 14.112/2020 — ordem: trabalhista (≤150 SM) → garantia real → tributário → quirografário → subordinado",
  };
}

// ─── Lucros Cessantes ─────────────────────────────────────────────────────────

/**
 * Calcula lucros cessantes com base no rendimento médio e período de interrupção.
 *
 * @param rendimentoMedioMensal - Média do rendimento mensal provado/presumido
 * @param mesesAfastamento - Número de meses de interrupção da atividade
 * @param fatorCorrecao - Fator de correção monetária acumulado (ex: 1.15 para 15%)
 */
export function lucrosCessantes(
  rendimentoMedioMensal: Decimal,
  mesesAfastamento: number,
  fatorCorrecao: Decimal = new Decimal(1)
): ResultadoLucrosCessantes {
  const totalBruto = roundMoney(rendimentoMedioMensal.times(mesesAfastamento));
  const totalCorrigido = roundMoney(totalBruto.times(fatorCorrecao));
  const correcaoMonetaria = roundMoney(totalCorrigido.minus(totalBruto));

  return {
    rendimentoMedioMensal,
    mesesAfastamento,
    totalBruto,
    correcaoMonetaria,
    totalCorrigido,
    legislacao: "Art. 402 CC — lucros cessantes: o que o credor razoavelmente deixou de lucrar",
  };
}
