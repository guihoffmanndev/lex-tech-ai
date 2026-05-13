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
import { Input } from "@/components/ui/input";
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
  simplesNacional,
  calcularFatorR,
  comparativoAnexos,
  type AnexoSimples,
  type ResultadoSimplesNacional,
} from "@/lib/calculators/tributario";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  rbt12: z.string().refine((v) => parseFloat(v) > 0, "Informe a receita bruta dos últimos 12 meses"),
  receitaMes: z.string().refine((v) => parseFloat(v) > 0, "Informe a receita do mês"),
  atividade: z.enum(["comercio", "industria", "servicos_iii", "servicos_iv", "servicos_v"] as const),
  folha12m: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const LABELS_ATIVIDADE: Record<string, string> = {
  comercio: "Comércio (Anexo I)",
  industria: "Indústria (Anexo II)",
  servicos_iii: "Serviços — Instalação / Reparo / Manutenção (Anexo III fixo)",
  servicos_iv: "Serviços — Construção / Vigilância / Advocacia (Anexo IV)",
  servicos_v: "Serviços profissionais — TI / Medicina / Contabilidade (Fator R: III ou V)",
};

function getAnexo(atividade: string): AnexoSimples | null {
  if (atividade === "comercio") return "I";
  if (atividade === "industria") return "II";
  if (atividade === "servicos_iii") return "III";
  if (atividade === "servicos_iv") return "IV";
  return null; // servicos_v → depende do Fator R
}

// ─── Resultado ────────────────────────────────────────────────────────────────

function ResultadoSimples({
  resultado,
  comparativo,
  fatorR,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoSimplesNacional;
  comparativo: ResultadoSimplesNacional[] | null;
  fatorR: { fatorR: Decimal; anexoResultante: "III" | "V" } | null;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const [mostrarComparativo, setMostrarComparativo] = useState(false);

  return (
    <div className="space-y-4">
      {/* Resultado principal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resultado — Anexo {resultado.anexo}</CardTitle>
            <Badge variant="outline">Faixa {resultado.faixaNumero}ª</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fatorR && (
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <strong>Fator R:</strong> {(fatorR.fatorR.times(100)).toDecimalPlaces(2).toString()}%
              {" "}({fatorR.fatorR.gte("0.28") ? "≥ 28% → Anexo III" : "< 28% → Anexo V"})
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Alíquota nominal</p>
              <p className="font-semibold">{resultado.aliquotaNominal.toDecimalPlaces(2).toString()}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dedução</p>
              <p className="font-semibold">{formatBRL(resultado.deducao)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alíquota efetiva</p>
              <p className="text-xl font-bold text-primary">
                {resultado.aliquotaEfetivaPct.toDecimalPlaces(2).toString()}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DAS mensal</p>
              <p className="text-xl font-bold">{formatBRL(resultado.dasMensal)}</p>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
            <strong>Fórmula:</strong> Alíq. efetiva = (RBT12 × {resultado.aliquotaNominal.toDecimalPlaces(1).toString()}% − {formatBRL(resultado.deducao)}) / RBT12
          </div>
          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardContent>
      </Card>

      {/* Comparativo entre anexos */}
      {comparativo && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Comparativo — todos os 5 anexos</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setMostrarComparativo((v) => !v)}
              >
                {mostrarComparativo ? "Ocultar" : "Exibir"}
              </Button>
            </div>
          </CardHeader>
          {mostrarComparativo && (
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium text-muted-foreground">Anexo</th>
                      <th className="p-2 text-right font-medium text-muted-foreground">Faixa</th>
                      <th className="p-2 text-right font-medium text-muted-foreground">Alíq. efetiva</th>
                      <th className="p-2 text-right font-medium text-muted-foreground">DAS mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparativo.map((r) => (
                      <tr
                        key={r.anexo}
                        className={`border-b last:border-0 ${r.anexo === resultado.anexo ? "bg-primary/5 font-semibold" : "hover:bg-muted/20"}`}
                      >
                        <td className="p-2">Anexo {r.anexo}</td>
                        <td className="p-2 text-right tabular-nums text-muted-foreground">{r.faixaNumero}ª</td>
                        <td className="p-2 text-right tabular-nums">{r.aliquotaEfetivaPct.toDecimalPlaces(2).toString()}%</td>
                        <td className="p-2 text-right tabular-nums">{formatBRL(r.dasMensal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-300 flex gap-2">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          <strong>Nota IBS/CBS (Reforma Tributária):</strong> A partir de 2026 o Simples Nacional terá opção de apuração pelo IBS e CBS com transição até 2033 (LC 214/2025).
        </span>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={onSalvar} disabled={isSaving}>
        {isSaving ? "Salvando…" : "Salvar no histórico"}
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SimplesNacionalForm() {
  const [resultado, setResultado] = useState<ResultadoSimplesNacional | null>(null);
  const [comparativo, setComparativo] = useState<ResultadoSimplesNacional[] | null>(null);
  const [fatorRInfo, setFatorRInfo] = useState<{ fatorR: Decimal; anexoResultante: "III" | "V" } | null>(null);
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
      rbt12: "0",
      receitaMes: "0",
      atividade: "servicos_v",
      folha12m: "0",
    },
  });

  const atividade = watch("atividade");
  const rbt12Field = watch("rbt12");
  const receitaMesField = watch("receitaMes");
  const folha12mField = watch("folha12m");
  const precisaFatorR = atividade === "servicos_v";

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    setComparativo(null);
    setFatorRInfo(null);
    try {
      const rbt12 = new Decimal(data.rbt12);
      const receitaMes = new Decimal(data.receitaMes);

      let anexo: AnexoSimples;
      let frInfo: typeof fatorRInfo = null;

      const anexoFixo = getAnexo(data.atividade);
      if (anexoFixo) {
        anexo = anexoFixo;
      } else {
        // Fator R
        const folha = new Decimal(data.folha12m || "0");
        frInfo = calcularFatorR(rbt12, folha);
        anexo = frInfo.anexoResultante;
        setFatorRInfo(frInfo);
      }

      const res = simplesNacional(
        rbt12,
        receitaMes,
        anexo,
        data.folha12m ? new Decimal(data.folha12m) : undefined
      );
      const comp = comparativoAnexos(rbt12, receitaMes);

      setResultado(res);
      setComparativo(comp);
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
        area: "tributario",
        tipo: "simples-nacional",
        titulo: `Simples Nacional Anexo ${resultado.anexo} — ${formatBRL(resultado.dasMensal)}/mês`,
        inputs_json: {
          rbt12: rbt12Field,
          receitaMes: receitaMesField,
          atividade,
          folha12m: folha12mField,
        },
        resultado_json: {
          anexo: resultado.anexo,
          faixa: resultado.faixaNumero,
          aliquotaEfetivaPct: resultado.aliquotaEfetivaPct.toString(),
          dasMensal: resultado.dasMensal.toString(),
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
          <CardTitle className="text-base">Simples Nacional — Alíquota Efetiva e DAS</CardTitle>
          <CardDescription>
            Todos os 5 anexos (LC 123/2006) com Fator R automático para serviços
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="rbt12">Receita Bruta últimos 12 meses (RBT12)</Label>
              <CurrencyInput
                id="rbt12"
                value={rbt12Field}
                onChange={(v) => setValue("rbt12", v, { shouldValidate: true })}
              />
              {errors.rbt12 && <p className="text-xs text-destructive">{errors.rbt12.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receitaMes">Receita do mês de competência</Label>
              <CurrencyInput
                id="receitaMes"
                value={receitaMesField}
                onChange={(v) => setValue("receitaMes", v, { shouldValidate: true })}
              />
              {errors.receitaMes && <p className="text-xs text-destructive">{errors.receitaMes.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="atividade">Atividade / Anexo</Label>
              <Select
                defaultValue={atividade}
                onValueChange={(v) =>
                  setValue("atividade", v as FormValues["atividade"], { shouldValidate: true })
                }
              >
                <SelectTrigger id="atividade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABELS_ATIVIDADE).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {precisaFatorR && (
              <div className="space-y-1.5">
                <Label htmlFor="folha12m">
                  Folha de pagamento últimos 12 meses{" "}
                  <span className="text-xs text-muted-foreground">(para cálculo do Fator R)</span>
                </Label>
                <CurrencyInput
                  id="folha12m"
                  value={folha12mField || "0"}
                  onChange={(v) => setValue("folha12m", v)}
                />
                <p className="text-xs text-muted-foreground">
                  Fator R = Folha / RBT12 — ≥ 28% → Anexo III; &lt; 28% → Anexo V
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular DAS"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoSimples
          resultado={resultado}
          comparativo={comparativo}
          fatorR={fatorRInfo}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
