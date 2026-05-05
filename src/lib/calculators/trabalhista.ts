import Decimal from "decimal.js";
import { roundMoney } from "./engine";

// ─── INSS Tables ──────────────────────────────────────────────────────────────

interface FaixaINSS {
  ate: Decimal;       // teto da faixa (Infinity = sem limite)
  aliquota: Decimal;  // alíquota da faixa (ex: 0.075 = 7,5%)
}

const INSS_2025: FaixaINSS[] = [
  { ate: new Decimal("1518.00"),  aliquota: new Decimal("0.075") },
  { ate: new Decimal("2793.88"),  aliquota: new Decimal("0.09")  },
  { ate: new Decimal("4190.83"),  aliquota: new Decimal("0.12")  },
  { ate: new Decimal("8157.41"),  aliquota: new Decimal("0.14")  },
];

const TETO_INSS_2025 = new Decimal("8157.41");

// 2026: tabela corrigida pelo INPC (estimativa +5%). Valores serão atualizados
// por portaria quando publicados. Usando 2025 como base segura.
const INSS_2026 = INSS_2025;
const TETO_INSS_2026 = TETO_INSS_2025;

/**
 * Calcula INSS progressivo (regime pós-2020).
 * Cada faixa só é tributada sobre o valor que cai nela.
 */
export function calcularINSS(salario: Decimal, ano: number): Decimal {
  const faixas = ano >= 2026 ? INSS_2026 : INSS_2025;
  const teto = ano >= 2026 ? TETO_INSS_2026 : TETO_INSS_2025;

  const base = Decimal.min(salario, teto);
  let inss = new Decimal(0);
  let baseAnterior = new Decimal(0);

  for (const faixa of faixas) {
    if (base.lte(baseAnterior)) break;
    const topoDaFaixa = Decimal.min(base, faixa.ate);
    const valorNaFaixa = topoDaFaixa.minus(baseAnterior);
    inss = inss.plus(valorNaFaixa.times(faixa.aliquota));
    baseAnterior = topoDaFaixa;
  }

  return roundMoney(inss);
}

// ─── IRRF Tables ──────────────────────────────────────────────────────────────

interface FaixaIRRF {
  ate: Decimal | null; // null = topo (acima do limite)
  aliquota: Decimal;
  parcela: Decimal;    // parcela dedutível fixa
}

const IRRF_2025: FaixaIRRF[] = [
  { ate: new Decimal("2259.20"), aliquota: new Decimal("0"),    parcela: new Decimal("0")       },
  { ate: new Decimal("2826.65"), aliquota: new Decimal("0.075"), parcela: new Decimal("169.44")  },
  { ate: new Decimal("3751.05"), aliquota: new Decimal("0.15"),  parcela: new Decimal("381.44")  },
  { ate: new Decimal("4664.68"), aliquota: new Decimal("0.225"), parcela: new Decimal("662.77")  },
  { ate: null,                   aliquota: new Decimal("0.275"), parcela: new Decimal("896.00")  },
];

// 2026: Lei 15.270/2025 amplia isenção + desconto simplificado R$1.275/mês.
// Tabela progressiva mantida; isento efetivo até ~R$5.000 via desconto.
const IRRF_2026 = IRRF_2025;

const DEDUCAO_DEPENDENTE_2025 = new Decimal("189.59");
const DEDUCAO_DEPENDENTE_2026 = new Decimal("189.59");

// Desconto simplificado mensal (Lei 15.270/2025, vigência 2026)
const DESCONTO_SIMPLIFICADO_2026 = new Decimal("1275.00");

export interface ResultadoIRRF {
  baseCalculo: Decimal;
  aliquotaEfetiva: Decimal;
  imposto: Decimal;
}

/**
 * Calcula IRRF mensal sobre rendimento do trabalho.
 * @param salarioBruto - Salário bruto (antes de INSS)
 * @param inss - INSS já calculado
 * @param dependentes - Número de dependentes
 * @param ano - Ano de referência
 */
export function calcularIRRF(
  salarioBruto: Decimal,
  inss: Decimal,
  dependentes: number,
  ano: number
): ResultadoIRRF {
  const faixas = ano >= 2026 ? IRRF_2026 : IRRF_2025;
  const dedDep = ano >= 2026 ? DEDUCAO_DEPENDENTE_2026 : DEDUCAO_DEPENDENTE_2025;

  let base = salarioBruto.minus(inss).minus(dedDep.times(dependentes));

  // Desconto simplificado 2026 (Lei 15.270/2025)
  if (ano >= 2026) {
    base = base.minus(DESCONTO_SIMPLIFICADO_2026);
  }

  if (base.lte(0)) {
    return {
      baseCalculo: new Decimal(0),
      aliquotaEfetiva: new Decimal(0),
      imposto: new Decimal(0),
    };
  }

  let imposto = new Decimal(0);
  for (const faixa of faixas) {
    if (faixa.ate === null || base.lte(faixa.ate)) {
      imposto = base.times(faixa.aliquota).minus(faixa.parcela);
      break;
    }
  }

  imposto = Decimal.max(imposto, new Decimal(0));
  const aliquotaEfetiva = base.gt(0) ? imposto.div(salarioBruto) : new Decimal(0);

  return {
    baseCalculo: roundMoney(base),
    aliquotaEfetiva: roundMoney(aliquotaEfetiva.times(100)),
    imposto: roundMoney(imposto),
  };
}

// ─── FGTS ─────────────────────────────────────────────────────────────────────

export const ALIQUOTA_FGTS = new Decimal("0.08");

export function calcularFGTS(remuneracao: Decimal, meses: number): Decimal {
  return roundMoney(remuneracao.times(ALIQUOTA_FGTS).times(meses));
}

// ─── Salário Mínimo ───────────────────────────────────────────────────────────

export function salarioMinimo(ano: number): Decimal {
  if (ano >= 2025) return new Decimal("1518.00");
  if (ano === 2024) return new Decimal("1412.00");
  if (ano === 2023) return new Decimal("1320.00");
  if (ano === 2022) return new Decimal("1212.00");
  if (ano === 2021) return new Decimal("1100.00");
  if (ano === 2020) return new Decimal("1045.00");
  return new Decimal("1045.00");
}

// ─── Adicionais ───────────────────────────────────────────────────────────────

export type GrauInsalubridade = "minimo" | "medio" | "maximo";
export type GrauPericulosidade = "padrao"; // sempre 30%

export interface ParamsAdicionais {
  salarioBase: Decimal;
  ano: number;
  adicionalNoturno?: boolean;   // 20% do valor-hora + hora ficta (52m30s)
  insalubridade?: GrauInsalubridade;
  periculosidade?: boolean;
  horasNoturnas?: number;       // horas noturnas por mês
}

export interface ResultadoAdicionais {
  adicionalNoturno: Decimal;
  insalubridade: Decimal;
  periculosidade: Decimal;
  total: Decimal;
  detalhes: string[];
}

export function calcularAdicionais(params: ParamsAdicionais): ResultadoAdicionais {
  const detalhes: string[] = [];
  let adicionalNoturno = new Decimal(0);
  let insalubr = new Decimal(0);
  let periculosidade = new Decimal(0);

  // Adicional noturno: 20% sobre o valor-hora diurno + hora ficta
  // Hora ficta: 1h noturna (21h-05h) = 52min30s → 220h diurnas / 192h noturnas fictas
  if (params.adicionalNoturno && params.horasNoturnas) {
    const valorHoraDiurno = params.salarioBase.div(220);
    const adicional20pct = valorHoraDiurno.times("0.20");
    // Horas fictas: cada hora noturna equivale a 52,5min; 60/52,5 = ~1,1429
    const fatorFicta = new Decimal("60").div("52.5");
    const horasNoturnasFictas = new Decimal(params.horasNoturnas).times(fatorFicta);
    adicionalNoturno = roundMoney(
      adicional20pct.times(params.horasNoturnas).plus(
        valorHoraDiurno.times(horasNoturnasFictas.minus(params.horasNoturnas))
      )
    );
    detalhes.push(`Adicional noturno: 20% + hora ficta × ${params.horasNoturnas}h`);
  }

  // Insalubridade: % sobre salário mínimo (arts. 192-194 CLT)
  if (params.insalubridade) {
    const sm = salarioMinimo(params.ano);
    const aliquota =
      params.insalubridade === "minimo"  ? new Decimal("0.10") :
      params.insalubridade === "medio"   ? new Decimal("0.20") :
                                            new Decimal("0.40");
    const grauLabel = { minimo: "mínimo (10%)", medio: "médio (20%)", maximo: "máximo (40%)" }[params.insalubridade];
    insalubr = roundMoney(sm.times(aliquota));
    detalhes.push(`Insalubridade grau ${grauLabel} s/ SM R$${sm}`);
  }

  // Periculosidade: 30% sobre salário-base (art. 193 CLT)
  if (params.periculosidade) {
    periculosidade = roundMoney(params.salarioBase.times("0.30"));
    detalhes.push("Periculosidade: 30% s/ salário-base");
  }

  const total = roundMoney(adicionalNoturno.plus(insalubr).plus(periculosidade));
  return { adicionalNoturno, insalubridade: insalubr, periculosidade, total, detalhes };
}

// ─── Horas Extras ─────────────────────────────────────────────────────────────

export interface ParamsHorasExtras {
  salarioBase: Decimal;
  horasExtras50: number;    // quantidade de HE com adicional de 50%
  horasExtras100: number;   // quantidade de HE com adicional de 100% (feriados/domingos)
  mesesTrabalho: number;    // período (para cálculo de reflexos totais)
  diasUteisMedia: number;   // dias úteis médios por mês (padrão: 26)
  diasRepousoMedia: number; // domingos/feriados médios por mês (padrão: 4)
}

export interface ResultadoHorasExtras {
  valorHoraBase: Decimal;
  totalHE50: Decimal;
  totalHE100: Decimal;
  totalHE: Decimal;
  reflexoDSR: Decimal;          // Súmula 172 TST
  reflexoFerias: Decimal;
  reflexo13: Decimal;
  reflexoFGTS: Decimal;
  totalComReflexos: Decimal;
  totalPorMes: Decimal;
}

/**
 * Calcula horas extras com reflexos conforme Súmula 172 TST.
 * Os reflexos integram a base para férias, 13º e FGTS.
 */
export function calcularHorasExtras(params: ParamsHorasExtras): ResultadoHorasExtras {
  // Valor-hora: salário / 220 (jornada mensal padrão CLT)
  const valorHoraBase = roundMoney(params.salarioBase.div(220));

  // HE com 50% de adicional
  const totalHE50 = roundMoney(
    valorHoraBase.times("1.5").times(params.horasExtras50)
  );

  // HE com 100% de adicional
  const totalHE100 = roundMoney(
    valorHoraBase.times("2.0").times(params.horasExtras100)
  );

  const totalHE = roundMoney(totalHE50.plus(totalHE100));

  // DSR (Súmula 172 TST): HE diária repercute no DSR
  // DSR = (totalHE / diasUteis) × diasRepouso
  const diasUteis = new Decimal(params.diasUteisMedia || 26);
  const diasRepouso = new Decimal(params.diasRepousoMedia || 4);
  const reflexoDSR = roundMoney(totalHE.div(diasUteis).times(diasRepouso));

  // Base com DSR (para férias e 13º)
  const baseComDSR = totalHE.plus(reflexoDSR);

  // Reflexo em férias: (base com DSR / 12) × 4/3 (inclui 1/3 constitucional)
  const reflexoFerias = roundMoney(baseComDSR.div(12).times(new Decimal(4).div(3)));

  // Reflexo em 13º: (base com DSR) / 12
  const reflexo13 = roundMoney(baseComDSR.div(12));

  // FGTS: 8% sobre (HE + DSR + férias + 13º) no período
  const baseParaFGTS = baseComDSR.plus(reflexoFerias).plus(reflexo13);
  const reflexoFGTS = roundMoney(baseParaFGTS.times(ALIQUOTA_FGTS));

  const totalComReflexos = roundMoney(
    totalHE.plus(reflexoDSR).plus(reflexoFerias).plus(reflexo13).plus(reflexoFGTS)
  );

  const totalPorMes = roundMoney(totalComReflexos.div(params.mesesTrabalho || 1));

  return {
    valorHoraBase,
    totalHE50,
    totalHE100,
    totalHE,
    reflexoDSR,
    reflexoFerias,
    reflexo13,
    reflexoFGTS,
    totalComReflexos,
    totalPorMes,
  };
}

// ─── Rescisão ─────────────────────────────────────────────────────────────────

export type TipoDesligamento =
  | "sem_justa_causa"
  | "justa_causa"
  | "pedido_demissao"
  | "acordo_mutuo"
  | "morte_empregado";

export interface ParamsRescisao {
  salarioBase: Decimal;
  dataAdmissao: Date;
  dataDesligamento: Date;
  tipoDesligamento: TipoDesligamento;
  saldoFGTS: Decimal;         // saldo acumulado na conta FGTS
  avisoPrevioTrabalhado: boolean;
  dependentes: number;
  ano: number;                // ano de referência para tabelas
  mediaVariavel?: Decimal;    // média de variáveis (HE, comissões etc.)
  feriasVencidas: boolean;    // se há férias vencidas (período aquisitivo completo não gozado)
}

export interface VerbasRescisao {
  label: string;
  valor: Decimal;
  base?: string; // descrição da base de cálculo
}

export interface ResultadoRescisao {
  verbas: VerbasRescisao[];
  totalBruto: Decimal;
  inss: Decimal;
  irrf: ResultadoIRRF;
  totalLiquido: Decimal;
  fgtsDepositos: Decimal;   // FGTS a ser depositado pelo empregador
  fgtsMulta: Decimal;       // multa rescisória sobre saldo FGTS
  fgtsTotal: Decimal;       // total a receber do FGTS
  avisoPreviosDias: number;
  diasTrabalhadosUltimoMes: number;
}

function calcularAvisoPrevio(dataAdmissao: Date, dataDesligamento: Date): number {
  const anos = dataDesligamento.getFullYear() - dataAdmissao.getFullYear();
  const meses = dataDesligamento.getMonth() - dataAdmissao.getMonth();
  const anosCompletos = Math.floor(anos + meses / 12);
  // Aviso prévio proporcional: 30 dias + 3 dias por ano completo, máximo 90 dias
  return Math.min(30 + anosCompletos * 3, 90);
}

function mesesCompletos(inicio: Date, fim: Date): number {
  const anos = fim.getFullYear() - inicio.getFullYear();
  const meses = fim.getMonth() - inicio.getMonth();
  return Math.max(0, anos * 12 + meses);
}

function diasNoMes(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
}

export function calcularRescisao(params: ParamsRescisao): ResultadoRescisao {
  const {
    salarioBase,
    dataAdmissao,
    dataDesligamento,
    tipoDesligamento,
    saldoFGTS,
    avisoPrevioTrabalhado,
    dependentes,
    ano,
    mediaVariavel = new Decimal(0),
    feriasVencidas,
  } = params;

  const remuneracao = roundMoney(salarioBase.plus(mediaVariavel));
  const verbas: VerbasRescisao[] = [];

  // ── 1. Saldo de salário (dias trabalhados no mês da rescisão) ──────────────
  const diaDesligamento = dataDesligamento.getDate();
  const diasNoMesDeslig = diasNoMes(dataDesligamento);
  const diasTrabalhados = diaDesligamento;
  const saldoSalario = roundMoney(
    remuneracao.div(diasNoMesDeslig).times(diasTrabalhados)
  );
  verbas.push({
    label: "Saldo de Salário",
    valor: saldoSalario,
    base: `${diasTrabalhados} dias × R$${remuneracao}/mês`,
  });

  const avisoPreviosDias = calcularAvisoPrevio(dataAdmissao, dataDesligamento);
  let fgtsDepositosExtra = new Decimal(0);
  let fgtsMulta = new Decimal(0);

  // ── 2. Aviso prévio ────────────────────────────────────────────────────────
  const temAvisoPrevio =
    tipoDesligamento === "sem_justa_causa" ||
    (tipoDesligamento === "acordo_mutuo");

  if (temAvisoPrevio && !avisoPrevioTrabalhado) {
    const valorAvisoPrevio = roundMoney(remuneracao.div(30).times(avisoPreviosDias));
    const aliquota = tipoDesligamento === "acordo_mutuo" ? "50%" : "100%";
    const valorFinal =
      tipoDesligamento === "acordo_mutuo"
        ? roundMoney(valorAvisoPrevio.times("0.5"))
        : valorAvisoPrevio;
    verbas.push({
      label: `Aviso Prévio Indenizado${tipoDesligamento === "acordo_mutuo" ? " (50% — acordo mútuo)" : ""}`,
      valor: valorFinal,
      base: `${avisoPreviosDias} dias (${aliquota})`,
    });
    // FGTS sobre aviso prévio indenizado
    fgtsDepositosExtra = roundMoney(valorFinal.times(ALIQUOTA_FGTS));
  }

  // ── 3. 13º Salário Proporcional ────────────────────────────────────────────
  const fazJus13 =
    tipoDesligamento !== "justa_causa" &&
    tipoDesligamento !== "pedido_demissao" ||
    tipoDesligamento === "pedido_demissao"; // pedido demissão tem direito ao 13º prop.
  // Todos exceto justa causa têm direito ao 13º prop.
  const temDireito13 = tipoDesligamento !== "justa_causa";

  if (temDireito13) {
    const mesesAno = dataDesligamento.getMonth() + 1; // meses de jan até o mês da rescisão
    const decimo13 = roundMoney(remuneracao.div(12).times(mesesAno));
    verbas.push({
      label: "13º Salário Proporcional",
      valor: decimo13,
      base: `${mesesAno}/12 avos`,
    });
  }

  // ── 4. Férias Vencidas + 1/3 ──────────────────────────────────────────────
  if (feriasVencidas) {
    const feriasVenc = roundMoney(remuneracao.times(new Decimal(4).div(3)));
    verbas.push({
      label: "Férias Vencidas + 1/3 Constitucional",
      valor: feriasVenc,
      base: "Período aquisitivo completo não gozado",
    });
  }

  // ── 5. Férias Proporcionais + 1/3 ─────────────────────────────────────────
  const temFeriasProp = tipoDesligamento !== "justa_causa";
  if (temFeriasProp) {
    const mesesContrato = mesesCompletos(dataAdmissao, dataDesligamento);
    const mesesPeriodoAquisitivo = mesesContrato % 12; // meses desde o último aniversário
    const feriasProporcionais = roundMoney(
      remuneracao.div(12).times(mesesPeriodoAquisitivo).times(new Decimal(4).div(3))
    );
    if (feriasProporcionais.gt(0)) {
      verbas.push({
        label: "Férias Proporcionais + 1/3",
        valor: feriasProporcionais,
        base: `${mesesPeriodoAquisitivo}/12 avos × 4/3`,
      });
    }
  }

  // ── 6. FGTS e Multa ────────────────────────────────────────────────────────
  const mesesContrato = mesesCompletos(dataAdmissao, dataDesligamento);
  const fgtsDepositosPeriodo = calcularFGTS(remuneracao, mesesContrato);
  const fgtsBase = saldoFGTS.plus(fgtsDepositosExtra);

  if (tipoDesligamento === "sem_justa_causa") {
    fgtsMulta = roundMoney(fgtsBase.times("0.40"));
  } else if (tipoDesligamento === "acordo_mutuo") {
    fgtsMulta = roundMoney(fgtsBase.times("0.20")); // art. 484-A CLT
  }

  // ── Totais ─────────────────────────────────────────────────────────────────
  const totalBruto = verbas.reduce((acc, v) => acc.plus(v.valor), new Decimal(0));
  const inss = calcularINSS(totalBruto, ano);
  const irrf = calcularIRRF(totalBruto, inss, dependentes, ano);
  const totalLiquido = roundMoney(totalBruto.minus(inss).minus(irrf.imposto));

  const fgtsTotal = roundMoney(fgtsBase.plus(fgtsMulta));

  return {
    verbas,
    totalBruto: roundMoney(totalBruto),
    inss,
    irrf,
    totalLiquido,
    fgtsDepositos: fgtsDepositosPeriodo,
    fgtsMulta,
    fgtsTotal,
    avisoPreviosDias,
    diasTrabalhadosUltimoMes: diasTrabalhados,
  };
}

// ─── Liquidação de Sentença Trabalhista ───────────────────────────────────────

export interface VerbaLiquidacao {
  descricao: string;
  valorBruto: Decimal;
  competencia?: string; // período a que se refere
}

export interface ParamsLiquidacao {
  verbas: VerbaLiquidacao[];
  dataBase: Date;             // data da condenação/propositura
  dataCalculo: Date;          // data do cálculo
  incluirFGTS: boolean;
  multaFGTS: boolean;         // 40% sobre FGTS das diferenças
  salarioBaseAtual: Decimal;  // para cálculo de INSS/IRRF
  dependentes: number;
  ano: number;
}

export interface ResultadoLiquidacao {
  verbas: VerbaLiquidacao[];
  subtotalVerbas: Decimal;
  fgtsVerbas: Decimal;
  multaFGTS: Decimal;
  subtotalComFGTS: Decimal;
  inss: Decimal;
  irrf: ResultadoIRRF;
  totalBruto: Decimal;
  totalLiquido: Decimal;
  notaCorrecao: string;
}

/**
 * Liquidação de sentença trabalhista.
 * Correção: IPCA-E (pré-judicial) + SELIC (fase de execução).
 * Ref.: Súmula 439 TST; OJ 300 SDI-1; decisão STF ADC 58/2020.
 *
 * NOTA: A correção monetária precisa de acesso aos índices do Supabase.
 * Esta função calcula o pipeline de verbas sem correção para uso síncrono.
 * Para correção completa, use a função `correcaoMonetaria` de civel.ts.
 */
export function calcularLiquidacaoSentenca(params: ParamsLiquidacao): ResultadoLiquidacao {
  const { verbas, incluirFGTS, multaFGTS: aplicarMultaFGTS, dependentes, ano } = params;

  const subtotalVerbas = verbas.reduce(
    (acc, v) => acc.plus(v.valorBruto),
    new Decimal(0)
  );

  let fgtsVerbas = new Decimal(0);
  let multaFGTS = new Decimal(0);

  if (incluirFGTS) {
    fgtsVerbas = roundMoney(subtotalVerbas.times(ALIQUOTA_FGTS));
    if (aplicarMultaFGTS) {
      multaFGTS = roundMoney(fgtsVerbas.times("0.40"));
    }
  }

  const subtotalComFGTS = roundMoney(subtotalVerbas.plus(fgtsVerbas).plus(multaFGTS));

  const inss = calcularINSS(subtotalVerbas, ano);
  const irrf = calcularIRRF(subtotalVerbas, inss, dependentes, ano);

  const totalBruto = subtotalComFGTS;
  const totalLiquido = roundMoney(subtotalComFGTS.minus(inss).minus(irrf.imposto));

  const notaCorrecao =
    "Correção monetária: IPCA-E (fase pré-judicial) + SELIC (fase de execução), " +
    "conforme ADC 58/2020 (STF) e Súmula 439 TST. " +
    "Para períodos a partir de 30/08/2024: IPCA + Taxa Legal (Lei 14.905/2024).";

  return {
    verbas,
    subtotalVerbas: roundMoney(subtotalVerbas),
    fgtsVerbas,
    multaFGTS,
    subtotalComFGTS,
    inss,
    irrf,
    totalBruto,
    totalLiquido,
    notaCorrecao,
  };
}
