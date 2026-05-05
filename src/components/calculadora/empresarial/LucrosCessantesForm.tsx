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

import { lucrosCessantes, type ResultadoLucrosCessantes } from "@/lib/calculators/empresarial";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  rendimentoMedioMensal: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe o rendimento médio mensal"),
  mesesAfastamento: z.coerce
    .number()
    .int()
    .min(1, "Informe ao menos 1 mês")
    .max(600, "Prazo máximo: 600 meses"),
  fatorCorrecaoPct: z.coerce
    .number()
    .min(0, "Fator não pode ser negativo")
    .max(500, "Fator inválido"),
});

type FormValues = z.infer<typeof schema>;

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoLucrosCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoLucrosCessantes;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const temCorrecao = resultado.correcaoMonetaria.gt(0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resultado — Lucros Cessantes</CardTitle>
        <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Rendimento médio mensal</p>
            <p className="mt-1 text-sm font-semibold">{formatBRL(resultado.rendimentoMedioMensal)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Período de afastamento</p>
            <p className="mt-1 text-sm font-semibold">{resultado.mesesAfastamento} meses</p>
          </div>
        </div>

        <Separator />

        {/* Memória de cálculo */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Memória de cálculo
          </p>
          <div className="space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-xs">
            <div className="flex justify-between">
              <span>Rendimento médio mensal</span>
              <span>{formatBRL(resultado.rendimentoMedioMensal)}</span>
            </div>
            <div className="flex justify-between">
              <span>× {resultado.mesesAfastamento} meses</span>
              <span>= {formatBRL(resultado.totalBruto)}</span>
            </div>
            {temCorrecao && (
              <div className="flex justify-between text-amber-700 dark:text-amber-400">
                <span>+ Correção monetária acumulada</span>
                <span>+ {formatBRL(resultado.correcaoMonetaria)}</span>
              </div>
            )}
            <Separator className="my-1.5" />
            <div className="flex justify-between font-bold">
              <span>= Total {temCorrecao ? "corrigido" : "devido"}</span>
              <span>{formatBRL(resultado.totalCorrigido)}</span>
            </div>
          </div>
        </div>

        {/* Destaque do resultado final */}
        <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
          <p className="text-xs text-muted-foreground">Total de lucros cessantes</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatBRL(resultado.totalCorrigido)}</p>
          {temCorrecao && (
            <p className="mt-1 text-xs text-muted-foreground">
              (valor nominal: {formatBRL(resultado.totalBruto)} + {formatBRL(resultado.correcaoMonetaria)} correção)
            </p>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <strong>Atenção:</strong> O art. 402 CC exige que os lucros cessantes sejam
            razoavelmente certos — é indispensável comprovação do rendimento habitual
            (contratos, notas fiscais, declarações de IR). O valor apurado aqui é indicativo;
            juros de mora e honorários devem ser acrescidos separadamente.
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
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LucrosCessantesForm() {
  const [resultado, setResultado] = useState<ResultadoLucrosCessantes | null>(null);
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
      rendimentoMedioMensal: "0",
      mesesAfastamento: 12,
      fatorCorrecaoPct: 0,
    },
  });

  const rendimentoField = watch("rendimentoMedioMensal");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const rendimento = new Decimal(data.rendimentoMedioMensal);
      const fatorCorrecao = new Decimal(1).plus(new Decimal(data.fatorCorrecaoPct).div(100));

      const res = lucrosCessantes(rendimento, data.mesesAfastamento, fatorCorrecao);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "empresarial",
        tipo: "lucros-cessantes",
        titulo: `Lucros Cessantes — ${resultado.mesesAfastamento} meses — ${formatBRL(resultado.totalCorrigido)}`,
        inputs_json: {
          rendimentoMedioMensal: rendimentoField,
          mesesAfastamento: watch("mesesAfastamento"),
          fatorCorrecaoPct: watch("fatorCorrecaoPct"),
        },
        resultado_json: {
          totalBruto: resultado.totalBruto.toString(),
          correcaoMonetaria: resultado.correcaoMonetaria.toString(),
          totalCorrigido: resultado.totalCorrigido.toString(),
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
          <CardTitle className="text-base">Lucros Cessantes</CardTitle>
          <CardDescription>
            Calcula o valor dos lucros cessantes com base no rendimento médio e período de interrupção (art. 402 CC)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Rendimento médio mensal */}
            <div className="space-y-1.5">
              <Label htmlFor="rendimentoMedioMensal">Rendimento médio mensal</Label>
              <CurrencyInput
                id="rendimentoMedioMensal"
                value={rendimentoField}
                onChange={(v) => setValue("rendimentoMedioMensal", v, { shouldValidate: true })}
              />
              <p className="text-xs text-muted-foreground">
                Média dos últimos 12 meses (ou período representativo comprovado)
              </p>
              {errors.rendimentoMedioMensal && (
                <p className="text-xs text-destructive">{errors.rendimentoMedioMensal.message}</p>
              )}
            </div>

            {/* Meses de afastamento */}
            <div className="space-y-1.5">
              <Label htmlFor="mesesAfastamento">Período de afastamento (meses)</Label>
              <Input
                id="mesesAfastamento"
                type="number"
                min={1}
                max={600}
                placeholder="Ex: 12"
                {...register("mesesAfastamento")}
              />
              {errors.mesesAfastamento && (
                <p className="text-xs text-destructive">{errors.mesesAfastamento.message}</p>
              )}
            </div>

            <Separator />

            {/* Fator de correção monetária */}
            <div className="space-y-1.5">
              <Label htmlFor="fatorCorrecaoPct">Correção monetária acumulada no período (%) — opcional</Label>
              <Input
                id="fatorCorrecaoPct"
                type="number"
                min={0}
                max={500}
                step={0.01}
                placeholder="Ex: 15.00 para 15% de IPCA acumulado"
                {...register("fatorCorrecaoPct")}
              />
              <p className="text-xs text-muted-foreground">
                Deixe 0 para calcular apenas o valor nominal. Use a aba Cível → Correção Monetária
                para apurar o percentual exato pelo índice.
              </p>
              {errors.fatorCorrecaoPct && (
                <p className="text-xs text-destructive">{errors.fatorCorrecaoPct.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular lucros cessantes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoLucrosCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
