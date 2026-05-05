import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import {
  calcularLiquidacaoSentenca,
  type ResultadoLiquidacao,
} from "@/lib/calculators/trabalhista";
import { formatBRL } from "@/lib/calculators/engine";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const verbaSchema = z.object({
  descricao: z.string().min(1, "Informe a descrição"),
  valorBruto: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor"),
  competencia: z.string(),
});

const schema = z.object({
  verbas: z.array(verbaSchema).min(1, "Adicione ao menos uma verba"),
  dataBase: z.string().min(1, "Informe a data-base"),
  dataCalculo: z.string().min(1, "Informe a data do cálculo"),
  incluirFGTS: z.boolean(),
  multaFGTS: z.boolean(),
  salarioBaseAtual: z.string().refine((v) => parseFloat(v) > 0, "Informe o salário"),
  dependentes: z.coerce.number().int().min(0),
  ano: z.coerce.number().int().min(2020),
});

type FormValues = z.infer<typeof schema>;

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoLiquidacaoCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoLiquidacao;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Verbas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Apuração de Verbas</CardTitle>
            <Button size="sm" onClick={onSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {resultado.verbas.map((v, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{v.descricao}</p>
                  {v.competencia && (
                    <p className="text-xs text-muted-foreground">{v.competencia}</p>
                  )}
                </div>
                <p className="text-sm tabular-nums">{formatBRL(v.valorBruto)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-6 py-3 bg-muted/40 font-semibold">
              <p className="text-sm">Subtotal verbas</p>
              <p className="text-sm tabular-nums">{formatBRL(resultado.subtotalVerbas)}</p>
            </div>
            {resultado.fgtsVerbas.gt(0) && (
              <>
                <div className="flex items-center justify-between px-6 py-3">
                  <p className="text-sm">FGTS sobre verbas (8%)</p>
                  <p className="text-sm tabular-nums text-green-700">
                    + {formatBRL(resultado.fgtsVerbas)}
                  </p>
                </div>
                {resultado.multaFGTS.gt(0) && (
                  <div className="flex items-center justify-between px-6 py-3">
                    <p className="text-sm">Multa FGTS (40%)</p>
                    <p className="text-sm tabular-nums text-green-700">
                      + {formatBRL(resultado.multaFGTS)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Descontos + Líquido */}
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
            <CardTitle className="text-xs font-medium text-muted-foreground">INSS</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold text-red-600">− {formatBRL(resultado.inss)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">IRRF</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold text-red-600">
              − {formatBRL(resultado.irrf.imposto)}
            </p>
            <p className="text-xs text-muted-foreground">
              {resultado.irrf.aliquotaEfetiva.toFixed(1)}% efetiva
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-primary">Líquido</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-primary">{formatBRL(resultado.totalLiquido)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Nota de correção */}
      <div className="rounded-md border bg-amber-50 border-amber-200 px-4 py-3">
        <p className="text-xs text-amber-800">
          <span className="font-medium">Correção monetária: </span>
          {resultado.notaCorrecao}
        </p>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function LiquidacaoSentencaForm() {
  const [resultado, setResultado] = useState<ResultadoLiquidacao | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const anoAtual = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      verbas: [{ descricao: "", valorBruto: "0", competencia: "" }],
      dataBase: "",
      dataCalculo: new Date().toISOString().split("T")[0],
      incluirFGTS: true,
      multaFGTS: true,
      salarioBaseAtual: "0",
      dependentes: 0,
      ano: anoAtual,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "verbas" });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const incluirFGTS = watch("incluirFGTS");
  const multaFGTS = watch("multaFGTS");
  const salarioBaseField = watch("salarioBaseAtual");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const res = calcularLiquidacaoSentenca({
        verbas: data.verbas.map((v) => ({
          descricao: v.descricao,
          valorBruto: new Decimal(v.valorBruto),
          competencia: v.competencia || undefined,
        })),
        dataBase: new Date(data.dataBase + "T00:00:00"),
        dataCalculo: new Date(data.dataCalculo + "T00:00:00"),
        incluirFGTS: data.incluirFGTS,
        multaFGTS: data.multaFGTS,
        salarioBaseAtual: new Decimal(data.salarioBaseAtual),
        dependentes: data.dependentes,
        ano: data.ano,
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
        tipo: "liquidacao-sentenca",
        titulo: selectedProcesso
          ? `Liquidação de Sentença — ${selectedProcesso.numero_processo}`
          : `Liquidação de Sentença — ${watch("verbas").length} verba(s)`,
        inputs_json: {
          verbas: watch("verbas"),
          dataBase: watch("dataBase"),
          dataCalculo: watch("dataCalculo"),
          incluirFGTS,
          multaFGTS,
          salarioBaseAtual: salarioBaseField,
          dependentes: watch("dependentes"),
          ano: watch("ano"),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          subtotalVerbas: resultado.subtotalVerbas.toString(),
          fgtsVerbas: resultado.fgtsVerbas.toString(),
          multaFGTS: resultado.multaFGTS.toString(),
          inss: resultado.inss.toString(),
          irrf: resultado.irrf.imposto.toString(),
          totalBruto: resultado.totalBruto.toString(),
          totalLiquido: resultado.totalLiquido.toString(),
        },
        steps_json: resultado.verbas.map((v) => ({
          descricao: v.descricao,
          valorBruto: v.valorBruto.toString(),
          competencia: v.competencia,
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
          <CardTitle className="text-base">Liquidação de Sentença Trabalhista</CardTitle>
          <CardDescription>
            Verbas condenatórias com FGTS, multa rescisória, INSS e IRRF — ADC 58/2020 (STF)
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

            {/* Verbas */}
            <div className="space-y-3">
              <Label>Verbas Condenatórias</Label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder="Descrição (ex: Diferenças salariais)"
                      {...register(`verbas.${index}.descricao`)}
                    />
                    {errors.verbas?.[index]?.descricao && (
                      <p className="text-xs text-destructive">
                        {errors.verbas[index].descricao?.message}
                      </p>
                    )}
                  </div>
                  <div className="w-40">
                    <CurrencyInput
                      value={watch(`verbas.${index}.valorBruto`)}
                      onChange={(v) =>
                        setValue(`verbas.${index}.valorBruto`, v, { shouldValidate: true })
                      }
                    />
                    {errors.verbas?.[index]?.valorBruto && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.verbas[index].valorBruto?.message}
                      </p>
                    )}
                  </div>
                  <div className="w-32">
                    <Input
                      placeholder="Competência"
                      {...register(`verbas.${index}.competencia`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ descricao: "", valorBruto: "0", competencia: "" })}
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Adicionar verba
              </Button>
            </div>

            <Separator />

            {/* Datas */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Data-base (propositura/condenação)</Label>
                <DatePicker
                  value={watch("dataBase")}
                  onChange={(v) => setValue("dataBase", v, { shouldValidate: true })}
                />
                {errors.dataBase && (
                  <p className="text-xs text-destructive">{errors.dataBase.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Data do Cálculo</Label>
                <DatePicker
                  value={watch("dataCalculo")}
                  onChange={(v) => setValue("dataCalculo", v, { shouldValidate: true })}
                />
              </div>
            </div>

            {/* Salário e dependentes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Salário Base Atual</Label>
                <CurrencyInput
                  value={salarioBaseField}
                  onChange={(v) => setValue("salarioBaseAtual", v, { shouldValidate: true })}
                />
                {errors.salarioBaseAtual && (
                  <p className="text-xs text-destructive">{errors.salarioBaseAtual.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Dependentes (IRRF)</Label>
                <Input type="number" min={0} {...register("dependentes")} className="w-24" />
              </div>
            </div>

            {/* Ano de referência */}
            <div className="space-y-1.5">
              <Label>Ano de Referência (tabelas INSS/IRRF)</Label>
              <Input type="number" min={2020} max={2030} {...register("ano")} className="w-28" />
            </div>

            <Separator />

            {/* FGTS switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Incluir FGTS sobre verbas (8%)</p>
                  <p className="text-xs text-muted-foreground">
                    Incide sobre verbas de natureza salarial
                  </p>
                </div>
                <Switch
                  checked={incluirFGTS}
                  onCheckedChange={(v) => setValue("incluirFGTS", v)}
                />
              </div>
              {incluirFGTS && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Multa FGTS 40%</p>
                    <p className="text-xs text-muted-foreground">
                      Incide quando há dispensa sem justa causa
                    </p>
                  </div>
                  <Switch
                    checked={multaFGTS}
                    onCheckedChange={(v) => setValue("multaFGTS", v)}
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular Liquidação"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isCalculating && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-lg" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {resultado && !isCalculating && (
        <ResultadoLiquidacaoCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
