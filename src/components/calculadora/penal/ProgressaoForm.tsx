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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";

import {
  progressaoRegime,
  formatarPena,
  penaParaDias,
  type TipoProgressao,
  type ResultadoProgressao,
} from "@/lib/calculators/penal";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  penaAnos: z.coerce.number().int().min(0),
  penaMeses: z.coerce.number().int().min(0).max(11),
  penaDias: z.coerce.number().int().min(0).max(29),
  tipo: z.enum([
    "primario_sem_violencia",
    "primario_com_violencia",
    "reincidente_sem_violencia",
    "reincidente_com_violencia",
    "primario_hediondo",
    "primario_hediondo_morte",
    "reincidente_hediondo",
    "reincidente_hediondo_morte",
    "organizacao_criminosa_lider",
  ]),
  dataInicioAtual: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Opções ───────────────────────────────────────────────────────────────────

const TIPOS: { value: TipoProgressao; label: string; fracao: string }[] = [
  { value: "primario_sem_violencia",    label: "Primário — sem violência ou grave ameaça",       fracao: "16%" },
  { value: "primario_com_violencia",    label: "Primário — com violência ou grave ameaça",        fracao: "20%" },
  { value: "reincidente_sem_violencia", label: "Reincidente — sem violência",                     fracao: "25%" },
  { value: "reincidente_com_violencia", label: "Reincidente — com violência ou grave ameaça",     fracao: "30%" },
  { value: "primario_hediondo",         label: "Primário — hediondo/equiparado (sem morte)",       fracao: "40%" },
  { value: "primario_hediondo_morte",   label: "Primário — hediondo com resultado morte",          fracao: "50%" },
  { value: "reincidente_hediondo",      label: "Reincidente em hediondo (sem morte)",               fracao: "60%" },
  { value: "reincidente_hediondo_morte",label: "Reincidente em hediondo com resultado morte",      fracao: "70%" },
  { value: "organizacao_criminosa_lider","label": "Líder de organização criminosa",               fracao: "70%" },
];

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoProgressaoCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoProgressao;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const dataStr = resultado.dataProgressao
    ? resultado.dataProgressao.toLocaleDateString("pt-BR")
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Progressão de Regime</CardTitle>
            <Badge variant="secondary">{resultado.fracaoLabel} da pena</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Métricas principais */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Pena total</p>
              <p className="mt-1 text-sm font-semibold">{formatarPena(resultado.penaTotal)}</p>
              <p className="text-xs text-muted-foreground/70">({resultado.penaTotal.totalDias} dias)</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Fração exigida</p>
              <p className="mt-1 text-sm font-semibold">{resultado.fracaoLabel}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20 col-span-2 sm:col-span-1">
              <p className="text-xs text-muted-foreground">Mínimo para progressão</p>
              <p className="mt-1 text-sm font-bold text-primary">{formatarPena(resultado.penaMinima)}</p>
              <p className="text-xs text-muted-foreground/70">({resultado.diasMinimos} dias)</p>
            </div>
          </div>

          {/* Data de progressão */}
          {dataStr && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
              <p className="text-xs font-medium text-green-800 dark:text-green-300">
                Data-limite para progressão
              </p>
              <p className="mt-1 text-lg font-bold text-green-800 dark:text-green-300">
                {dataStr}
              </p>
            </div>
          )}

          <Separator />

          {/* Memória de cálculo */}
          <div className="space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-xs">
            <div className="flex justify-between">
              <span>Pena total</span>
              <span>{resultado.penaTotal.totalDias} dias</span>
            </div>
            <div className="flex justify-between">
              <span>× Fração ({resultado.fracaoLabel})</span>
              <span>× {(resultado.fracao * 100).toFixed(0)}%</span>
            </div>
            <Separator className="my-1.5" />
            <div className="flex justify-between font-bold">
              <span>= Mínimo exigido</span>
              <span>{resultado.diasMinimos} dias ({formatarPena(resultado.penaMinima)})</span>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>Atenção:</strong> O requisito temporal é necessário mas não suficiente.
              Exige-se também bom comportamento carcerário (mérito) e, para hediondos,
              manifestação do Ministério Público (art. 112 §1 LEP).
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

export function ProgressaoForm() {
  const [resultado, setResultado] = useState<ResultadoProgressao | null>(null);
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
      penaAnos: 0,
      penaMeses: 0,
      penaDias: 0,
      tipo: "primario_sem_violencia",
      dataInicioAtual: "",
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const tipo = watch("tipo");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const totalDias = penaParaDias(data.penaAnos, data.penaMeses, data.penaDias);
      if (totalDias === 0) throw new Error("Informe a pena total.");

      const dataInicio = data.dataInicioAtual
        ? new Date(data.dataInicioAtual + "T00:00:00")
        : null;

      const res = progressaoRegime(totalDias, data.tipo as TipoProgressao, dataInicio);
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
        tipo: "progressao-regime",
        titulo: selectedProcesso
          ? `Progressão — ${selectedProcesso.numero_processo}`
          : `Progressão — ${formatarPena(resultado.penaTotal)} (${resultado.fracaoLabel})`,
        inputs_json: {
          ...watch(),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          penaTotal: resultado.penaTotal,
          fracao: resultado.fracao,
          fracaoLabel: resultado.fracaoLabel,
          diasMinimos: resultado.diasMinimos,
          penaMinima: resultado.penaMinima,
          dataProgressao: resultado.dataProgressao?.toISOString(),
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

  const tipoInfo = TIPOS.find((t) => t.value === tipo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progressão de Regime</CardTitle>
          <CardDescription>
            Tempo mínimo para progressão conforme art. 112 LEP (Lei 13.964/2019 — Pacote Anticrime)
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

            {/* Pena total */}
            <div className="space-y-1.5">
              <Label>Pena total (na sentença)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Input type="number" min={0} placeholder="0" {...register("penaAnos")} />
                  <p className="text-xs text-muted-foreground mt-1">Anos</p>
                </div>
                <div>
                  <Input type="number" min={0} max={11} placeholder="0" {...register("penaMeses")} />
                  <p className="text-xs text-muted-foreground mt-1">Meses</p>
                </div>
                <div>
                  <Input type="number" min={0} max={29} placeholder="0" {...register("penaDias")} />
                  <p className="text-xs text-muted-foreground mt-1">Dias</p>
                </div>
              </div>
            </div>

            {/* Tipo de progressão */}
            <div className="space-y-1.5">
              <Label>Perfil do condenado / crime</Label>
              <Select
                defaultValue="primario_sem_violencia"
                onValueChange={(v) => setValue("tipo", v as TipoProgressao, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} — {t.fracao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoInfo && (
                <p className="text-xs text-muted-foreground">
                  Fração exigida: <strong>{tipoInfo.fracao}</strong> da pena total
                </p>
              )}
              {errors.tipo && (
                <p className="text-xs text-destructive">{errors.tipo.message}</p>
              )}
            </div>

            {/* Data início */}
            <div className="space-y-1.5">
              <Label>Data de início do regime atual (opcional)</Label>
              <DatePicker
                value={watch("dataInicioAtual") ?? ""}
                onChange={(v) => setValue("dataInicioAtual", v, { shouldValidate: true })}
                max={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">
                Se informada, calcula a data exata de habilitação para progressão.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Calcular progressão"}
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
        <ResultadoProgressaoCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
