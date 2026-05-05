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
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";
import {
  ProcessoSelector,
  type ProcessoInfo,
} from "@/components/calculadora/shared/ProcessoSelector";
import {
  honorariosAlimentos,
  type ResultadoHonorariosContratuais,
} from "@/lib/calculators/honorarios";
import { formatBRL } from "@/lib/calculators/engine";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  prestacaoMensal: z
    .string()
    .refine((v) => parseFloat(v) > 0, "Informe um valor maior que zero"),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function HonorariosAlimentosForm() {
  const [resultado, setResultado] = useState<ResultadoHonorariosContratuais | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { prestacaoMensal: "0" },
  });

  const prestacaoField = watch("prestacaoMensal");

  const onSubmit = (data: FormValues) => {
    const res = honorariosAlimentos({
      prestacaoMensal: new Decimal(data.prestacaoMensal),
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
        ? `Honorários — Ação de Alimentos — ${selectedProcesso.numero_processo}`
        : `Honorários — Ação de Alimentos — ${formatBRL(resultado.honorariosMin)} a ${formatBRL(resultado.honorariosMax)}`;

      const { error } = await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "honorarios",
        tipo: "alimentos",
        titulo,
        inputs_json: {
          prestacaoMensal: prestacaoField,
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          baseCalculo: resultado.valorCausa.toString(),
          honorariosMin: resultado.honorariosMin.toString(),
          honorariosMax: resultado.honorariosMax.toString(),
          legislacao: resultado.legislacao,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Honorários — Ação de Alimentos</CardTitle>
          <CardDescription>
            Base de cálculo: 12 prestações mensais (art. 85 §14 CPC)
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

            {/* Prestação mensal */}
            <div className="space-y-1.5">
              <Label>Valor da prestação mensal</Label>
              <CurrencyInput
                value={prestacaoField}
                onChange={(v) =>
                  setValue("prestacaoMensal", v, { shouldValidate: true })
                }
              />
              {errors.prestacaoMensal && (
                <p className="text-xs text-destructive">
                  {errors.prestacaoMensal.message}
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
            <Badge variant="secondary">Art. 85 §14 CPC</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {resultado.legislacao}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Base de cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-lg font-semibold">
                    {formatBRL(resultado.valorCausa)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    12 × {formatBRL(new Decimal(prestacaoField))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    Honorários mínimos (10%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-lg font-semibold">
                    {formatBRL(resultado.honorariosMin)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-primary">
                    Honorários máximos (20%)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xl font-bold text-primary">
                    {formatBRL(resultado.honorariosMax)}
                  </p>
                </CardContent>
              </Card>
            </div>

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
