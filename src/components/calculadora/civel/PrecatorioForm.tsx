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
  precatorioRPV,
  type EnteFederativo,
  type NaturezaCredito,
  type ResultadoPrecatorio,
} from "@/lib/calculators/civel";
import { formatBRL } from "@/lib/calculators/engine";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  valor: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor do crédito"),
  ente: z.enum(["federal", "estadual", "municipal"]),
  natureza: z.enum(["comum", "alimentar"]),
});

type FormValues = z.infer<typeof schema>;

// ─── Labels ──────────────────────────────────────────────────────────────────

const ENTES: { value: EnteFederativo; label: string }[] = [
  { value: "federal", label: "União Federal" },
  { value: "estadual", label: "Estado / DF" },
  { value: "municipal", label: "Município" },
];

const NATUREZAS: { value: NaturezaCredito; label: string }[] = [
  { value: "comum", label: "Comum — limite 60 SM" },
  { value: "alimentar", label: "Alimentar — limite 180 SM (art. 100 §2 CF)" },
];

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoPrecatorioCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoPrecatorio;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const isRPV = resultado.classificacao === "RPV";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resultado — Classificação do Crédito</CardTitle>
            <Badge variant={isRPV ? "default" : "secondary"} className="text-sm px-3">
              {resultado.classificacao}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Valor do crédito</p>
              <p className="mt-1 text-sm font-semibold">{formatBRL(resultado.valor)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Limite RPV</p>
              <p className="mt-1 text-sm font-semibold">{formatBRL(resultado.limiteRPV)}</p>
            </div>
            <div className={`rounded-lg p-3 ring-1 ${isRPV ? "bg-primary/10 ring-primary/20" : "bg-orange-50 ring-orange-200 dark:bg-orange-950/30 dark:ring-orange-900"}`}>
              <p className="text-xs text-muted-foreground">Classificação</p>
              <p className={`mt-1 text-sm font-bold ${isRPV ? "text-primary" : "text-orange-600 dark:text-orange-400"}`}>
                {isRPV ? "RPV — Requisição de Pequeno Valor" : "Precatório (art. 100 CF)"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Explicação */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Análise</p>
            <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-2">
              {isRPV ? (
                <>
                  <p>
                    O crédito de <strong>{formatBRL(resultado.valor)}</strong> está dentro do limite
                    de RPV ({resultado.natureza === "alimentar" ? "180 SM" : "60 SM"} = {formatBRL(resultado.limiteRPV)}).
                  </p>
                  <p className="text-muted-foreground text-xs">
                    O ente devedor deve efetuar o pagamento em até 60 dias após a expedição da RPV
                    (art. 100 §3 CF). Sem necessidade de inclusão em orçamento anual.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    O crédito de <strong>{formatBRL(resultado.valor)}</strong> excede o limite de RPV
                    em <strong>{formatBRL(resultado.excedePorRPV)}</strong> e deve ser processado
                    como Precatório.
                  </p>
                  {resultado.excedePorRPV.gt(0) && (
                    <p className="text-xs text-muted-foreground">
                      Possível estratégia: verificar se há outros credores no mesmo processo que
                      possam fracionar o crédito — observadas as vedações de fracionamento (art. 100 §8 CF).
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    O precatório é incluído no orçamento do ente público e pago na ordem cronológica,
                    com preferência para créditos alimentares (art. 100 §2 CF).
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Referência:</strong> {resultado.observacao}
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

export function PrecatorioForm() {
  const [resultado, setResultado] = useState<ResultadoPrecatorio | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valor: "0",
      ente: "federal",
      natureza: "comum",
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const valorField = watch("valor");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const valor = new Decimal(data.valor);
      const res = precatorioRPV(valor, data.natureza, data.ente);
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
        area: "civel",
        tipo: "precatorio-rpv",
        titulo: selectedProcesso
          ? `${resultado.classificacao} — ${selectedProcesso.numero_processo}`
          : `${resultado.classificacao} — ${formatBRL(resultado.valor)} (${resultado.ente})`,
        inputs_json: {
          valor: valorField,
          ente: resultado.ente,
          natureza: resultado.natureza,
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          classificacao: resultado.classificacao,
          limiteRPV: resultado.limiteRPV.toString(),
          excedePorRPV: resultado.excedePorRPV.toString(),
          valor: resultado.valor.toString(),
          observacao: resultado.observacao,
          legislacao: resultado.legislacao,
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
          <CardTitle className="text-base">Precatório / RPV</CardTitle>
          <CardDescription>
            Classifica o crédito judicial como RPV ou Precatório com base nos limites constitucionais (art. 100 CF)
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
              <Label htmlFor="valor">Valor do Crédito Judicial</Label>
              <CurrencyInput
                id="valor"
                value={valorField}
                onChange={(v) => setValue("valor", v, { shouldValidate: true })}
              />
              {errors.valor && (
                <p className="text-xs text-destructive">{errors.valor.message}</p>
              )}
            </div>

            {/* Ente */}
            <div className="space-y-1.5">
              <Label>Ente Federativo Devedor</Label>
              <Select
                defaultValue="federal"
                onValueChange={(v) => setValue("ente", v as EnteFederativo, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTES.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Natureza */}
            <div className="space-y-1.5">
              <Label>Natureza do Crédito</Label>
              <Select
                defaultValue="comum"
                onValueChange={(v) => setValue("natureza", v as NaturezaCredito, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NATUREZAS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Alimentar: vencimentos, salários, pensões, aposentadorias, benefícios previdenciários e indenizações por morte ou invalidez (art. 100 §1 CF)
              </p>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              Referência: salário mínimo 2025 = R$ 1.518,00 — limite RPV comum: 60 SM = R$ 91.080,00
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Classificar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoPrecatorioCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
