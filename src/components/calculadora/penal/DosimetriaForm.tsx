import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

import {
  dosimetria,
  formatarPena,
  penaParaDias,
  type ResultadoDosimetria,
} from "@/lib/calculators/penal";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    crime: z.string().optional(),
    penaMinAnos: z.coerce.number().int().min(0),
    penaMinMeses: z.coerce.number().int().min(0).max(11),
    penaMaxAnos: z.coerce.number().int().min(0),
    penaMaxMeses: z.coerce.number().int().min(0).max(11),
    circDesfavoraveis: z.coerce.number().int().min(0).max(8),
    agravantes: z.coerce.number().int().min(0),
    atenuantes: z.coerce.number().int().min(0),
    causaAumentoPct: z.coerce.number().min(0).max(200),
    causaDiminuicaoPct: z.coerce.number().min(0).max(100),
    reincidente: z.boolean(),
  })
  .refine(
    (d) => penaParaDias(d.penaMaxAnos, d.penaMaxMeses) >= penaParaDias(d.penaMinAnos, d.penaMinMeses),
    { message: "Pena máxima deve ser ≥ pena mínima", path: ["penaMaxAnos"] }
  );

type FormValues = z.infer<typeof schema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REGIME_LABEL: Record<string, string> = {
  fechado: "Fechado",
  semiaberto: "Semiaberto",
  aberto: "Aberto",
};

const REGIME_VARIANT: Record<string, "destructive" | "secondary" | "default"> = {
  fechado: "destructive",
  semiaberto: "secondary",
  aberto: "default",
};

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoDosimetriaCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoDosimetria;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dosimetria — Sistema Trifásico</CardTitle>
            <Badge variant={REGIME_VARIANT[resultado.regimeInicial]}>
              Regime {REGIME_LABEL[resultado.regimeInicial]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fases */}
          <div className="space-y-3">
            {resultado.fases.map((fase) => (
              <div key={fase.fase} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {fase.fase}
                    </span>
                    <span className="text-sm font-medium">{fase.descricao}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{formatarPena(fase.pena)}</span>
                </div>
                <p className="text-xs text-muted-foreground pl-7">{fase.ajuste}</p>
                <p className="text-xs text-muted-foreground/70 pl-7">{fase.fundamento}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Pena definitiva */}
          <div className="rounded-lg bg-primary/10 p-4 ring-1 ring-primary/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pena definitiva</p>
              <p className="text-xl font-bold text-primary">{formatarPena(resultado.penaDef)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ({resultado.penaDef.totalDias} dias)
              </p>
            </div>
            <Badge variant={REGIME_VARIANT[resultado.regimeInicial]} className="text-sm px-3">
              Regime {REGIME_LABEL[resultado.regimeInicial]}
            </Badge>
          </div>

          {/* Grid resumo de fases */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">Pena-base</p>
              <p className="font-semibold mt-0.5">{formatarPena(resultado.penaBase)}</p>
            </div>
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">Intermediária</p>
              <p className="font-semibold mt-0.5">{formatarPena(resultado.penaIntermediaria)}</p>
            </div>
            <div className="rounded-md bg-primary/10 p-2">
              <p className="text-muted-foreground">Definitiva</p>
              <p className="font-bold text-primary mt-0.5">{formatarPena(resultado.penaDef)}</p>
            </div>
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

export function DosimetriaForm() {
  const [resultado, setResultado] = useState<ResultadoDosimetria | null>(null);
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
      crime: "",
      penaMinAnos: 0,
      penaMinMeses: 0,
      penaMaxAnos: 0,
      penaMaxMeses: 0,
      circDesfavoraveis: 0,
      agravantes: 0,
      atenuantes: 0,
      causaAumentoPct: 0,
      causaDiminuicaoPct: 0,
      reincidente: false,
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const reincidente = watch("reincidente");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const penaMinDias = penaParaDias(data.penaMinAnos, data.penaMinMeses);
      const penaMaxDias = penaParaDias(data.penaMaxAnos, data.penaMaxMeses);

      if (penaMaxDias === 0) {
        throw new Error("Informe a pena máxima do crime.");
      }

      const res = dosimetria({
        penaMinDias,
        penaMaxDias,
        circunstanciasDesfavoraveis: data.circDesfavoraveis,
        agravantes: data.agravantes,
        atenuantes: data.atenuantes,
        causaAumentoPct: data.causaAumentoPct,
        causaDiminuicaoPct: data.causaDiminuicaoPct,
        reincidente: data.reincidente,
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
        area: "penal",
        tipo: "dosimetria",
        titulo: selectedProcesso
          ? `Dosimetria — ${selectedProcesso.numero_processo}`
          : `Dosimetria — ${formatarPena(resultado.penaDef)} (${REGIME_LABEL[resultado.regimeInicial]})`,
        inputs_json: {
          ...watch(),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          penaBase: resultado.penaBase,
          penaIntermediaria: resultado.penaIntermediaria,
          penaDef: resultado.penaDef,
          regimeInicial: resultado.regimeInicial,
        },
        steps_json: resultado.fases,
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
          <CardTitle className="text-base">Dosimetria da Pena</CardTitle>
          <CardDescription>
            Sistema trifásico: pena-base → circunstâncias legais → causas de aumento/diminuição
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

            {/* Crime */}
            <div className="space-y-1.5">
              <Label htmlFor="crime">Crime (opcional)</Label>
              <Input id="crime" placeholder="Ex: Roubo simples (art. 157 CP)" {...register("crime")} />
            </div>

            {/* Pena mínima */}
            <div className="space-y-1.5">
              <Label>Pena mínima cominada</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Anos"
                    {...register("penaMinAnos")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Anos</p>
                </div>
                <div>
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    placeholder="Meses"
                    {...register("penaMinMeses")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Meses</p>
                </div>
              </div>
            </div>

            {/* Pena máxima */}
            <div className="space-y-1.5">
              <Label>Pena máxima cominada</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Anos"
                    {...register("penaMaxAnos")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Anos</p>
                </div>
                <div>
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    placeholder="Meses"
                    {...register("penaMaxMeses")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Meses</p>
                </div>
              </div>
              {errors.penaMaxAnos && (
                <p className="text-xs text-destructive">{errors.penaMaxAnos.message}</p>
              )}
            </div>

            <Separator />

            {/* Fase 1 — Circunstâncias judiciais */}
            <div className="space-y-1.5">
              <Label htmlFor="circDesfavoraveis">
                Circunstâncias judiciais desfavoráveis (Fase 1)
              </Label>
              <Input
                id="circDesfavoraveis"
                type="number"
                min={0}
                max={8}
                {...register("circDesfavoraveis")}
              />
              <p className="text-xs text-muted-foreground">
                0 = todas neutras (pena mínima) · 8 = todas desfavoráveis (pena máxima) — art. 59 CP
              </p>
            </div>

            {/* Fase 2 — Agravantes/Atenuantes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agravantes">Agravantes (Fase 2)</Label>
                <Input id="agravantes" type="number" min={0} {...register("agravantes")} />
                <p className="text-xs text-muted-foreground">cada +1/6 — arts. 61-62 CP</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="atenuantes">Atenuantes (Fase 2)</Label>
                <Input id="atenuantes" type="number" min={0} {...register("atenuantes")} />
                <p className="text-xs text-muted-foreground">cada −1/6 — arts. 65-66 CP</p>
              </div>
            </div>

            {/* Fase 3 — Causas de aumento/diminuição */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="causaAumentoPct">Causa de aumento % (Fase 3)</Label>
                <Input
                  id="causaAumentoPct"
                  type="number"
                  min={0}
                  max={200}
                  step={0.01}
                  placeholder="Ex: 33.33 para 1/3"
                  {...register("causaAumentoPct")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="causaDiminuicaoPct">Causa de diminuição % (Fase 3)</Label>
                <Input
                  id="causaDiminuicaoPct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="Ex: 33.33 para 1/3"
                  {...register("causaDiminuicaoPct")}
                />
              </div>
            </div>

            <Separator />

            {/* Reincidente */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Réu reincidente</p>
                <p className="text-xs text-muted-foreground">
                  Afeta o regime inicial de cumprimento (art. 33 §2 CP)
                </p>
              </div>
              <Switch
                checked={reincidente}
                onCheckedChange={(v) => setValue("reincidente", v)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular dosimetria"}
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
        <ResultadoDosimetriaCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
