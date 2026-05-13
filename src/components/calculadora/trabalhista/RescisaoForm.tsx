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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import {
  calcularRescisao,
  type TipoDesligamento,
  type ResultadoRescisao,
} from "@/lib/calculators/trabalhista";
import { formatBRL } from "@/lib/calculators/engine";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    salarioBase: z.string().refine((v) => parseFloat(v) > 0, "Informe o salário base"),
    mediaVariavel: z.string(),
    dataAdmissao: z.string().min(1, "Informe a data de admissão"),
    dataDesligamento: z.string().min(1, "Informe a data de desligamento"),
    tipoDesligamento: z.enum([
      "sem_justa_causa",
      "justa_causa",
      "pedido_demissao",
      "acordo_mutuo",
      "morte_empregado",
    ]),
    saldoFGTS: z.string(),
    avisoPrevioTrabalhado: z.boolean(),
    feriasVencidas: z.boolean(),
    dependentes: z.coerce.number().int().min(0),
  })
  .refine((d) => d.dataDesligamento >= d.dataAdmissao, {
    message: "Data de desligamento deve ser posterior à admissão",
    path: ["dataDesligamento"],
  });

type FormValues = z.infer<typeof schema>;

// ─── Labels ──────────────────────────────────────────────────────────────────

const TIPOS_DESLIGAMENTO: { value: TipoDesligamento; label: string }[] = [
  { value: "sem_justa_causa", label: "Dispensa sem justa causa" },
  { value: "justa_causa",     label: "Dispensa por justa causa" },
  { value: "pedido_demissao", label: "Pedido de demissão" },
  { value: "acordo_mutuo",    label: "Acordo mútuo (art. 484-A CLT)" },
  { value: "morte_empregado", label: "Morte do empregado" },
];

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoRescisaoCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoRescisao;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Verbas individuais */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Verbas Rescisórias</CardTitle>
            <Button size="sm" onClick={onSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {resultado.verbas.map((verba, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{verba.label}</p>
                  {verba.base && (
                    <p className="text-xs text-muted-foreground mt-0.5">{verba.base}</p>
                  )}
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatBRL(verba.valor)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Bruto</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold">{formatBRL(resultado.totalBruto)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">INSS Desconto</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold text-red-600">− {formatBRL(resultado.inss)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">IRRF Desconto</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold text-red-600">
              − {formatBRL(resultado.irrf.imposto)}
            </p>
            <p className="text-xs text-muted-foreground">
              Alíquota efetiva: {resultado.irrf.aliquotaEfetiva.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-primary">Líquido a Receber</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-primary">{formatBRL(resultado.totalLiquido)}</p>
          </CardContent>
        </Card>
      </div>

      {/* FGTS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">FGTS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo + depósitos do aviso prévio</span>
            <span className="font-medium tabular-nums">
              Base para multa
            </span>
          </div>
          {resultado.fgtsMulta.gt(0) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Multa rescisória ({resultado.fgtsMulta.div(resultado.fgtsTotal.minus(resultado.fgtsMulta)).times(100).toFixed(0)}%)
              </span>
              <span className="font-medium tabular-nums text-green-700">
                + {formatBRL(resultado.fgtsMulta)}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total FGTS a receber</span>
            <span className="tabular-nums text-green-700">{formatBRL(resultado.fgtsTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Nota de aviso prévio */}
      <div className="rounded-md border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Aviso prévio: </span>
          {resultado.avisoPreviosDias} dias (30 dias + proporcional conforme art. 1º Lei 12.506/2011)
        </p>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function RescisaoForm() {
  const [resultado, setResultado] = useState<ResultadoRescisao | null>(null);
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
      mediaVariavel: "0",
      dataAdmissao: "",
      dataDesligamento: "",
      tipoDesligamento: "sem_justa_causa",
      saldoFGTS: "0",
      avisoPrevioTrabalhado: false,
      feriasVencidas: false,
      dependentes: 0,
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const salarioBaseField = watch("salarioBase");
  const mediaVariavelField = watch("mediaVariavel");
  const saldoFGTSField = watch("saldoFGTS");
  const avisoPrevioTrabalhado = watch("avisoPrevioTrabalhado");
  const feriasVencidas = watch("feriasVencidas");
  const tipoDesligamento = watch("tipoDesligamento");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const res = calcularRescisao({
        salarioBase: new Decimal(data.salarioBase),
        mediaVariavel: new Decimal(data.mediaVariavel || "0"),
        dataAdmissao: new Date(data.dataAdmissao + "T00:00:00"),
        dataDesligamento: new Date(data.dataDesligamento + "T00:00:00"),
        tipoDesligamento: data.tipoDesligamento,
        saldoFGTS: new Decimal(data.saldoFGTS || "0"),
        avisoPrevioTrabalhado: data.avisoPrevioTrabalhado,
        feriasVencidas: data.feriasVencidas,
        dependentes: data.dependentes,
        ano: new Date(data.dataDesligamento + "T00:00:00").getFullYear(),
      });
      setResultado(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular rescisão.");
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
        tipo: "rescisao",
        titulo: selectedProcesso
          ? `Rescisão — ${selectedProcesso.numero_processo}`
          : `Rescisão — ${TIPOS_DESLIGAMENTO.find(t => t.value === tipoDesligamento)?.label}`,
        inputs_json: {
          salarioBase: salarioBaseField,
          mediaVariavel: mediaVariavelField,
          dataAdmissao: watch("dataAdmissao"),
          dataDesligamento: watch("dataDesligamento"),
          tipoDesligamento,
          saldoFGTS: saldoFGTSField,
          avisoPrevioTrabalhado,
          feriasVencidas,
          dependentes: watch("dependentes"),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          totalBruto: resultado.totalBruto.toString(),
          inss: resultado.inss.toString(),
          irrfImposto: resultado.irrf.imposto.toString(),
          totalLiquido: resultado.totalLiquido.toString(),
          fgtsTotal: resultado.fgtsTotal.toString(),
        },
        steps_json: resultado.verbas.map((v) => ({
          label: v.label,
          valor: v.valor.toString(),
          base: v.base,
        })),
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
          <CardTitle className="text-base">Rescisão de Contrato de Trabalho</CardTitle>
          <CardDescription>
            Verbas rescisórias, FGTS, INSS e IRRF por tipo de desligamento (CLT)
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

            {/* Tipo de desligamento */}
            <div className="space-y-1.5">
              <Label>Tipo de Desligamento</Label>
              <Select
                defaultValue="sem_justa_causa"
                onValueChange={(v) =>
                  setValue("tipoDesligamento", v as TipoDesligamento, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DESLIGAMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoDesligamento === "sem_justa_causa" && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Multa FGTS 40% + aviso prévio proporcional
                </Badge>
              )}
              {tipoDesligamento === "acordo_mutuo" && (
                <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                  Multa FGTS 20% + aviso prévio 50% (art. 484-A CLT)
                </Badge>
              )}
              {tipoDesligamento === "justa_causa" && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  Sem multa FGTS · Sem aviso prévio · Sem 13º proporcional
                </Badge>
              )}
            </div>

            {/* Salário */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="space-y-1.5">
                <Label>Média de Variáveis (HE, comissões…)</Label>
                <CurrencyInput
                  value={mediaVariavelField}
                  onChange={(v) => setValue("mediaVariavel", v)}
                />
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data de Admissão</Label>
                <DatePicker
                  value={watch("dataAdmissao")}
                  onChange={(v) => setValue("dataAdmissao", v, { shouldValidate: true })}
                  max={new Date().toISOString().split("T")[0]}
                />
                {errors.dataAdmissao && (
                  <p className="text-xs text-destructive">{errors.dataAdmissao.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Data de Desligamento</Label>
                <DatePicker
                  value={watch("dataDesligamento")}
                  onChange={(v) => setValue("dataDesligamento", v, { shouldValidate: true })}
                  max={new Date().toISOString().split("T")[0]}
                />
                {errors.dataDesligamento && (
                  <p className="text-xs text-destructive">{errors.dataDesligamento.message}</p>
                )}
              </div>
            </div>

            {/* Saldo FGTS */}
            <div className="space-y-1.5">
              <Label>Saldo FGTS Acumulado</Label>
              <CurrencyInput
                value={saldoFGTSField}
                onChange={(v) => setValue("saldoFGTS", v)}
              />
              <p className="text-xs text-muted-foreground">
                Consulte o saldo na Caixa Econômica Federal. Necessário para calcular a multa rescisória.
              </p>
            </div>

            {/* Dependentes */}
            <div className="space-y-1.5">
              <Label>Número de Dependentes (IRRF)</Label>
              <Input
                type="number"
                min={0}
                {...register("dependentes")}
                className="w-32"
              />
            </div>

            <Separator />

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Aviso Prévio Trabalhado</p>
                  <p className="text-xs text-muted-foreground">
                    Se cumprido, não há indenização do aviso prévio
                  </p>
                </div>
                <Switch
                  checked={avisoPrevioTrabalhado}
                  onCheckedChange={(v) => setValue("avisoPrevioTrabalhado", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Férias Vencidas não Gozadas</p>
                  <p className="text-xs text-muted-foreground">
                    Período aquisitivo completo sem gozo
                  </p>
                </div>
                <Switch
                  checked={feriasVencidas}
                  onCheckedChange={(v) => setValue("feriasVencidas", v)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular Rescisão"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 rounded-lg" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoRescisaoCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
