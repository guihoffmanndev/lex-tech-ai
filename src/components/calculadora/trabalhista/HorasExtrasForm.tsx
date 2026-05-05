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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import { calcularHorasExtras, type ResultadoHorasExtras } from "@/lib/calculators/trabalhista";
import { formatBRL } from "@/lib/calculators/engine";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  salarioBase: z.string().refine((v) => parseFloat(v) > 0, "Informe o salário base"),
  horasExtras50: z.coerce.number().int().min(0),
  horasExtras100: z.coerce.number().int().min(0),
  mesesTrabalho: z.coerce.number().int().min(1, "Mínimo 1 mês"),
  diasUteis: z.coerce.number().int().min(20).max(31),
  diasRepouso: z.coerce.number().int().min(0).max(10),
});

type FormValues = z.infer<typeof schema>;

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoHECard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoHorasExtras;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const linhas = [
    { label: "Valor-hora base (salário ÷ 220h)", valor: resultado.valorHoraBase, destaque: false },
    { label: "Horas extras com 50% de adicional", valor: resultado.totalHE50, destaque: false },
    { label: "Horas extras com 100% de adicional", valor: resultado.totalHE100, destaque: false },
    { label: "Subtotal horas extras", valor: resultado.totalHE, destaque: true },
    { label: "Reflexo em DSR (Súmula 172 TST)", valor: resultado.reflexoDSR, destaque: false },
    { label: "Reflexo em férias + 1/3", valor: resultado.reflexoFerias, destaque: false },
    { label: "Reflexo em 13º salário", valor: resultado.reflexo13, destaque: false },
    { label: "Reflexo em FGTS (8%)", valor: resultado.reflexoFGTS, destaque: false },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Horas Extras e Reflexos</CardTitle>
            <Button size="sm" onClick={onSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {linhas.map((l, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-6 py-3 ${l.destaque ? "bg-muted/40 font-semibold" : ""}`}
              >
                <p className="text-sm">{l.label}</p>
                <p className="text-sm tabular-nums">{formatBRL(l.valor)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totais */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-primary">
              Total com Reflexos (período)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-primary">
              {formatBRL(resultado.totalComReflexos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Média mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold">{formatBRL(resultado.totalPorMes)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Base legal: </span>
          Art. 59 CLT; adicional mínimo de 50% (art. 7º, XVI CF); Súmula 172 TST (reflexo DSR);
          Súmula 45 TST (reflexo férias); Súmula 132 TST (reflexo 13º).
        </p>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function HorasExtrasForm() {
  const [resultado, setResultado] = useState<ResultadoHorasExtras | null>(null);
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
      salarioBase: "0",
      horasExtras50: 0,
      horasExtras100: 0,
      mesesTrabalho: 12,
      diasUteis: 26,
      diasRepouso: 4,
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const salarioBaseField = watch("salarioBase");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const res = calcularHorasExtras({
        salarioBase: new Decimal(data.salarioBase),
        horasExtras50: data.horasExtras50,
        horasExtras100: data.horasExtras100,
        mesesTrabalho: data.mesesTrabalho,
        diasUteisMedia: data.diasUteis,
        diasRepousoMedia: data.diasRepouso,
      });
      setResultado(res);
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
        area: "trabalhista",
        tipo: "horas-extras",
        titulo: selectedProcesso
          ? `Horas Extras — ${selectedProcesso.numero_processo}`
          : `HE ${watch("horasExtras50")}h×50% + ${watch("horasExtras100")}h×100% — ${watch("mesesTrabalho")} meses`,
        inputs_json: {
          salarioBase: salarioBaseField,
          horasExtras50: watch("horasExtras50"),
          horasExtras100: watch("horasExtras100"),
          mesesTrabalho: watch("mesesTrabalho"),
          diasUteis: watch("diasUteis"),
          diasRepouso: watch("diasRepouso"),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          valorHoraBase: resultado.valorHoraBase.toString(),
          totalHE: resultado.totalHE.toString(),
          totalComReflexos: resultado.totalComReflexos.toString(),
          totalPorMes: resultado.totalPorMes.toString(),
        },
        steps_json: [
          { label: "HE 50%", valor: resultado.totalHE50.toString() },
          { label: "HE 100%", valor: resultado.totalHE100.toString() },
          { label: "DSR", valor: resultado.reflexoDSR.toString() },
          { label: "Férias", valor: resultado.reflexoFerias.toString() },
          { label: "13º", valor: resultado.reflexo13.toString() },
          { label: "FGTS", valor: resultado.reflexoFGTS.toString() },
        ],
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
          <CardTitle className="text-base">Horas Extras</CardTitle>
          <CardDescription>
            Valor-hora, adicionais de 50%/100% e reflexos em DSR, férias, 13º e FGTS
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

            {/* Salário */}
            <div className="space-y-1.5">
              <Label>Salário Base</Label>
              <CurrencyInput
                value={salarioBaseField}
                onChange={(v) => setValue("salarioBase", v, { shouldValidate: true })}
              />
              {errors.salarioBase && (
                <p className="text-xs text-destructive">{errors.salarioBase.message}</p>
              )}
            </div>

            {/* HE */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Horas Extras com 50% (por mês)</Label>
                <Input type="number" min={0} {...register("horasExtras50")} />
                {errors.horasExtras50 && (
                  <p className="text-xs text-destructive">{errors.horasExtras50.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Horas Extras com 100% (por mês)</Label>
                <Input type="number" min={0} {...register("horasExtras100")} />
              </div>
            </div>

            {/* Período */}
            <div className="space-y-1.5">
              <Label>Período de Apuração (meses)</Label>
              <Input type="number" min={1} max={120} {...register("mesesTrabalho")} className="w-32" />
              {errors.mesesTrabalho && (
                <p className="text-xs text-destructive">{errors.mesesTrabalho.message}</p>
              )}
            </div>

            <Separator />

            {/* Parâmetros de DSR */}
            <div>
              <p className="text-sm font-medium mb-3">Parâmetros de DSR</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Dias úteis por mês (média)</Label>
                  <Input type="number" min={20} max={31} {...register("diasUteis")} className="w-32" />
                </div>
                <div className="space-y-1.5">
                  <Label>Domingos/feriados por mês (média)</Label>
                  <Input type="number" min={0} max={10} {...register("diasRepouso")} className="w-32" />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded" />
          ))}
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoHECard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
