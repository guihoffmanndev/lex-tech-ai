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

import { apuracaoHaveres, type ResultadoHaveres } from "@/lib/calculators/empresarial";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  patrimonioLiquido: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe o patrimônio líquido"),
  participacaoPct: z.coerce
    .number()
    .min(0.01, "Participação deve ser maior que 0")
    .max(100, "Participação não pode exceder 100%"),
  deducoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoHaveresCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoHaveres;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Apuração de Haveres</CardTitle>
        <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Patrimônio líquido</p>
            <p className="mt-1 text-sm font-semibold">{formatBRL(resultado.patrimonioLiquido)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Participação</p>
            <p className="mt-1 text-sm font-semibold">{resultado.participacaoPct.toFixed(4)}%</p>
          </div>
          <div className="col-span-2 rounded-lg bg-muted/40 p-3 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Haveres brutos</p>
            <p className="mt-1 text-sm font-semibold">{formatBRL(resultado.haveresBrutos)}</p>
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
              <span>PL × participação</span>
              <span>
                {formatBRL(resultado.patrimonioLiquido)} × {resultado.participacaoPct.toFixed(4)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>= Haveres brutos</span>
              <span>{formatBRL(resultado.haveresBrutos)}</span>
            </div>
            {resultado.deducoes.gt(0) && (
              <div className="flex justify-between text-destructive">
                <span>− Deduções (débitos do sócio)</span>
                <span>− {formatBRL(resultado.deducoes)}</span>
              </div>
            )}
            <Separator className="my-1.5" />
            <div className="flex justify-between font-bold">
              <span>= Haveres líquidos</span>
              <span>{formatBRL(resultado.haveresLiquidos)}</span>
            </div>
          </div>
        </div>

        {/* Destaque do resultado final */}
        <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20">
          <p className="text-xs text-muted-foreground">Haveres líquidos do sócio</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatBRL(resultado.haveresLiquidos)}</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <strong>Atenção:</strong> O art. 1.031 CC determina que o valor é apurado pelo PL
            na data da dissolução. Na prática, os tribunais frequentemente determinam o Balanço
            de Determinação (art. 1.031 §1 CC), que pode diferir do balanço contábil ordinário.
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

export function HaveresForm() {
  const [resultado, setResultado] = useState<ResultadoHaveres | null>(null);
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
      patrimonioLiquido: "0",
      participacaoPct: 50,
      deducoes: "0",
    },
  });

  const plField = watch("patrimonioLiquido");
  const deducoesField = watch("deducoes");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const pl = new Decimal(data.patrimonioLiquido);
      const participacao = new Decimal(data.participacaoPct);
      const deducoes = new Decimal(data.deducoes || "0");

      const res = apuracaoHaveres(pl, participacao, deducoes);
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
        tipo: "apuracao-haveres",
        titulo: `Haveres — ${formatBRL(resultado.haveresLiquidos)} (${resultado.participacaoPct.toFixed(2)}%)`,
        inputs_json: {
          patrimonioLiquido: plField,
          participacaoPct: watch("participacaoPct"),
          deducoes: deducoesField,
        },
        resultado_json: {
          haveresBrutos: resultado.haveresBrutos.toString(),
          deducoes: resultado.deducoes.toString(),
          haveresLiquidos: resultado.haveresLiquidos.toString(),
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
          <CardTitle className="text-base">Apuração de Haveres</CardTitle>
          <CardDescription>
            Calcula o valor da quota do sócio retirante com base no patrimônio líquido (art. 1.031 CC)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Patrimônio líquido */}
            <div className="space-y-1.5">
              <Label htmlFor="patrimonioLiquido">Patrimônio Líquido na data-base</Label>
              <CurrencyInput
                id="patrimonioLiquido"
                value={plField}
                onChange={(v) => setValue("patrimonioLiquido", v, { shouldValidate: true })}
              />
              {errors.patrimonioLiquido && (
                <p className="text-xs text-destructive">{errors.patrimonioLiquido.message}</p>
              )}
            </div>

            {/* Participação */}
            <div className="space-y-1.5">
              <Label htmlFor="participacaoPct">Participação do sócio (%)</Label>
              <Input
                id="participacaoPct"
                type="number"
                min={0.01}
                max={100}
                step={0.0001}
                placeholder="Ex: 33.3333"
                {...register("participacaoPct")}
              />
              <p className="text-xs text-muted-foreground">
                Use até 4 casas decimais para precisão em contratos com frações de quota
              </p>
              {errors.participacaoPct && (
                <p className="text-xs text-destructive">{errors.participacaoPct.message}</p>
              )}
            </div>

            <Separator />

            {/* Deduções */}
            <div className="space-y-1.5">
              <Label htmlFor="deducoes">Deduções — débitos do sócio com a sociedade (opcional)</Label>
              <CurrencyInput
                id="deducoes"
                value={deducoesField ?? "0"}
                onChange={(v) => setValue("deducoes", v)}
              />
              <p className="text-xs text-muted-foreground">
                Ex: empréstimos, adiantamentos ou responsabilidades apuradas no balanço
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular haveres"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoHaveresCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
