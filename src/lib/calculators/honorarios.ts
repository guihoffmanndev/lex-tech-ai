import Decimal from "decimal.js";
import { roundMoney } from "./engine";

// ─── Constants ───────────────────────────────────────────────────────────────

const SM_2025 = new Decimal("1518");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FaixaOAB {
  descricao: string;
  percentualMin: number;
  percentualMax: number;
  /** Valor mínimo fixo em R$. Para cível/trabalhista: piso mesmo se % < mínimo. Para criminal/consultoria: valor base (percentualMin = 0). */
  valorFixoMin?: number;
  /** Valor máximo fixo em R$. Usado apenas quando percentualMin = 0 (criminal/consultoria). */
  valorFixoMax?: number;
  /** Limite superior do valor da causa para esta faixa. Undefined = última faixa (sem limite). */
  limiteMax?: number;
}

export interface TabelaEstadual {
  estado: string;
  nome: string;
  fonte: string;
  faixas: {
    civel: FaixaOAB[];
    trabalhista: FaixaOAB[];
    criminal: FaixaOAB[];
    consultoria: FaixaOAB[];
  };
}

export type AreaJuridica = "civel" | "trabalhista" | "criminal" | "consultoria";

export interface ResultadoHonorariosContratuais {
  valorCausa: Decimal;
  percentualAplicado: number;
  honorariosMin: Decimal;
  honorariosMax: Decimal;
  honorariosNegociado?: Decimal;
  tabelaReferencia: string;
  faixaAplicada: FaixaOAB;
  legislacao: string;
  abaixoMinimo: boolean;
}

export interface ResultadoHonorariosSucumbenciais {
  valorBase: Decimal;
  faixas: Array<{
    descricao: string;
    percentualMin: Decimal;
    percentualMax: Decimal;
    valorMin: Decimal;
    valorMax: Decimal;
  }>;
  totalMin: Decimal;
  totalMax: Decimal;
  reducaoGrau?: Decimal;
  legislacao: string;
}

// ─── Faixas nacionais (fallback OAB Federal — Resolução CFA 02/2015) ─────────

const FAIXAS_NACIONAIS_CIVEL: FaixaOAB[] = [
  {
    descricao: "Causas até R$ 20.000",
    percentualMin: 20,
    percentualMax: 20,
    limiteMax: 20000,
  },
  {
    descricao: "Causas de R$ 20.001 a R$ 100.000",
    percentualMin: 15,
    percentualMax: 15,
    limiteMax: 100000,
  },
  {
    descricao: "Causas acima de R$ 100.000",
    percentualMin: 10,
    percentualMax: 10,
    valorFixoMin: 1500,
  },
];

const FAIXAS_NACIONAIS_TRABALHISTA: FaixaOAB[] = [
  {
    descricao: "Causas trabalhistas",
    percentualMin: 20,
    percentualMax: 30,
    valorFixoMin: 1200,
  },
];

const FAIXAS_NACIONAIS_CRIMINAL: FaixaOAB[] = [
  {
    descricao: "Por fase processual (inquérito / 1º grau / recurso / STJ / STF)",
    percentualMin: 0,
    percentualMax: 0,
    valorFixoMin: 3000,
    valorFixoMax: 10000,
  },
];

const FAIXAS_NACIONAIS_CONSULTORIA: FaixaOAB[] = [
  {
    descricao: "Pareceres e consultas jurídicas",
    percentualMin: 0,
    percentualMax: 0,
    valorFixoMin: 1500,
    valorFixoMax: 5000,
  },
];

function tabelaFallback(estado: string, nome: string): TabelaEstadual {
  return {
    estado,
    nome,
    fonte: "Resolução CFA 02/2015 (tabela nacional de referência OAB Federal)",
    faixas: {
      civel: FAIXAS_NACIONAIS_CIVEL,
      trabalhista: FAIXAS_NACIONAIS_TRABALHISTA,
      criminal: FAIXAS_NACIONAIS_CRIMINAL,
      consultoria: FAIXAS_NACIONAIS_CONSULTORIA,
    },
  };
}

// ─── TABELAS_OAB ──────────────────────────────────────────────────────────────

export const TABELAS_OAB: Record<string, TabelaEstadual> = {
  SP: {
    estado: "SP",
    nome: "São Paulo",
    fonte: "Tabela de Honorários OAB-SP (2023)",
    faixas: {
      civel: [
        {
          descricao: "Causas até R$ 30.000",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 3000,
          limiteMax: 30000,
        },
        {
          descricao: "Causas de R$ 30.001 a R$ 100.000",
          percentualMin: 15,
          percentualMax: 20,
          limiteMax: 100000,
        },
        {
          descricao: "Causas acima de R$ 100.000",
          percentualMin: 10,
          percentualMax: 15,
        },
      ],
      trabalhista: [
        {
          descricao: "Causas trabalhistas",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 2000,
        },
      ],
      criminal: [
        {
          descricao: "Por fase processual",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 5000,
          valorFixoMax: 15000,
        },
      ],
      consultoria: [
        {
          descricao: "Pareceres e contratos",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 2000,
          valorFixoMax: 8000,
        },
      ],
    },
  },
  RJ: {
    estado: "RJ",
    nome: "Rio de Janeiro",
    fonte: "Tabela de Honorários OAB-RJ (2023)",
    faixas: {
      civel: [
        {
          descricao: "Causas até R$ 20.000",
          percentualMin: 20,
          percentualMax: 25,
          valorFixoMin: 2500,
          limiteMax: 20000,
        },
        {
          descricao: "Causas de R$ 20.001 a R$ 100.000",
          percentualMin: 15,
          percentualMax: 20,
          limiteMax: 100000,
        },
        {
          descricao: "Causas acima de R$ 100.000",
          percentualMin: 10,
          percentualMax: 15,
        },
      ],
      trabalhista: [
        {
          descricao: "Causas trabalhistas",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 1500,
        },
      ],
      criminal: [
        {
          descricao: "Por fase processual",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 4000,
          valorFixoMax: 12000,
        },
      ],
      consultoria: [
        {
          descricao: "Pareceres e consultas",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 1800,
          valorFixoMax: 6000,
        },
      ],
    },
  },
  MG: {
    estado: "MG",
    nome: "Minas Gerais",
    fonte: "Tabela de Honorários OAB-MG (2023)",
    faixas: {
      civel: [
        {
          descricao: "Causas até R$ 20.000",
          percentualMin: 20,
          percentualMax: 25,
          valorFixoMin: 2000,
          limiteMax: 20000,
        },
        {
          descricao: "Causas de R$ 20.001 a R$ 80.000",
          percentualMin: 15,
          percentualMax: 20,
          limiteMax: 80000,
        },
        {
          descricao: "Causas acima de R$ 80.000",
          percentualMin: 10,
          percentualMax: 15,
        },
      ],
      trabalhista: [
        {
          descricao: "Causas trabalhistas",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 1500,
        },
      ],
      criminal: [
        {
          descricao: "Por fase processual",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 3500,
          valorFixoMax: 10000,
        },
      ],
      consultoria: [
        {
          descricao: "Pareceres e consultas",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 1500,
          valorFixoMax: 5000,
        },
      ],
    },
  },
  RS: {
    estado: "RS",
    nome: "Rio Grande do Sul",
    fonte: "Tabela de Honorários OAB-RS (2023)",
    faixas: {
      civel: [
        {
          descricao: "Causas até R$ 20.000",
          percentualMin: 20,
          percentualMax: 25,
          valorFixoMin: 2000,
          limiteMax: 20000,
        },
        {
          descricao: "Causas de R$ 20.001 a R$ 100.000",
          percentualMin: 15,
          percentualMax: 20,
          limiteMax: 100000,
        },
        {
          descricao: "Causas acima de R$ 100.000",
          percentualMin: 10,
          percentualMax: 15,
        },
      ],
      trabalhista: [
        {
          descricao: "Causas trabalhistas",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 1500,
        },
      ],
      criminal: [
        {
          descricao: "Por fase processual",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 4000,
          valorFixoMax: 12000,
        },
      ],
      consultoria: [
        {
          descricao: "Pareceres e consultas",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 2000,
          valorFixoMax: 6000,
        },
      ],
    },
  },
  PR: {
    estado: "PR",
    nome: "Paraná",
    fonte: "Tabela de Honorários OAB-PR (2023)",
    faixas: {
      civel: [
        {
          descricao: "Causas até R$ 20.000",
          percentualMin: 20,
          percentualMax: 25,
          valorFixoMin: 2000,
          limiteMax: 20000,
        },
        {
          descricao: "Causas de R$ 20.001 a R$ 80.000",
          percentualMin: 15,
          percentualMax: 20,
          limiteMax: 80000,
        },
        {
          descricao: "Causas acima de R$ 80.000",
          percentualMin: 10,
          percentualMax: 15,
        },
      ],
      trabalhista: [
        {
          descricao: "Causas trabalhistas",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 1500,
        },
      ],
      criminal: [
        {
          descricao: "Por fase processual",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 3500,
          valorFixoMax: 10000,
        },
      ],
      consultoria: [
        {
          descricao: "Pareceres e consultas",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 1800,
          valorFixoMax: 5000,
        },
      ],
    },
  },
  DF: {
    estado: "DF",
    nome: "Distrito Federal",
    fonte: "Tabela de Honorários OAB-DF (2023)",
    faixas: {
      civel: [
        {
          descricao: "Causas até R$ 20.000",
          percentualMin: 20,
          percentualMax: 25,
          valorFixoMin: 2500,
          limiteMax: 20000,
        },
        {
          descricao: "Causas de R$ 20.001 a R$ 100.000",
          percentualMin: 15,
          percentualMax: 20,
          limiteMax: 100000,
        },
        {
          descricao: "Causas acima de R$ 100.000",
          percentualMin: 10,
          percentualMax: 15,
        },
      ],
      trabalhista: [
        {
          descricao: "Causas trabalhistas",
          percentualMin: 20,
          percentualMax: 30,
          valorFixoMin: 1500,
        },
      ],
      criminal: [
        {
          descricao: "Por fase processual",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 4000,
          valorFixoMax: 12000,
        },
      ],
      consultoria: [
        {
          descricao: "Pareceres e consultas",
          percentualMin: 0,
          percentualMax: 0,
          valorFixoMin: 2000,
          valorFixoMax: 6000,
        },
      ],
    },
  },
  // Fallback nacional (Resolução CFA 02/2015)
  AC: tabelaFallback("AC", "Acre"),
  AL: tabelaFallback("AL", "Alagoas"),
  AM: tabelaFallback("AM", "Amazonas"),
  AP: tabelaFallback("AP", "Amapá"),
  BA: tabelaFallback("BA", "Bahia"),
  CE: tabelaFallback("CE", "Ceará"),
  ES: tabelaFallback("ES", "Espírito Santo"),
  GO: tabelaFallback("GO", "Goiás"),
  MA: tabelaFallback("MA", "Maranhão"),
  MS: tabelaFallback("MS", "Mato Grosso do Sul"),
  MT: tabelaFallback("MT", "Mato Grosso"),
  PA: tabelaFallback("PA", "Pará"),
  PB: tabelaFallback("PB", "Paraíba"),
  PE: tabelaFallback("PE", "Pernambuco"),
  PI: tabelaFallback("PI", "Piauí"),
  RN: tabelaFallback("RN", "Rio Grande do Norte"),
  RO: tabelaFallback("RO", "Rondônia"),
  RR: tabelaFallback("RR", "Roraima"),
  SC: tabelaFallback("SC", "Santa Catarina"),
  SE: tabelaFallback("SE", "Sergipe"),
  TO: tabelaFallback("TO", "Tocantins"),
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function encontrarFaixa(faixas: FaixaOAB[], valorCausa: Decimal): FaixaOAB {
  for (const faixa of faixas) {
    if (faixa.limiteMax === undefined || valorCausa.lte(faixa.limiteMax)) {
      return faixa;
    }
  }
  return faixas[faixas.length - 1];
}

function calcularValoresFaixa(
  faixa: FaixaOAB,
  valorCausa: Decimal
): { min: Decimal; max: Decimal } {
  if (faixa.percentualMin === 0) {
    // Área de honorários fixos (criminal / consultoria)
    return {
      min: new Decimal(faixa.valorFixoMin ?? 0),
      max: new Decimal(faixa.valorFixoMax ?? faixa.valorFixoMin ?? 0),
    };
  }

  let min = roundMoney(valorCausa.times(faixa.percentualMin / 100));
  let max = roundMoney(valorCausa.times(faixa.percentualMax / 100));

  // Aplica piso mínimo fixo se o % resultou em valor menor
  if (faixa.valorFixoMin && min.lt(faixa.valorFixoMin)) {
    min = new Decimal(faixa.valorFixoMin);
    if (max.lt(min)) max = min;
  }

  return { min, max };
}

// ─── Exported functions ───────────────────────────────────────────────────────

export function honorariosContratuais(params: {
  valorCausa: Decimal;
  estado: string;
  areaJuridica: AreaJuridica;
  percentualNegociado?: number;
}): ResultadoHonorariosContratuais {
  const tabela = TABELAS_OAB[params.estado] ?? tabelaFallback(params.estado, params.estado);
  const faixas = tabela.faixas[params.areaJuridica];
  const faixa = encontrarFaixa(faixas, params.valorCausa);
  const { min, max } = calcularValoresFaixa(faixa, params.valorCausa);

  let honorariosNegociado: Decimal | undefined;
  let abaixoMinimo = false;

  if (params.percentualNegociado !== undefined) {
    if (faixa.percentualMin === 0 && faixa.valorFixoMin !== undefined) {
      // Área de honorários fixos: percentualNegociado é ignorado
      // abaixoMinimo permanece false
    } else {
      honorariosNegociado = roundMoney(
        params.valorCausa.times(params.percentualNegociado / 100)
      );
      abaixoMinimo = params.percentualNegociado < faixa.percentualMin;
    }
  }

  return {
    valorCausa: params.valorCausa,
    percentualAplicado: params.percentualNegociado ?? faixa.percentualMin,
    honorariosMin: min,
    honorariosMax: max,
    honorariosNegociado,
    tabelaReferencia: tabela.nome,
    faixaAplicada: faixa,
    legislacao: `Tabela de Honorários OAB-${params.estado} — ${faixa.descricao}`,
    abaixoMinimo,
  };
}

export function honorariosSucumbenciais(params: {
  valorCondenacao: Decimal;
  tipoAcao: "normal" | "fazenda";
  grau: "primeiro" | "segundo" | "stj_stf";
}): ResultadoHonorariosSucumbenciais {
  const { valorCondenacao, tipoAcao, grau } = params;

  type Faixa = ResultadoHonorariosSucumbenciais["faixas"][number];
  let faixas: Faixa[];

  if (tipoAcao === "normal") {
    faixas = [
      {
        descricao: "Honorários (art. 85 §2 CPC)",
        percentualMin: new Decimal("10"),
        percentualMax: new Decimal("20"),
        valorMin: roundMoney(valorCondenacao.times("0.10")),
        valorMax: roundMoney(valorCondenacao.times("0.20")),
      },
    ];
  } else {
    // Fazenda Pública — art. 85 §3
    const faixasSM = [
      {
        teto: SM_2025.times(200),
        desc: "Sobre os primeiros 200 SM",
        min: new Decimal("10"),
        max: new Decimal("20"),
      },
      {
        teto: SM_2025.times(2000),
        desc: "De 200 a 2.000 SM",
        min: new Decimal("8"),
        max: new Decimal("10"),
      },
      {
        teto: SM_2025.times(20000),
        desc: "De 2.000 a 20.000 SM",
        min: new Decimal("5"),
        max: new Decimal("8"),
      },
      {
        teto: SM_2025.times(100000),
        desc: "De 20.000 a 100.000 SM",
        min: new Decimal("3"),
        max: new Decimal("5"),
      },
    ];

    faixas = [];
    let anterior = new Decimal(0);
    let restante = valorCondenacao;

    for (const f of faixasSM) {
      if (anterior.gte(valorCondenacao)) break;
      const base = Decimal.min(valorCondenacao, f.teto).minus(anterior);
      if (base.lte(0)) {
        anterior = f.teto;
        continue;
      }
      faixas.push({
        descricao: f.desc,
        percentualMin: f.min,
        percentualMax: f.max,
        valorMin: roundMoney(base.times(f.min).div(100)),
        valorMax: roundMoney(base.times(f.max).div(100)),
      });
      anterior = f.teto;
      restante = restante.minus(base);
    }

    if (restante.gt(0)) {
      faixas.push({
        descricao: "Acima de 100.000 SM",
        percentualMin: new Decimal("1"),
        percentualMax: new Decimal("3"),
        valorMin: roundMoney(restante.times("0.01")),
        valorMax: roundMoney(restante.times("0.03")),
      });
    }
  }

  let totalMin = faixas.reduce((acc, f) => acc.plus(f.valorMin), new Decimal(0));
  let totalMax = faixas.reduce((acc, f) => acc.plus(f.valorMax), new Decimal(0));

  let reducaoGrau: Decimal | undefined;
  const legislacao =
    tipoAcao === "normal"
      ? "Art. 85 §2 CPC — 10 a 20% sobre o valor da condenação"
      : "Art. 85 §3 CPC — honorários escalonados por faixas de SM (Fazenda Pública)";

  let legislacaoFinal = legislacao;

  if (grau !== "primeiro") {
    const fator = grau === "segundo" ? new Decimal("0.5") : new Decimal("0.25");
    const novoMin = roundMoney(totalMin.times(fator));
    const novoMax = roundMoney(totalMax.times(fator));
    reducaoGrau = totalMin.minus(novoMin);
    totalMin = novoMin;
    totalMax = novoMax;
    const pct = grau === "segundo" ? "50%" : "25%";
    legislacaoFinal += ` — Art. 85 §11 CPC: honorários recursais (${pct} do valor de 1º grau, pelo trabalho adicional)`;
  }

  return { valorBase: valorCondenacao, faixas, totalMin, totalMax, reducaoGrau, legislacao: legislacaoFinal };
}

export function honorariosAlimentos(params: {
  prestacaoMensal: Decimal;
}): ResultadoHonorariosContratuais {
  const base = params.prestacaoMensal.times(12);
  const faixa: FaixaOAB = {
    descricao: "12 prestações mensais (base de cálculo — art. 85 §14)",
    percentualMin: 10,
    percentualMax: 20,
  };
  return {
    valorCausa: base,
    percentualAplicado: 10,
    honorariosMin: roundMoney(base.times("0.10")),
    honorariosMax: roundMoney(base.times("0.20")),
    tabelaReferencia: "Art. 85 §14 CPC",
    faixaAplicada: faixa,
    legislacao: "Art. 85 §14 CPC — base de cálculo: 12 prestações mensais",
    abaixoMinimo: false,
  };
}

export function comparativoHonorarios(params: {
  valorCausa: Decimal;
  estado: string;
  areaJuridica: AreaJuridica;
  percentuaisSimular: number[];
}): Array<{ percentual: number; valor: Decimal; abaixoMinimo: boolean }> {
  const tabela = TABELAS_OAB[params.estado] ?? tabelaFallback(params.estado, params.estado);
  const faixas = tabela.faixas[params.areaJuridica];
  const faixa = encontrarFaixa(faixas, params.valorCausa);

  return params.percentuaisSimular.map((p) => ({
    percentual: p,
    valor: roundMoney(params.valorCausa.times(p / 100)),
    abaixoMinimo: p < faixa.percentualMin,
  }));
}
