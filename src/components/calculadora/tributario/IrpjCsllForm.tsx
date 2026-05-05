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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import {
  irpjCsll,
  PERCENTUAIS_PRESUNCAO,
  type ResultadoIrpjCsll,
} from "@/lib/calculators/tributario";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  valor: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor"),
  regime: z.enum(["real", "presumido"] as const),
  atividade: z.string().default("servicos_geral"),
});

type FormValues = z.infer<typeof schema>;

// ─── Resultado ────────────────────────────────────────────────────────────────

function ResultadoIrpjCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoIrpjCsll;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const presuncao = resultado.atividade ? PERCENTUAIS_PRESUNCAO[resultado.atividade] : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resultado IRPJ / CSLL</CardTitle>
            <Badge variant={resultado.regime === "real" ? "default" : "secondary"}>
              Lucro {resultado.regime === "real" ? "Real" : "Presumido"}
            </Badge>
          </div>
          {presuncao && (
            <p className="text-xs text-muted-foreground">{presuncao.label} — presunção {presuncao.irpj}% (IRPJ) / {presuncao.csll}% (CSLL)</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5 divide-y">
            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">
                {resultado.regime === "real" ? "Lucro real" : "Faturamento / Receita"}
              </span>
              <span className="tabular-nums">{formatBRL(resultado.lucro)}</span>
            </div>

            {resultado.regime === "presumido" && (
              <>
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">Base IRPJ ({resultado.percentualPresuncao.toString()}%)</span>
                  <span className="tabular-nums">{formatBRL(resultado.baseIrpj)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">Base CSLL</span>
                  <span className="tabular-nums">{formatBRL(resultado.baseCsll)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">IRPJ (15%)</span>
              <span className="tabular-nums">{formatBRL(resultado.irpjAliquota)}</span>
            </div>

            {resultado.irpjAdicional.gt(0) && (
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">Adicional IRPJ (10% sobre excedente R$ 20k)</span>
                <span className="tabular-nums">{formatBRL(resultado.irpjAdicional)}</span>
              </div>
            )}

            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">IRPJ total</span>
              <span className="tabular-nums font-medium">{formatBRL(resultado.irpjTotal)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">CSLL (9%)</span>
              <span className="tabular-nums">{formatBRL(resultado.csll)}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-sm font-semibold">Tributação total</span>
              <span className="tabular-nums text-primary text-lg font-bold">{formatBRL(resultado.tributacaoTotal)}</span>
            </div>
          </div>

          <Separator />
          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardContent>
      </Card>

      {/* Comparativo Lucro Real vs Presumido */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Referência rápida — alíquotas efetivas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium text-muted-foreground">Atividade</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">% Presunção IRPJ</th>
                  <th className="p-2 text-right font-medium text-muted-foreground">% Presunção CSLL</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERCENTUAIS_PRESUNCAO).map(([key, p]) => (
                  <tr
                    key={key}
                    className={`border-b last:border-0 ${key === resultado.atividade ? "bg-primary/5 font-semibold" : "hover:bg-muted/20"}`}
                  >
                    <td className="p-2">{p.label}</td>
                    <td className="p-2 text-right tabular-nums">{p.irpj}%</td>
                    <td className="p-2 text-right tabular-nums">{p.csll}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="sm" className="w-full" onClick={onSalvar} disabled={isSaving}>
        {isSaving ? "Salvando…" : "Salvar no histórico"}
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IrpjCsllForm() {
  const [resultado, setResultado] = useState<ResultadoIrpjCsll | null>(null);
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
      valor: "0",
      regime: "presumido",
      atividade: "servicos_geral",
    },
  });

  const valorField = watch("valor");
  const regime = watch("regime");
  const atividade = watch("atividade");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const res = irpjCsll(
        new Decimal(data.valor),
        data.regime,
        data.atividade
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
        tipo: "irpj-csll",
        titulo: `IRPJ/CSLL Lucro ${regime === "real" ? "Real" : "Presumido"} — ${formatBRL(resultado.tributacaoTotal)}`,
        inputs_json: { valor: valorField, regime, atividade },
        resultado_json: {
          irpjTotal: resultado.irpjTotal.toString(),
          csll: resultado.csll.toString(),
          tributacaoTotal: resultado.tributacaoTotal.toString(),
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
          <CardTitle className="text-base">IRPJ / CSLL</CardTitle>
          <CardDescription>
            Lucro Real (15% + adicional 10%) e Lucro Presumido por atividade — CSLL 9%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label>
                {regime === "real" ? "Lucro contábil ajustado" : "Faturamento / Receita bruta"}
              </Label>
              <CurrencyInput
                value={valorField}
                onChange={(v) => setValue("valor", v, { shouldValidate: true })}
              />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Regime tributário</Label>
              <div className="flex gap-2">
                {([
                  { value: "real", label: "Lucro Real" },
                  { value: "presumido", label: "Lucro Presumido" },
                ] as const).map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={regime === value ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setValue("regime", value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {regime === "presumido" && (
              <div className="space-y-1.5">
                <Label>Atividade</Label>
                <Select
                  defaultValue={atividade}
                  onValueChange={(v) => setValue("atividade", v, { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERCENTUAIS_PRESUNCAO).map(([k, p]) => (
                      <SelectItem key={k} value={k}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>Adicional IRPJ:</strong> 10% sobre a parcela do lucro/base que exceder R$ 20.000/mês (ou R$ 60.000/trimestre).
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular IRPJ / CSLL"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && <Skeleton className="h-48 rounded-lg" />}

      {resultado && !isCalculating && (
        <ResultadoIrpjCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
