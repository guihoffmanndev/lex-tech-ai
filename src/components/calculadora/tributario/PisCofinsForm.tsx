import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import { pisCofins, type ResultadoPisCofins } from "@/lib/calculators/tributario";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  faturamento: z.string().refine((v) => parseFloat(v) > 0, "Informe o faturamento"),
  regime: z.enum(["cumulativo", "nao-cumulativo"] as const),
  excluirIcms: z.boolean().default(false),
  icmsNf: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Resultado ────────────────────────────────────────────────────────────────

function ResultadoPisCofinsCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoPisCofins;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const aliqPis = resultado.regime === "cumulativo" ? "0,65%" : "1,65%";
  const aliqCofins = resultado.regime === "cumulativo" ? "3,00%" : "7,60%";
  const totalAliq = resultado.regime === "cumulativo" ? "3,65%" : "9,25%";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resultado PIS/COFINS</CardTitle>
            <Badge variant={resultado.regime === "cumulativo" ? "secondary" : "outline"}>
              {resultado.regime === "cumulativo" ? "Cumulativo" : "Não-cumulativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5 divide-y">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Faturamento bruto</span>
              <span className="tabular-nums">{formatBRL(resultado.faturamento)}</span>
            </div>
            {resultado.icmsExcluido.gt(0) && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">ICMS excluído (RE 574.706)</span>
                <span className="tabular-nums text-destructive/80">− {formatBRL(resultado.icmsExcluido)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">Base de cálculo</span>
              <span className="tabular-nums font-medium">{formatBRL(resultado.baseCalculo)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">PIS ({aliqPis})</span>
              <span className="tabular-nums">{formatBRL(resultado.pis)}</span>
            </div>
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">COFINS ({aliqCofins})</span>
              <span className="tabular-nums">{formatBRL(resultado.cofins)}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-sm font-semibold">Total PIS+COFINS ({totalAliq})</span>
              <span className="tabular-nums text-primary text-lg font-bold">{formatBRL(resultado.total)}</span>
            </div>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardContent>
      </Card>

      {/* Comparativo regimes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Comparativo Cumulativo × Não-cumulativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md bg-muted/30 p-2" />
            <div className="rounded-md bg-muted p-2 text-center font-semibold text-foreground">
              Cumulativo
            </div>
            <div className="rounded-md bg-emerald-50 p-2 text-center font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              Não-cumulativo
            </div>

            <div className="p-2 text-muted-foreground">PIS</div>
            <div className="p-2 text-right">0,65%</div>
            <div className="p-2 text-right">1,65%</div>

            <div className="p-2 text-muted-foreground">COFINS</div>
            <div className="p-2 text-right">3,00%</div>
            <div className="p-2 text-right">7,60%</div>

            <div className="p-2 text-muted-foreground font-medium">Total</div>
            <div className="p-2 text-right font-medium">3,65%</div>
            <div className="p-2 text-right font-medium">9,25%</div>

            <div className="p-2 text-muted-foreground">Créditos</div>
            <div className="p-2 text-right text-destructive/70">Não</div>
            <div className="p-2 text-right text-emerald-600">Sim</div>

            <div className="p-2 text-muted-foreground">Regime</div>
            <div className="p-2 text-right text-muted-foreground">LP / Simples</div>
            <div className="p-2 text-right text-muted-foreground">Lucro Real</div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          <strong>RE 574.706 (Tema 69 STF):</strong> O ICMS não compõe a base de cálculo do PIS/COFINS. A exclusão deve ser do ICMS destacado na nota fiscal, não do ICMS pago.
        </span>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={onSalvar} disabled={isSaving}>
        {isSaving ? "Salvando…" : "Salvar no histórico"}
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PisCofinsForm() {
  const [resultado, setResultado] = useState<ResultadoPisCofins | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      faturamento: "0",
      regime: "cumulativo",
      excluirIcms: false,
      icmsNf: "0",
    },
  });

  const faturamentoField = watch("faturamento");
  const icmsNfField = watch("icmsNf");
  const excluirIcms = watch("excluirIcms");
  const regime = watch("regime");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const res = pisCofins(
        new Decimal(data.faturamento),
        data.regime,
        data.excluirIcms ? new Decimal(data.icmsNf || "0") : new Decimal(0)
      );
      setResultado(res);
    } catch (err) {
      toast.error("Erro ao calcular.");
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
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "pis-cofins",
        titulo: `PIS/COFINS ${regime === "cumulativo" ? "Cumulativo" : "Não-cumulativo"} — ${formatBRL(resultado.total)}`,
        inputs_json: { faturamento: faturamentoField, regime, icmsNf: icmsNfField },
        resultado_json: {
          pis: resultado.pis.toString(),
          cofins: resultado.cofins.toString(),
          total: resultado.total.toString(),
        },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PIS / COFINS</CardTitle>
          <CardDescription>
            Cumulativo (Lucro Presumido) e Não-cumulativo (Lucro Real) com exclusão do ICMS — RE 574.706
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Faturamento / Receita Bruta</Label>
              <CurrencyInput
                value={faturamentoField}
                onChange={(v) => setValue("faturamento", v, { shouldValidate: true })}
              />
              {errors.faturamento && <p className="text-xs text-destructive">{errors.faturamento.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Regime de apuração</Label>
              <div className="flex gap-2">
                {([
                  { value: "cumulativo", label: "Cumulativo (LP / Simples)" },
                  { value: "nao-cumulativo", label: "Não-cumulativo (Lucro Real)" },
                ] as const).map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={regime === value ? "default" : "outline"}
                    className="flex-1 text-xs"
                    onClick={() => setValue("regime", value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="excluirIcms"
                  {...register("excluirIcms")}
                  className="h-4 w-4"
                />
                <Label htmlFor="excluirIcms" className="cursor-pointer">
                  Excluir ICMS da base (RE 574.706 — Tema 69 STF)
                </Label>
              </div>

              {excluirIcms && (
                <div className="space-y-1.5 ml-6">
                  <Label>ICMS destacado na NF</Label>
                  <CurrencyInput
                    value={icmsNfField || "0"}
                    onChange={(v) => setValue("icmsNf", v)}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular PIS/COFINS"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && <Skeleton className="h-48 rounded-lg" />}

      {resultado && !isCalculating && (
        <ResultadoPisCofinsCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
