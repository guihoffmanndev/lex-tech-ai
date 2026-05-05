import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import {
  icms,
  icmsST,
  difal,
  type ResultadoIcms,
  type ResultadoIcmsST,
  type ResultadoDifal,
} from "@/lib/calculators/tributario";
import { formatBRL } from "@/lib/calculators/engine";
import { LinhaResultado } from "@/components/calculadora/shared/LinhaResultado";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const schemaIcms = z.object({
  valorOperacao: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor da operação"),
  aliquota: z.coerce.number().min(0.1).max(35, "Alíquota inválida"),
});

const schemaST = z.object({
  valorProduto: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor do produto"),
  mva: z.coerce.number().min(0, "MVA inválida"),
  aliquotaInterna: z.coerce.number().min(1).max(35),
  aliquotaInterestadual: z.coerce.number().min(0).max(12).optional(),
  despesasAcessorias: z.string().optional(),
  interestadual: z.boolean().default(false),
});

const schemaDifal = z.object({
  baseCalculo: z.string().refine((v) => parseFloat(v) > 0, "Informe a base de cálculo"),
  aliquotaInterna: z.coerce.number().min(1).max(35),
  aliquotaInterestadual: z.coerce.number().min(4).max(12),
  fecop: z.coerce.number().min(0).max(5).default(0),
});

type FormIcms = z.infer<typeof schemaIcms>;
type FormST = z.infer<typeof schemaST>;
type FormDifal = z.infer<typeof schemaDifal>;

type SubTab = "icms" | "st" | "difal";

// ─── ICMS por dentro ─────────────────────────────────────────────────────────

function IcmsPorDentroForm() {
  const [resultado, setResultado] = useState<ResultadoIcms | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormIcms>({
    resolver: zodResolver(schemaIcms),
    defaultValues: { valorOperacao: "0", aliquota: 12 },
  });

  const valorField = watch("valorOperacao");

  const onSubmit = (data: FormIcms) => {
    try {
      const res = icms(new Decimal(data.valorOperacao), new Decimal(data.aliquota));
      setResultado(res);
    } catch (err) {
      toast.error("Erro ao calcular.");
    }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "icms-por-dentro",
        titulo: `ICMS ${watch("aliquota")}% — BC ${formatBRL(resultado.baseCalculo)}`,
        inputs_json: { valorOperacao: valorField, aliquota: watch("aliquota") },
        resultado_json: { baseCalculo: resultado.baseCalculo.toString(), icms: resultado.icms.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Valor da operação (sem ICMS embutido)</Label>
          <CurrencyInput value={valorField} onChange={(v) => setValue("valorOperacao", v, { shouldValidate: true })} />
          {errors.valorOperacao && <p className="text-xs text-destructive">{errors.valorOperacao.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Alíquota ICMS (%)</Label>
          <Input type="number" min={0.1} max={35} step={0.1} placeholder="Ex: 12" {...register("aliquota")} />
          {errors.aliquota && <p className="text-xs text-destructive">{errors.aliquota.message}</p>}
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
          Cálculo "por dentro": BC = Valor ÷ (1 − alíquota). O ICMS integra sua própria base de cálculo.
        </div>
        <Button type="submit" className="w-full">Calcular ICMS</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label="Valor da operação" valor={formatBRL(resultado.valorOperacao)} />
            <LinhaResultado label="Base de cálculo (por dentro)" valor={formatBRL(resultado.baseCalculo)} />
            <LinhaResultado label={`ICMS (${resultado.aliquota.times(100).toString()}%)`} valor={formatBRL(resultado.icms)} destaque />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── ICMS-ST ─────────────────────────────────────────────────────────────────

function IcmsStForm() {
  const [resultado, setResultado] = useState<ResultadoIcmsST | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormST>({
    resolver: zodResolver(schemaST),
    defaultValues: { valorProduto: "0", mva: 40, aliquotaInterna: 18, aliquotaInterestadual: 12, despesasAcessorias: "0", interestadual: false },
  });

  const valorField = watch("valorProduto");
  const despField = watch("despesasAcessorias");
  const isInterestadual = watch("interestadual");

  const onSubmit = (data: FormST) => {
    try {
      const res = icmsST(
        new Decimal(data.valorProduto),
        new Decimal(data.mva),
        new Decimal(data.aliquotaInterna),
        data.interestadual && data.aliquotaInterestadual ? new Decimal(data.aliquotaInterestadual) : undefined,
        new Decimal(data.despesasAcessorias || "0")
      );
      setResultado(res);
    } catch (err) {
      toast.error("Erro ao calcular.");
    }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "icms-st",
        titulo: `ICMS-ST MVA ${watch("mva")}% — Total ${formatBRL(resultado.totalST)}`,
        inputs_json: { valorProduto: valorField, mva: watch("mva"), aliquotaInterna: watch("aliquotaInterna") },
        resultado_json: { icmsST: resultado.icmsST.toString(), totalST: resultado.totalST.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Valor do produto</Label>
          <CurrencyInput value={valorField} onChange={(v) => setValue("valorProduto", v, { shouldValidate: true })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>MVA (%)</Label>
            <Input type="number" step={0.01} min={0} placeholder="Ex: 40" {...register("mva")} />
          </div>
          <div className="space-y-1.5">
            <Label>Alíquota interna (%)</Label>
            <Input type="number" step={0.1} min={1} max={35} placeholder="Ex: 18" {...register("aliquotaInterna")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Despesas acessórias (IPI, frete, seguro)</Label>
          <CurrencyInput value={despField || "0"} onChange={(v) => setValue("despesasAcessorias", v)} />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="interestadual" {...register("interestadual")} className="h-4 w-4" />
          <Label htmlFor="interestadual" className="cursor-pointer">Operação interestadual (aplica MVA ajustada)</Label>
        </div>

        {isInterestadual && (
          <div className="space-y-1.5">
            <Label>Alíquota interestadual (7% ou 12%)</Label>
            <Input type="number" step={0.1} min={4} max={12} placeholder="Ex: 12" {...register("aliquotaInterestadual")} />
          </div>
        )}

        <Button type="submit" className="w-full">Calcular ICMS-ST</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label={`Base de cálculo ST (com MVA${resultado.mvaAjustada ? " ajustada" : ""})`} valor={formatBRL(resultado.baseCalculoST)} />
            {resultado.mvaAjustada && (
              <LinhaResultado label="MVA ajustada" valor={`${resultado.mvaAjustada.toDecimalPlaces(2).toString()}%`} />
            )}
            <LinhaResultado label="ICMS operação própria" valor={formatBRL(resultado.icmsOperacaoPropria)} />
            <LinhaResultado label="ICMS-ST a recolher" valor={formatBRL(resultado.icmsST)} destaque />
            <LinhaResultado label="Total (produto + ST)" valor={formatBRL(resultado.totalST)} />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── DIFAL ────────────────────────────────────────────────────────────────────

function DifalForm() {
  const [resultado, setResultado] = useState<ResultadoDifal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormDifal>({
    resolver: zodResolver(schemaDifal),
    defaultValues: { baseCalculo: "0", aliquotaInterna: 18, aliquotaInterestadual: 12, fecop: 0 },
  });

  const baseField = watch("baseCalculo");

  const onSubmit = (data: FormDifal) => {
    try {
      const res = difal(
        new Decimal(data.baseCalculo),
        new Decimal(data.aliquotaInterna),
        new Decimal(data.aliquotaInterestadual),
        new Decimal(data.fecop)
      );
      setResultado(res);
    } catch { toast.error("Erro ao calcular."); }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "difal",
        titulo: `DIFAL — ${formatBRL(resultado.difal)}`,
        inputs_json: { baseCalculo: baseField, aliquotaInterna: watch("aliquotaInterna"), aliquotaInterestadual: watch("aliquotaInterestadual") },
        resultado_json: { difal: resultado.difal.toString(), fecop: resultado.fecop.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Base de cálculo da operação</Label>
          <CurrencyInput value={baseField} onChange={(v) => setValue("baseCalculo", v, { shouldValidate: true })} />
          {errors.baseCalculo && <p className="text-xs text-destructive">{errors.baseCalculo.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Alíquota interna destino (%)</Label>
            <Input type="number" step={0.1} min={1} max={35} placeholder="Ex: 18" {...register("aliquotaInterna")} />
          </div>
          <div className="space-y-1.5">
            <Label>Alíquota interestadual (%)</Label>
            <Input type="number" step={0.1} min={4} max={12} placeholder="7 ou 12" {...register("aliquotaInterestadual")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>FECOP — Fundo de Combate à Pobreza (%)</Label>
          <Input type="number" step={0.1} min={0} max={5} placeholder="0 se não aplicável" {...register("fecop")} />
        </div>
        <Button type="submit" className="w-full">Calcular DIFAL</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label="Base de cálculo" valor={formatBRL(resultado.baseCalculo)} />
            <LinhaResultado label={`Alíq. interna (${resultado.aliquotaInterna.toString()}%)`} valor="" />
            <LinhaResultado label={`Alíq. interestadual (${resultado.aliquotaInterestadual.toString()}%)`} valor="" />
            <LinhaResultado label="DIFAL" valor={formatBRL(resultado.difal)} destaque />
            {resultado.fecop.gt(0) && <LinhaResultado label="FECOP" valor={formatBRL(resultado.fecop)} />}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────

export function IcmsForm() {
  const [subTab, setSubTab] = useState<SubTab>("icms");

  const TABS: { id: SubTab; label: string }[] = [
    { id: "icms", label: "ICMS por dentro" },
    { id: "st", label: "Substituição Tributária" },
    { id: "difal", label: "DIFAL" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ICMS — Cálculos Estaduais</CardTitle>
          <CardDescription>ICMS por dentro, Substituição Tributária com MVA e DIFAL interestadual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 mb-5">
            {TABS.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={subTab === t.id ? "default" : "outline"}
                className="text-xs"
                onClick={() => setSubTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {subTab === "icms" && <IcmsPorDentroForm />}
          {subTab === "st" && <IcmsStForm />}
          {subTab === "difal" && <DifalForm />}
        </CardContent>
      </Card>
    </div>
  );
}
