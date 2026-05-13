import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  sistemaPrice,
  sistemaSAC,
  type ResultadoAmortizacao,
  type ParcelaAmortizacao,
} from "@/lib/calculators/empresarial";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  valorFinanciado: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe o valor financiado"),
  taxaMensal: z.coerce
    .number()
    .min(0.001, "Taxa deve ser maior que 0")
    .max(100, "Taxa inválida"),
  prazoMeses: z.coerce
    .number()
    .int()
    .min(1, "Prazo mínimo: 1 mês")
    .max(600, "Prazo máximo: 600 meses"),
});

type FormValues = z.infer<typeof schema>;

// ─── Tabela de parcelas ───────────────────────────────────────────────────────

const ROWS_PREVIEW = 6;

function TabelaParcelas({ parcelas }: { parcelas: ParcelaAmortizacao[] }) {
  const [expandida, setExpandida] = useState(false);
  const exibidas = expandida ? parcelas : parcelas.slice(0, ROWS_PREVIEW);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-center font-medium text-muted-foreground">#</th>
              <th className="p-2 text-right font-medium text-muted-foreground">Prestação</th>
              <th className="p-2 text-right font-medium text-muted-foreground">Amortização</th>
              <th className="p-2 text-right font-medium text-muted-foreground">Juros</th>
              <th className="p-2 text-right font-medium text-muted-foreground">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {exibidas.map((p) => (
              <tr key={p.numero} className="border-b last:border-0 hover:bg-muted/20">
                <td className="p-2 text-center tabular-nums text-muted-foreground">{p.numero}</td>
                <td className="p-2 text-right tabular-nums font-medium">{formatBRL(p.prestacao)}</td>
                <td className="p-2 text-right tabular-nums">{formatBRL(p.amortizacao)}</td>
                <td className="p-2 text-right tabular-nums text-destructive/80">{formatBRL(p.juros)}</td>
                <td className="p-2 text-right tabular-nums text-muted-foreground">{formatBRL(p.saldoDevedor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {parcelas.length > ROWS_PREVIEW && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setExpandida((e) => !e)}
        >
          {expandida ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              Ver todas as {parcelas.length} parcelas
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ─── Resultado comparativo ────────────────────────────────────────────────────

interface Comparativo {
  price: ResultadoAmortizacao;
  sac: ResultadoAmortizacao;
}

function ResultadoComparativo({
  comp,
  onSalvar,
  isSaving,
}: {
  comp: Comparativo;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const [sistemaAtivo, setSistemaAtivo] = useState<"price" | "sac">("price");
  const ativo = sistemaAtivo === "price" ? comp.price : comp.sac;

  const economiaJuros = comp.price.totalJuros.minus(comp.sac.totalJuros);
  const sacMaisBarato = economiaJuros.gt(0);

  return (
    <div className="space-y-4">
      {/* Comparativo geral */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Comparativo Price × SAC</CardTitle>
            {sacMaisBarato && (
              <Badge variant="secondary" className="text-xs">
                SAC economiza {formatBRL(economiaJuros)} em juros
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md bg-muted/30 p-2 text-muted-foreground" />
            <div className="rounded-md bg-muted p-2 text-center font-semibold text-foreground">
              Price
            </div>
            <div className="rounded-md bg-emerald-50 p-2 text-center font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              SAC
            </div>

            <div className="p-2 text-xs text-muted-foreground">1ª parcela</div>
            <div className="rounded-md p-2 text-right tabular-nums font-medium">
              {formatBRL(comp.price.prestacaoInicial)}
            </div>
            <div className="rounded-md p-2 text-right tabular-nums font-medium">
              {formatBRL(comp.sac.prestacaoInicial)}
            </div>

            <div className="p-2 text-xs text-muted-foreground">Última parcela</div>
            <div className="rounded-md p-2 text-right tabular-nums">
              {formatBRL(comp.price.prestacaoFinal)}
            </div>
            <div className="rounded-md p-2 text-right tabular-nums">
              {formatBRL(comp.sac.prestacaoFinal)}
            </div>

            <div className="p-2 text-xs text-muted-foreground">Total pago</div>
            <div className="rounded-md p-2 text-right tabular-nums">
              {formatBRL(comp.price.totalPago)}
            </div>
            <div className="rounded-md p-2 text-right tabular-nums">
              {formatBRL(comp.sac.totalPago)}
            </div>

            <div className="p-2 text-xs text-muted-foreground">Total juros</div>
            <div className="rounded-md p-2 text-right tabular-nums text-destructive/80">
              {formatBRL(comp.price.totalJuros)}
            </div>
            <div className="rounded-md p-2 text-right tabular-nums text-destructive/80">
              {formatBRL(comp.sac.totalJuros)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Tabela de amortização —</CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={sistemaAtivo === "price" ? "default" : "outline"}
                className="h-6 px-2 text-xs"
                onClick={() => setSistemaAtivo("price")}
              >
                Price
              </Button>
              <Button
                size="sm"
                variant={sistemaAtivo === "sac" ? "default" : "outline"}
                className="h-6 px-2 text-xs"
                onClick={() => setSistemaAtivo("sac")}
              >
                SAC
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{ativo.legislacao}</p>
        </CardHeader>
        <CardContent>
          <TabelaParcelas parcelas={ativo.parcelas} />
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onSalvar}
        disabled={isSaving}
      >
        {isSaving ? "Salvando…" : "Salvar no histórico"}
      </Button>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AmortizacaoForm() {
  const [comparativo, setComparativo] = useState<Comparativo | null>(null);
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
      valorFinanciado: "0",
      taxaMensal: 1,
      prazoMeses: 60,
    },
  });

  const valorField = watch("valorFinanciado");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setComparativo(null);
    try {
      const pv = new Decimal(data.valorFinanciado);
      const taxa = new Decimal(data.taxaMensal);
      const prazo = data.prazoMeses;

      const price = sistemaPrice(pv, taxa, prazo);
      const sac = sistemaSAC(pv, taxa, prazo);

      setComparativo({ price, sac });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSalvar = async () => {
    if (!comparativo) return;
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "empresarial",
        tipo: "amortizacao-price-sac",
        titulo: `Price/SAC — ${formatBRL(new Decimal(valorField))} × ${watch("taxaMensal")}% a.m. / ${watch("prazoMeses")} meses`,
        inputs_json: {
          valorFinanciado: valorField,
          taxaMensal: watch("taxaMensal"),
          prazoMeses: watch("prazoMeses"),
        },
        resultado_json: {
          price: {
            prestacao: comparativo.price.prestacaoInicial.toString(),
            totalPago: comparativo.price.totalPago.toString(),
            totalJuros: comparativo.price.totalJuros.toString(),
          },
          sac: {
            prestacaoInicial: comparativo.sac.prestacaoInicial.toString(),
            prestacaoFinal: comparativo.sac.prestacaoFinal.toString(),
            totalPago: comparativo.sac.totalPago.toString(),
            totalJuros: comparativo.sac.totalJuros.toString(),
          },
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
          <CardTitle className="text-base">Sistemas de Amortização — Price / SAC</CardTitle>
          <CardDescription>
            Comparativo das tabelas PRICE (prestações constantes) e SAC (amortização constante)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Valor financiado */}
            <div className="space-y-1.5">
              <Label htmlFor="valorFinanciado">Valor financiado (PV)</Label>
              <CurrencyInput
                id="valorFinanciado"
                value={valorField}
                onChange={(v) => setValue("valorFinanciado", v, { shouldValidate: true })}
              />
              {errors.valorFinanciado && (
                <p className="text-xs text-destructive">{errors.valorFinanciado.message}</p>
              )}
            </div>

            {/* Taxa e prazo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="taxaMensal">Taxa de juros (% a.m.)</Label>
                <Input
                  id="taxaMensal"
                  type="number"
                  min={0.001}
                  max={100}
                  step={0.001}
                  placeholder="Ex: 1.0"
                  {...register("taxaMensal")}
                />
                {errors.taxaMensal && (
                  <p className="text-xs text-destructive">{errors.taxaMensal.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prazoMeses">Prazo (meses)</Label>
                <Input
                  id="prazoMeses"
                  type="number"
                  min={1}
                  max={600}
                  placeholder="Ex: 60"
                  {...register("prazoMeses")}
                />
                {errors.prazoMeses && (
                  <p className="text-xs text-destructive">{errors.prazoMeses.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>Price:</strong> prestação constante (maior custo total de juros, parcela inicial menor). <br />
              <strong>SAC:</strong> amortização constante (menor custo total, 1ª parcela maior, juros decrescentes).
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Gerar comparativo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}

      {comparativo && !isCalculating && (
        <ResultadoComparativo
          comp={comparativo}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
