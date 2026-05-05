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
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import { cumprimentoSentenca } from "@/lib/calculators/civel";
import { formatBRL } from "@/lib/calculators/engine";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  debitoAtualizado: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor do débito"),
  dataIntimacao: z.string().min(1, "Informe a data da intimação"),
  dataReferencia: z.string().min(1, "Informe a data de referência"),
}).refine((d) => d.dataReferencia >= d.dataIntimacao, {
  message: "A data de referência deve ser igual ou posterior à intimação",
  path: ["dataReferencia"],
});

type FormValues = z.infer<typeof schema>;

// ─── Result Display ───────────────────────────────────────────────────────────

interface Resultado {
  debito: Decimal;
  multa: Decimal;
  honorarios: Decimal;
  total: Decimal;
  diasDecorridos: number;
  inadimplido: boolean;
}

function ResultadoCumprimento({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: Resultado;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resultado — Cumprimento de Sentença</CardTitle>
            <Badge variant={resultado.inadimplido ? "destructive" : "secondary"}>
              {resultado.inadimplido ? "Inadimplido (>15 dias)" : "Dentro do prazo"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Art. 523 CPC — multa 10% + honorários 10%</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo em grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Débito atualizado</p>
              <p className="mt-1 text-sm font-semibold">{formatBRL(resultado.debito)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Multa (10%)</p>
              <p className="mt-1 text-sm font-semibold text-destructive">{formatBRL(resultado.multa)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Honorários (10%)</p>
              <p className="mt-1 text-sm font-semibold text-destructive">{formatBRL(resultado.honorarios)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
              <p className="text-xs text-muted-foreground">Total devido</p>
              <p className="mt-1 text-sm font-bold text-primary">{formatBRL(resultado.total)}</p>
            </div>
          </div>

          <Separator />

          {/* Memória de cálculo */}
          <div className="space-y-2 text-sm">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Memória de cálculo</p>
            <div className="space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-xs">
              <div className="flex justify-between">
                <span>Débito (art. 523, caput)</span>
                <span>{formatBRL(resultado.debito)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>+ Multa 10% (art. 523 §1 CPC)</span>
                <span>+ {formatBRL(resultado.multa)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>+ Honorários 10% (art. 523 §1 CPC)</span>
                <span>+ {formatBRL(resultado.honorarios)}</span>
              </div>
              <Separator className="my-1.5" />
              <div className="flex justify-between font-bold">
                <span>= Total (120% do débito)</span>
                <span>{formatBRL(resultado.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>Atenção:</strong> A multa e honorários incidem apenas se o devedor não pagar
              voluntariamente no prazo de 15 dias após a intimação (art. 523 §1 CPC).
              Prazo decorrido: <strong>{resultado.diasDecorridos} dias</strong>.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onSalvar}
            disabled={isSaving}
          >
            {isSaving ? "Salvando…" : "Salvar no histórico"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CumprimentoSentencaForm() {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      debitoAtualizado: "0",
      dataIntimacao: "",
      dataReferencia: today,
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const debitoField = watch("debitoAtualizado");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const debito = new Decimal(data.debitoAtualizado);
      const { multa, honorarios, total } = cumprimentoSentenca(debito);

      const intimacao = new Date(data.dataIntimacao + "T00:00:00");
      const referencia = new Date(data.dataReferencia + "T00:00:00");
      const diasDecorridos = Math.floor(
        (referencia.getTime() - intimacao.getTime()) / (1000 * 60 * 60 * 24)
      );

      setResultado({
        debito,
        multa,
        honorarios,
        total,
        diasDecorridos,
        inadimplido: diasDecorridos > 15,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular.");
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

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "civel",
        tipo: "cumprimento-sentenca",
        titulo: selectedProcesso
          ? `Cumprimento de Sentença — ${selectedProcesso.numero_processo}`
          : `Cumprimento de Sentença — ${formatBRL(resultado.debito)}`,
        inputs_json: {
          debitoAtualizado: debitoField,
          dataIntimacao: watch("dataIntimacao"),
          dataReferencia: watch("dataReferencia"),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          debito: resultado.debito.toString(),
          multa: resultado.multa.toString(),
          honorarios: resultado.honorarios.toString(),
          total: resultado.total.toString(),
          diasDecorridos: resultado.diasDecorridos,
          inadimplido: resultado.inadimplido,
        },
        steps_json: [],
      });

      if (error) throw error;
      toast.success("Cálculo salvo no histórico!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumprimento de Sentença</CardTitle>
          <CardDescription>
            Multa de 10% + honorários de 10% sobre o débito atualizado (art. 523 §1 CPC)
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

            {/* Débito */}
            <div className="space-y-1.5">
              <Label htmlFor="debitoAtualizado">Débito Atualizado</Label>
              <CurrencyInput
                id="debitoAtualizado"
                value={debitoField}
                onChange={(v) => setValue("debitoAtualizado", v, { shouldValidate: true })}
              />
              {errors.debitoAtualizado && (
                <p className="text-xs text-destructive">{errors.debitoAtualizado.message}</p>
              )}
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data da Intimação</Label>
                <DatePicker
                  value={watch("dataIntimacao")}
                  onChange={(v) => setValue("dataIntimacao", v, { shouldValidate: true })}
                  max={today}
                />
                {errors.dataIntimacao && (
                  <p className="text-xs text-destructive">{errors.dataIntimacao.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Data de Referência</Label>
                <DatePicker
                  value={watch("dataReferencia")}
                  onChange={(v) => setValue("dataReferencia", v, { shouldValidate: true })}
                  max={today}
                />
                {errors.dataReferencia && (
                  <p className="text-xs text-destructive">{errors.dataReferencia.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              Informe o débito já atualizado monetariamente na data da intimação.
              Use a calculadora de Correção Monetária para atualizar o valor, se necessário.
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular"}
            </Button>
          </form>
        </CardContent>
      </Card>

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

      {resultado && !isCalculating && (
        <ResultadoCumprimento
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
