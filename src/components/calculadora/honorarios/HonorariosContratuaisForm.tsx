import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";
import {
  ProcessoSelector,
  type ProcessoInfo,
} from "@/components/calculadora/shared/ProcessoSelector";
import {
  honorariosContratuais,
  comparativoHonorarios,
  TABELAS_OAB,
  type ResultadoHonorariosContratuais,
  type AreaJuridica,
} from "@/lib/calculators/honorarios";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADOS = Object.values(TABELAS_OAB)
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  .map((t) => ({ value: t.estado, label: `${t.nome} (${t.estado})` }));

const AREAS: { value: AreaJuridica; label: string }[] = [
  { value: "civel", label: "Cível" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "criminal", label: "Criminal" },
  { value: "consultoria", label: "Consultoria / Parecer" },
];

const PERCENTUAIS_COMPARATIVO = [10, 15, 20, 25, 30];

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  valorCausa: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe um valor maior que zero"),
  estado: z.string().min(2, "Selecione o estado"),
  areaJuridica: z.enum(["civel", "trabalhista", "criminal", "consultoria"]),
  percentualNegociado: z
    .string()
    .optional()
    .refine(
      (v) => !v || (parseFloat(v) > 0 && parseFloat(v) <= 100),
      "Percentual deve ser entre 0,01% e 100%"
    ),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function HonorariosContratuaisForm() {
  const [resultado, setResultado] = useState<ResultadoHonorariosContratuais | null>(null);
  const [comparativo, setComparativo] = useState<
    Array<{ percentual: number; valor: Decimal; abaixoMinimo: boolean }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valorCausa: "0",
      estado: "SP",
      areaJuridica: "civel",
      percentualNegociado: "",
    },
  });

  const valorField = watch("valorCausa");
  const estadoField = watch("estado");
  const areaField = watch("areaJuridica");

  const onSubmit = (data: FormValues) => {
    const valorCausa = new Decimal(data.valorCausa);
    const percentualNegociado = data.percentualNegociado
      ? parseFloat(data.percentualNegociado)
      : undefined;

    const res = honorariosContratuais({
      valorCausa,
      estado: data.estado,
      areaJuridica: data.areaJuridica,
      percentualNegociado,
    });

    const comp = comparativoHonorarios({
      valorCausa,
      estado: data.estado,
      areaJuridica: data.areaJuridica,
      percentuaisSimular: PERCENTUAIS_COMPARATIVO,
    });

    setResultado(res);
    setComparativo(comp);
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const titulo = selectedProcesso
        ? `Honorários Contratuais — ${selectedProcesso.numero_processo}`
        : `Honorários Contratuais — ${estadoField} ${areaField} — ${formatBRL(resultado.honorariosMin)}`;

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "honorarios",
        tipo: "contratuais",
        titulo,
        inputs_json: {
          valorCausa: valorField,
          estado: estadoField,
          areaJuridica: areaField,
          percentualNegociado: watch("percentualNegociado") || null,
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          honorariosMin: resultado.honorariosMin.toString(),
          honorariosMax: resultado.honorariosMax.toString(),
          percentualAplicado: resultado.percentualAplicado,
          tabelaReferencia: resultado.tabelaReferencia,
          abaixoMinimo: resultado.abaixoMinimo,
        },
        steps_json: [],
      });

      if (error) throw error;
      toast.success("Cálculo salvo no histórico!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cálculo.");
    } finally {
      setIsSaving(false);
    }
  };

  const isFixedFee =
    resultado &&
    resultado.faixaAplicada.percentualMin === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Honorários Contratuais</CardTitle>
          <CardDescription>
            Honorários mínimos conforme tabela OAB do estado selecionado
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

            {/* Estado */}
            <div className="space-y-1.5">
              <Label>Estado (OAB)</Label>
              <Select
                defaultValue="SP"
                onValueChange={(v) =>
                  setValue("estado", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado && (
                <p className="text-xs text-destructive">{errors.estado.message}</p>
              )}
            </div>

            {/* Área jurídica */}
            <div className="space-y-1.5">
              <Label>Área jurídica</Label>
              <Select
                defaultValue="civel"
                onValueChange={(v) =>
                  setValue("areaJuridica", v as FormValues["areaJuridica"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor da causa */}
            <div className="space-y-1.5">
              <Label>Valor da causa</Label>
              <CurrencyInput
                value={valorField}
                onChange={(v) =>
                  setValue("valorCausa", v, { shouldValidate: true })
                }
              />
              {errors.valorCausa && (
                <p className="text-xs text-destructive">
                  {errors.valorCausa.message}
                </p>
              )}
            </div>

            {/* Percentual negociado */}
            <div className="space-y-1.5">
              <Label>
                Percentual negociado{" "}
                <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                placeholder="Deixe em branco para usar o mínimo OAB"
                {...register("percentualNegociado")}
              />
              {errors.percentualNegociado && (
                <p className="text-xs text-destructive">
                  {errors.percentualNegociado.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Calcular
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {resultado.abaixoMinimo ? (
                <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Abaixo do mínimo OAB
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Dentro da tabela OAB
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {resultado.legislacao}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valores principais */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Mínimo OAB-{estadoField}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-lg font-semibold">
                    {isFixedFee
                      ? formatBRL(resultado.honorariosMin)
                      : `${formatBRL(resultado.honorariosMin)} (${resultado.faixaAplicada.percentualMin}%)`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Máximo OAB
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-lg font-semibold">
                    {isFixedFee
                      ? formatBRL(resultado.honorariosMax)
                      : `${formatBRL(resultado.honorariosMax)} (${resultado.faixaAplicada.percentualMax}%)`}
                  </p>
                </CardContent>
              </Card>

              {resultado.honorariosNegociado && (
                <Card
                  className={
                    resultado.abaixoMinimo
                      ? "border-red-200 bg-red-50"
                      : "border-green-200 bg-green-50"
                  }
                >
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle
                      className={`text-xs font-medium ${
                        resultado.abaixoMinimo ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      Seus honorários
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p
                      className={`text-lg font-bold ${
                        resultado.abaixoMinimo ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {formatBRL(resultado.honorariosNegociado)}{" "}
                      ({watch("percentualNegociado")}%)
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Aviso se abaixo do mínimo */}
            {resultado.abaixoMinimo && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-800">
                    <strong>Atenção:</strong> o percentual informado está abaixo do mínimo
                    estabelecido pela tabela OAB-{estadoField}. A cobrança abaixo do mínimo pode
                    caracterizar concorrência desleal (art. 34, IV, EOAB).
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Tabela comparativa (só para áreas com % variável) */}
            {!isFixedFee && comparativo.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Comparativo de percentuais</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Percentual</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparativo.map((row) => (
                      <TableRow key={row.percentual}>
                        <TableCell className="font-medium">{row.percentual}%</TableCell>
                        <TableCell className="text-right">{formatBRL(row.valor)}</TableCell>
                        <TableCell className="text-right">
                          {row.abaixoMinimo ? (
                            <span className="text-xs text-red-600 font-medium">
                              Abaixo do mínimo
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">
                              Dentro da tabela
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSalvar} disabled={isSaving} size="sm">
                {isSaving ? "Salvando…" : "Salvar no histórico"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
