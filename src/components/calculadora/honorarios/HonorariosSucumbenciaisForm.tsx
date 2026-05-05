import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  TableFooter,
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
  honorariosSucumbenciais,
  type ResultadoHonorariosSucumbenciais,
} from "@/lib/calculators/honorarios";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  valorCondenacao: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe um valor maior que zero"),
  tipoAcao: z.enum(["normal", "fazenda"]),
  grau: z.enum(["primeiro", "segundo", "stj_stf"]),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function HonorariosSucumbenciaisForm() {
  const [resultado, setResultado] = useState<ResultadoHonorariosSucumbenciais | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      valorCondenacao: "0",
      tipoAcao: "normal",
      grau: "primeiro",
    },
  });

  const valorField = watch("valorCondenacao");

  const onSubmit = (data: FormValues) => {
    const res = honorariosSucumbenciais({
      valorCondenacao: new Decimal(data.valorCondenacao),
      tipoAcao: data.tipoAcao,
      grau: data.grau,
    });
    setResultado(res);
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
        ? `Honorários Sucumbenciais — ${selectedProcesso.numero_processo}`
        : `Honorários Sucumbenciais — ${formatBRL(resultado.totalMin)} a ${formatBRL(resultado.totalMax)}`;

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "honorarios",
        tipo: "sucumbenciais",
        titulo,
        inputs_json: {
          valorCondenacao: valorField,
          tipoAcao: watch("tipoAcao"),
          grau: watch("grau"),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          totalMin: resultado.totalMin.toString(),
          totalMax: resultado.totalMax.toString(),
          legislacao: resultado.legislacao,
          reducaoGrau: resultado.reducaoGrau?.toString() ?? null,
        },
        steps_json: resultado.faixas.map((f) => ({
          descricao: f.descricao,
          percentualMin: f.percentualMin.toString(),
          percentualMax: f.percentualMax.toString(),
          valorMin: f.valorMin.toString(),
          valorMax: f.valorMax.toString(),
        })) as unknown[],
      });

      if (error) throw error;
      toast.success("Cálculo salvo no histórico!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cálculo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Honorários Sucumbenciais</CardTitle>
          <CardDescription>
            Cálculo conforme art. 85 CPC — causas normais e Fazenda Pública
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

            {/* Valor da condenação */}
            <div className="space-y-1.5">
              <Label>Valor da condenação / causa</Label>
              <CurrencyInput
                value={valorField}
                onChange={(v) =>
                  setValue("valorCondenacao", v, { shouldValidate: true })
                }
              />
              {errors.valorCondenacao && (
                <p className="text-xs text-destructive">
                  {errors.valorCondenacao.message}
                </p>
              )}
            </div>

            {/* Tipo de ação */}
            <div className="space-y-1.5">
              <Label>Tipo de ação</Label>
              <Select
                defaultValue="normal"
                onValueChange={(v) =>
                  setValue("tipoAcao", v as FormValues["tipoAcao"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    Causa normal (art. 85 §2)
                  </SelectItem>
                  <SelectItem value="fazenda">
                    Fazenda Pública (art. 85 §3)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Grau */}
            <div className="space-y-1.5">
              <Label>Grau</Label>
              <Select
                defaultValue="primeiro"
                onValueChange={(v) =>
                  setValue("grau", v as FormValues["grau"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primeiro">1º grau</SelectItem>
                  <SelectItem value="segundo">
                    2º grau (§11 — honorários recursais)
                  </SelectItem>
                  <SelectItem value="stj_stf">
                    STJ / STF (§11 — honorários recursais)
                  </SelectItem>
                </SelectContent>
              </Select>
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">
                {watch("tipoAcao") === "normal" ? "Art. 85 §2 CPC" : "Art. 85 §3 CPC"}
              </Badge>
              {watch("grau") !== "primeiro" && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  Art. 85 §11 — Honorários Recursais
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resultado.legislacao}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tabela de faixas */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">% Mín</TableHead>
                  <TableHead className="text-right">% Máx</TableHead>
                  <TableHead className="text-right">Valor Mín</TableHead>
                  <TableHead className="text-right">Valor Máx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.faixas.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{f.descricao}</TableCell>
                    <TableCell className="text-right">
                      {f.percentualMin.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {f.percentualMax.toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(f.valorMin)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(f.valorMax)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBRL(resultado.totalMin)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBRL(resultado.totalMax)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            {/* Nota grau recursal */}
            {resultado.reducaoGrau && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Art. 85 §11 CPC:</strong> os honorários acima são calculados a
                  título de trabalho adicional realizado em grau recursal (
                  {watch("grau") === "segundo" ? "50%" : "25%"} do valor de 1º grau).
                  Esses honorários são majorados sobre os já fixados no grau anterior e
                  não podem ultrapassar os limites totais dos §§ 2º e 3º.
                </p>
              </div>
            )}

            <Separator />

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
