import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import {
  rateioCreditosFalencia,
  type ClasseCredor,
  type ResultadoRateioCreditosFalencia,
} from "@/lib/calculators/empresarial";

// ─── Schema ───────────────────────────────────────────────────────────────────

const credorSchema = z.object({
  nome: z.string().min(1, "Informe o nome do credor"),
  classe: z.enum(["trabalhista", "garantia_real", "tributario", "quirografario", "subordinado"]),
  valorCredito: z.string().refine((v) => parseFloat(v) > 0, "Informe um valor maior que zero"),
});

const schema = z.object({
  ativoDisponivel: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe o ativo disponível"),
  credores: z.array(credorSchema).min(1, "Adicione ao menos um credor"),
});

type FormValues = z.infer<typeof schema>;

// ─── Labels ──────────────────────────────────────────────────────────────────

const CLASSES_CREDOR: { value: ClasseCredor; label: string }[] = [
  { value: "trabalhista", label: "Trabalhista (≤ 150 SM)" },
  { value: "garantia_real", label: "Garantia Real" },
  { value: "tributario", label: "Tributário" },
  { value: "quirografario", label: "Quirografário" },
  { value: "subordinado", label: "Subordinado" },
];

const CLASSE_LABEL: Record<ClasseCredor, string> = {
  trabalhista: "Trabalhista",
  garantia_real: "Garantia Real",
  tributario: "Tributário",
  quirografario: "Quirografário",
  subordinado: "Subordinado",
};

function formatBRL(value: Decimal): string {
  return value.toNumber().toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FalenciaRateioForm() {
  const [resultado, setResultado] = useState<ResultadoRateioCreditosFalencia | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ativoDisponivel: "0",
      credores: [{ nome: "", classe: "quirografario", valorCredito: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "credores" });

  const ativoDisponivelField = watch("ativoDisponivel");
  const credoresField = watch("credores");

  const onSubmit = (data: FormValues) => {
    try {
      const ativo = new Decimal(data.ativoDisponivel);
      const credores = data.credores.map((c) => ({
        nome: c.nome,
        classe: c.classe,
        valorCredito: new Decimal(c.valorCredito),
      }));
      const res = rateioCreditosFalencia(ativo, credores);
      setResultado(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao calcular. Tente novamente.");
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

      const resultadoJson = {
        ativoDisponivel: resultado.ativoDisponivel.toString(),
        totalCreditos: resultado.totalCreditos.toString(),
        totalDistribuido: resultado.totalDistribuido.toString(),
        saldoRemanescente: resultado.saldoRemanescente.toString(),
        legislacao: resultado.legislacao,
        porClasse: resultado.porClasse.map((pc) => ({
          classe: pc.classe,
          totalCreditos: pc.totalCreditos.toString(),
          totalRecebido: pc.totalRecebido.toString(),
          percentualRecuperacao: pc.percentualRecuperacao.toString(),
          credores: pc.credores.map((c) => ({
            nome: c.nome,
            classe: c.classe,
            valorCredito: c.valorCredito.toString(),
            valorRecebido: c.valorRecebido.toString(),
            percentualRecuperacao: c.percentualRecuperacao.toString(),
          })),
        })),
      };

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "empresarial",
        tipo: "falencia-rateio",
        titulo: `Rateio Falência — Ativo ${formatBRL(resultado.ativoDisponivel)}`,
        inputs_json: {
          ativoDisponivel: ativoDisponivelField,
          credores: credoresField,
        },
        resultado_json: resultadoJson,
        steps_json: null,
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
          <CardTitle className="text-base">Rateio de Créditos na Falência</CardTitle>
          <CardDescription>
            Distribui o ativo disponível entre credores conforme a ordem de prioridade da Lei
            11.101/2005 alterada pela Lei 14.112/2020
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Ativo disponível */}
            <div className="space-y-1.5">
              <Label>Ativo Líquido Disponível para Distribuição</Label>
              <CurrencyInput
                value={ativoDisponivelField}
                onChange={(v) => setValue("ativoDisponivel", v, { shouldValidate: true })}
              />
              {errors.ativoDisponivel && (
                <p className="text-xs text-destructive">{errors.ativoDisponivel.message}</p>
              )}
            </div>

            <Separator />

            {/* Tabela de credores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Credores</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ nome: "", classe: "quirografario", valorCredito: "0" })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar credor
                </Button>
              </div>

              {errors.credores?.root && (
                <p className="text-xs text-destructive">{errors.credores.root.message}</p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 gap-3 p-3 border rounded-lg sm:grid-cols-[1fr_160px_160px_auto]"
                  >
                    {/* Nome */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome do credor</Label>
                      <Input
                        placeholder="Ex: João da Silva"
                        {...register(`credores.${index}.nome`)}
                      />
                      {errors.credores?.[index]?.nome && (
                        <p className="text-xs text-destructive">
                          {errors.credores[index]?.nome?.message}
                        </p>
                      )}
                    </div>

                    {/* Classe */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Classe</Label>
                      <Select
                        defaultValue={field.classe}
                        onValueChange={(v) =>
                          setValue(`credores.${index}.classe`, v as ClasseCredor, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSES_CREDOR.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor do crédito */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Valor do crédito</Label>
                      <CurrencyInput
                        value={watch(`credores.${index}.valorCredito`)}
                        onChange={(v) =>
                          setValue(`credores.${index}.valorCredito`, v, {
                            shouldValidate: true,
                          })
                        }
                      />
                      {errors.credores?.[index]?.valorCredito && (
                        <p className="text-xs text-destructive">
                          {errors.credores[index]?.valorCredito?.message}
                        </p>
                      )}
                    </div>

                    {/* Remover */}
                    <div className="flex items-end">
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
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              Calcular Rateio
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado do Rateio</CardTitle>
            <CardDescription className="text-xs">{resultado.legislacao}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Resumo geral */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Ativo disponível</p>
                <p className="text-sm font-semibold">{formatBRL(resultado.ativoDisponivel)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Total de créditos</p>
                <p className="text-sm font-semibold">{formatBRL(resultado.totalCreditos)}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Total distribuído</p>
                <p className="text-sm font-semibold text-green-600">
                  {formatBRL(resultado.totalDistribuido)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Saldo remanescente</p>
                <p className="text-sm font-semibold">{formatBRL(resultado.saldoRemanescente)}</p>
              </div>
            </div>

            {/* Por classe */}
            <div className="space-y-4">
              {resultado.porClasse.map((pc) => (
                <div key={pc.classe} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{CLASSE_LABEL[pc.classe]}</h4>
                    <span className="text-xs text-muted-foreground">
                      Recuperação:{" "}
                      <span
                        className={
                          pc.percentualRecuperacao.gte(100)
                            ? "text-green-600 font-medium"
                            : pc.percentualRecuperacao.gt(0)
                            ? "text-amber-600 font-medium"
                            : "text-destructive font-medium"
                        }
                      >
                        {pc.percentualRecuperacao.toFixed(2)}%
                      </span>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-1.5 pr-4 font-medium">Credor</th>
                          <th className="text-right py-1.5 pr-4 font-medium">Crédito</th>
                          <th className="text-right py-1.5 pr-4 font-medium">Recebido</th>
                          <th className="text-right py-1.5 font-medium">% Recuperação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pc.credores.map((c, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1.5 pr-4">{c.nome}</td>
                            <td className="text-right py-1.5 pr-4">{formatBRL(c.valorCredito)}</td>
                            <td className="text-right py-1.5 pr-4 text-green-700">
                              {formatBRL(c.valorRecebido)}
                            </td>
                            <td className="text-right py-1.5">
                              {c.percentualRecuperacao.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                        <tr className="font-medium text-muted-foreground">
                          <td className="py-1.5 pr-4">Subtotal</td>
                          <td className="text-right py-1.5 pr-4">
                            {formatBRL(pc.totalCreditos)}
                          </td>
                          <td className="text-right py-1.5 pr-4 text-green-700">
                            {formatBRL(pc.totalRecebido)}
                          </td>
                          <td className="text-right py-1.5">
                            {pc.percentualRecuperacao.toFixed(2)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <Button
              onClick={handleSalvar}
              disabled={isSaving}
              variant="outline"
              className="w-full"
            >
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
