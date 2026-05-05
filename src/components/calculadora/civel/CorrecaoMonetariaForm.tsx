import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import { correcaoMonetaria, type TipoObrigacao, type ResultadoCorrecao } from "@/lib/calculators/civel";
import type { NomeIndice } from "@/lib/calculators/indices";
import { ResultadoCard } from "@/components/calculadora/shared/ResultadoCard";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    valor: z.string().refine((v) => parseFloat(v) > 0, "Informe um valor maior que zero"),
    dataInicial: z.string().min(1, "Informe a data inicial"),
    dataFinal: z.string().min(1, "Informe a data final"),
    indice: z.enum(["IPCA", "INPC", "IGP-M", "IPCA-E", "IPCA-15", "SELIC_META"]),
    tipoObrigacao: z.enum(["civil", "fazenda", "consumerista", "alimentar"]),
    incluirJuros: z.boolean(),
  })
  .refine((d) => d.dataFinal > d.dataInicial, {
    message: "A data final deve ser posterior à data inicial",
    path: ["dataFinal"],
  });

type FormValues = z.infer<typeof schema>;

// ─── Labels ──────────────────────────────────────────────────────────────────

const INDICES: { value: NomeIndice; label: string }[] = [
  { value: "IPCA", label: "IPCA — Índice de Preços ao Consumidor Amplo" },
  { value: "INPC", label: "INPC — Índice Nacional de Preços ao Consumidor" },
  { value: "IGP-M", label: "IGP-M — Índice Geral de Preços do Mercado" },
  { value: "IPCA-E", label: "IPCA-E — IPCA Especial" },
  { value: "IPCA-15", label: "IPCA-15 — IPCA Quinzenal" },
  { value: "SELIC_META", label: "SELIC — Taxa de Referência" },
];

const TIPOS_OBRIGACAO: { value: TipoObrigacao; label: string }[] = [
  { value: "civil", label: "Cível (1% a.m.)" },
  { value: "consumerista", label: "Consumerista (1% a.m.)" },
  { value: "fazenda", label: "Fazenda Pública (0,5% a.m.)" },
  { value: "alimentar", label: "Alimentos (0,5% a.m.)" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function CorrecaoMonetariaForm() {
  const [resultado, setResultado] = useState<ResultadoCorrecao | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valor: "0",
      dataInicial: "",
      dataFinal: "",
      indice: "IPCA",
      tipoObrigacao: "civil",
      incluirJuros: false,
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const incluirJuros = watch("incluirJuros");
  const valorField = watch("valor");

  const onSubmit = async (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const valor = new Decimal(data.valor);
      const dataInicial = new Date(data.dataInicial + "T00:00:00");
      const dataFinal = new Date(data.dataFinal + "T00:00:00");

      const res = await correcaoMonetaria(
        valor,
        dataInicial,
        dataFinal,
        data.indice as NomeIndice,
        data.incluirJuros,
        data.tipoObrigacao
      );
      setResultado(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular. Tente novamente.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Convert Decimal fields to string for JSON serialization
      const resultadoJson = {
        valorOriginal: resultado.valorOriginal.toString(),
        fatorCorrecao: resultado.fatorCorrecao.toString(),
        valorCorrigido: resultado.valorCorrigido.toString(),
        juros: resultado.juros.toString(),
        total: resultado.total.toString(),
        regimeJuros: resultado.regimeJuros,
        legislacao: resultado.legislacao,
      };

      const stepsJson = resultado.detalhes.map((d) => ({
        mes: d.mes,
        dataRef: d.dataRef,
        taxaMes: d.taxaMes.toString(),
        fatorMes: d.fatorMes.toString(),
        fatorAcumulado: d.fatorAcumulado.toString(),
        valorBase: d.valorBase.toString(),
      }));

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "civel",
        tipo: "correcao-monetaria",
        titulo: selectedProcesso
          ? `Correção ${watch("indice")} — ${selectedProcesso.numero_processo}`
          : `Correção ${watch("indice")} — ${watch("dataInicial")} a ${watch("dataFinal")}`,
        inputs_json: {
          valor: valorField,
          dataInicial: watch("dataInicial"),
          dataFinal: watch("dataFinal"),
          indice: watch("indice"),
          tipoObrigacao: watch("tipoObrigacao"),
          incluirJuros: watch("incluirJuros"),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: resultadoJson,
        steps_json: stepsJson,
      });

      if (error) throw error;
      toast.success("Cálculo salvo no histórico!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cálculo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Correção Monetária</CardTitle>
          <CardDescription>
            Corrija valores pelo índice escolhido com aplicação automática da Lei 14.905/2024
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Processo vinculado */}
            <div className="space-y-1.5">
              <Label>Processo vinculado</Label>
              <ProcessoSelector
                value={selectedProcesso?.id ?? "none"}
                onChange={setSelectedProcesso}
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor Original</Label>
              <CurrencyInput
                id="valor"
                value={valorField}
                onChange={(v) => setValue("valor", v, { shouldValidate: true })}
              />
              {errors.valor && (
                <p className="text-xs text-destructive">{errors.valor.message}</p>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data Inicial</Label>
                <DatePicker
                  value={watch("dataInicial")}
                  onChange={(v) => setValue("dataInicial", v, { shouldValidate: true })}
                  max={new Date().toISOString().split("T")[0]}
                />
                {errors.dataInicial && (
                  <p className="text-xs text-destructive">{errors.dataInicial.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Data Final</Label>
                <DatePicker
                  value={watch("dataFinal")}
                  onChange={(v) => setValue("dataFinal", v, { shouldValidate: true })}
                  max={new Date().toISOString().split("T")[0]}
                />
                {errors.dataFinal && (
                  <p className="text-xs text-destructive">{errors.dataFinal.message}</p>
                )}
              </div>
            </div>

            {/* Índice */}
            <div className="space-y-1.5">
              <Label htmlFor="indice">Índice de Correção</Label>
              <Select
                defaultValue="IPCA"
                onValueChange={(v) => setValue("indice", v as FormValues["indice"], { shouldValidate: true })}
              >
                <SelectTrigger id="indice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDICES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Juros de mora */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Incluir Juros de Mora</p>
                <p className="text-xs text-muted-foreground">
                  Aplica os juros legais sobre o valor corrigido
                </p>
              </div>
              <Switch
                checked={incluirJuros}
                onCheckedChange={(v) => setValue("incluirJuros", v)}
              />
            </div>

            {incluirJuros && (
              <div className="space-y-1.5">
                <Label htmlFor="tipoObrigacao">Tipo de Obrigação</Label>
                <Select
                  defaultValue="civil"
                  onValueChange={(v) =>
                    setValue("tipoObrigacao", v as FormValues["tipoObrigacao"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="tipoObrigacao">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OBRIGACAO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading */}
      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && !isCalculating && (
        <ResultadoCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
