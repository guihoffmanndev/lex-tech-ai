import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  honorariosContratuais,
  honorariosSucumbenciais,
  honorariosAlimentos,
  comparativoHonorarios,
  TABELAS_OAB,
} from "./honorarios";

describe("TABELAS_OAB", () => {
  it("contém 27 UFs", () => {
    expect(Object.keys(TABELAS_OAB)).toHaveLength(27);
  });

  it("SP tem faixas cível específicas (3 faixas)", () => {
    expect(TABELAS_OAB.SP.faixas.civel).toHaveLength(3);
  });

  it("estado desconhecido não existe (AC usa fallback nacional)", () => {
    expect(TABELAS_OAB.AC.fonte).toContain("CFA");
  });
});

describe("honorariosContratuais", () => {
  it("causa de R$10.000 em SP cível — usa primeira faixa 20%", () => {
    const res = honorariosContratuais({
      valorCausa: new Decimal("10000"),
      estado: "SP",
      areaJuridica: "civel",
    });
    // mín: 20% de 10000 = 2000, mas valorFixoMin SP cível faixa 1 = 3000
    expect(res.honorariosMin.toNumber()).toBe(3000);
    expect(res.honorariosMax.toNumber()).toBe(3000); // 30% de 10000 = 3000
    expect(res.abaixoMinimo).toBe(false);
  });

  it("causa de R$50.000 em SP cível — usa segunda faixa 15–20%", () => {
    const res = honorariosContratuais({
      valorCausa: new Decimal("50000"),
      estado: "SP",
      areaJuridica: "civel",
    });
    expect(res.honorariosMin.toNumber()).toBe(7500); // 15% de 50000
    expect(res.honorariosMax.toNumber()).toBe(10000); // 20% de 50000
  });

  it("percentualNegociado abaixo do mínimo seta abaixoMinimo=true", () => {
    const res = honorariosContratuais({
      valorCausa: new Decimal("50000"),
      estado: "SP",
      areaJuridica: "civel",
      percentualNegociado: 10,
    });
    expect(res.abaixoMinimo).toBe(true);
    expect(res.honorariosNegociado?.toNumber()).toBe(5000);
  });

  it("percentualNegociado igual ao mínimo — abaixoMinimo=false", () => {
    const res = honorariosContratuais({
      valorCausa: new Decimal("50000"),
      estado: "SP",
      areaJuridica: "civel",
      percentualNegociado: 15,
    });
    expect(res.abaixoMinimo).toBe(false);
    expect(res.honorariosNegociado?.toNumber()).toBe(7500);
  });

  it("área criminal retorna valorFixo sem depender do percentual", () => {
    const res = honorariosContratuais({
      valorCausa: new Decimal("0"),
      estado: "SP",
      areaJuridica: "criminal",
    });
    expect(res.honorariosMin.toNumber()).toBe(5000);
    expect(res.honorariosMax.toNumber()).toBe(15000);
  });

  it("estado com fallback nacional — cível até 20k usa 20%", () => {
    const res = honorariosContratuais({
      valorCausa: new Decimal("15000"),
      estado: "AM",
      areaJuridica: "civel",
    });
    expect(res.honorariosMin.toNumber()).toBe(3000); // 20% de 15000
    expect(res.tabelaReferencia).toBe("Amazonas");
  });
});

describe("honorariosSucumbenciais", () => {
  it("causa normal R$50.000 — 10% a 20% = R$5.000 a R$10.000", () => {
    const res = honorariosSucumbenciais({
      valorCondenacao: new Decimal("50000"),
      tipoAcao: "normal",
      grau: "primeiro",
    });
    expect(res.totalMin.toNumber()).toBe(5000);
    expect(res.totalMax.toNumber()).toBe(10000);
    expect(res.reducaoGrau).toBeUndefined();
  });

  it("fazenda pública R$303.600 (200 SM) — apenas primeira faixa 10–20%", () => {
    // 200 SM × R$1.518 = R$303.600
    const res = honorariosSucumbenciais({
      valorCondenacao: new Decimal("303600"),
      tipoAcao: "fazenda",
      grau: "primeiro",
    });
    expect(res.faixas).toHaveLength(1);
    expect(res.faixas[0].valorMin.toNumber()).toBe(30360); // 10% de 303600
    expect(res.faixas[0].valorMax.toNumber()).toBe(60720); // 20% de 303600
  });

  it("fazenda pública acima de 200 SM — duas faixas", () => {
    // 201 SM = R$305.118
    const res = honorariosSucumbenciais({
      valorCondenacao: new Decimal("305118"),
      tipoAcao: "fazenda",
      grau: "primeiro",
    });
    expect(res.faixas.length).toBeGreaterThanOrEqual(2);
  });

  it("2º grau aplica 50% sobre totais e define reducaoGrau", () => {
    const res = honorariosSucumbenciais({
      valorCondenacao: new Decimal("50000"),
      tipoAcao: "normal",
      grau: "segundo",
    });
    expect(res.totalMin.toNumber()).toBe(2500); // 50% de 5000
    expect(res.totalMax.toNumber()).toBe(5000);  // 50% de 10000
    expect(res.reducaoGrau).toBeDefined();
    expect(res.reducaoGrau?.toNumber()).toBe(2500); // diferença em totalMin
  });

  it("STJ/STF aplica 25%", () => {
    const res = honorariosSucumbenciais({
      valorCondenacao: new Decimal("50000"),
      tipoAcao: "normal",
      grau: "stj_stf",
    });
    expect(res.totalMin.toNumber()).toBe(1250); // 25% de 5000
  });
});

describe("honorariosAlimentos", () => {
  it("prestação R$2.000 → base R$24.000 → honorários R$2.400–R$4.800", () => {
    const res = honorariosAlimentos({ prestacaoMensal: new Decimal("2000") });
    expect(res.valorCausa.toNumber()).toBe(24000);
    expect(res.honorariosMin.toNumber()).toBe(2400); // 10%
    expect(res.honorariosMax.toNumber()).toBe(4800); // 20%
    expect(res.legislacao).toContain("§14");
  });
});

describe("comparativoHonorarios", () => {
  it("retorna array com 5 entradas para SP cível R$50k", () => {
    const res = comparativoHonorarios({
      valorCausa: new Decimal("50000"),
      estado: "SP",
      areaJuridica: "civel",
      percentuaisSimular: [10, 15, 20, 25, 30],
    });
    expect(res).toHaveLength(5);
    expect(res[0].percentual).toBe(10);
    expect(res[0].valor.toNumber()).toBe(5000);
    expect(res[0].abaixoMinimo).toBe(true);  // 10% < 15% (mín SP faixa 2)
    expect(res[1].abaixoMinimo).toBe(false); // 15% = mín
    expect(res[2].abaixoMinimo).toBe(false); // 20% > mín
  });
});
