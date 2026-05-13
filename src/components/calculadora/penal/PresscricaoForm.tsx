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
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";

import {
  prescricao,
  formatarPena,
  penaParaDias,
  type ResultadoPrescricao,
} from "@/lib/calculators/penal";
import { ProcessoSelector, type ProcessoInfo } from "@/components/calculadora/shared/ProcessoSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  penaAnos: z.coerce.number().int().min(0),
  penaMeses: z.coerce.number().int().min(0).max(11),
  dataReferencia: z.string().min(1, "Informe a data de referência"),
  reducaoMenor21: z.boolean(),
  reducaoMaior70: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

// ─── Result Display ───────────────────────────────────────────────────────────

function ResultadoPrescricaoCard({
  resultado,
  onSalvar,
  isSaving,
}: {
  resultado: ResultadoPrescricao;
  onSalvar: () => void;
  isSaving: boolean;
}) {
  const dataPrescrStr = resultado.dataPrescricao
    ? resultado.dataPrescricao.toLocaleDateString("pt-BR")
    : "—";

  const diasRestantesLabel = resultado.prescreveu
    ? "Prescrito"
    : resultado.diasParaPrescricao !== null
    ? `${resultado.diasParaPrescricao} dias restantes`
    : "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Prescrição</CardTitle>
            <Badge variant={resultado.prescreveu ? "destructive" : "default"}>
              {resultado.prescreveu ? "PRESCRITO" : "Em curso"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Métricas */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Prazo legal</p>
              <p className="mt-1 text-sm font-semibold">{resultado.prazoAnos} anos</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                Prazo efetivo{resultado.reducaoAplicada ? " (reduzido)" : ""}
              </p>
              <p className="mt-1 text-sm font-semibold">{resultado.prazoEfetivo} anos</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Data de prescrição</p>
              <p className="mt-1 text-sm font-semibold">{dataPrescrStr}</p>
            </div>
            <div className={`rounded-lg p-3 ring-1 ${resultado.prescreveu ? "bg-destructive/10 ring-destructive/20" : "bg-primary/10 ring-primary/20"}`}>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`mt-1 text-sm font-bold ${resultado.prescreveu ? "text-destructive" : "text-primary"}`}>
                {diasRestantesLabel}
              </p>
            </div>
          </div>

          {/* Detalhes */}
          <Separator />
          <div className="space-y-1 rounded-lg bg-muted/30 p-3 font-mono text-xs">
            <div className="flex justify-between">
              <span>Prazo tabela art. 109 CP</span>
              <span>{resultado.prazoAnos} anos</span>
            </div>
            {resultado.reducaoAplicada && (
              <div className="flex justify-between text-amber-600">
                <span>Redução pela metade (art. 115 CP)</span>
                <span>÷ 2 = {resultado.prazoEfetivo} anos</span>
              </div>
            )}
            <Separator className="my-1.5" />
            <div className="flex justify-between font-bold">
              <span>Prazo efetivo</span>
              <span>{resultado.prazoEfetivo} anos</span>
            </div>
            <div className="flex justify-between">
              <span>Data de prescrição</span>
              <span>{dataPrescrStr}</span>
            </div>
          </div>

          {resultado.prescreveu ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-xs font-medium text-destructive">
                A pretensão punitiva ou executória encontra-se prescrita. Verifique os marcos
                interruptivos e o tipo de prescrição aplicável ao caso concreto.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-xs text-foreground">
                <strong>Atenção:</strong> Esta calculadora apura o prazo prescricional base.
                Verifique os marcos interruptivos (art. 117 CP): recebimento da denúncia,
                pronúncia, decisão confirmatória, sentença condenatória recorrível.
              </p>
            </div>
          )}

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

export function PresscricaoForm() {
  const [resultado, setResultado] = useState<ResultadoPrescricao | null>(null);
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
      dataReferencia: "",
      reducaoMenor21: false,
      reducaoMaior70: false,
    },
  });

  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoInfo | null>(null);

  const reducaoMenor21 = watch("reducaoMenor21");
  const reducaoMaior70 = watch("reducaoMaior70");

  const onSubmit = (data: FormValues) => {
    setIsCalculating(true);
    setResultado(null);
    try {
      const penaDias = penaParaDias(data.penaAnos, data.penaMeses);
      if (penaDias === 0) throw new Error("Informe a pena.");

      const dataRef = new Date(data.dataReferencia + "T00:00:00");
      const reducao = data.reducaoMenor21 || data.reducaoMaior70;

      const res = prescricao(penaDias, dataRef, reducao);
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
        tipo: "prescricao",
        titulo: selectedProcesso
          ? `Prescrição — ${selectedProcesso.numero_processo}`
          : `Prescrição — ${resultado.prazoEfetivo} anos — ${resultado.prescreveu ? "PRESCRITO" : "Em curso"}`,
        inputs_json: {
          ...watch(),
          ...(selectedProcesso && {
            numeroProcesso: selectedProcesso.numero_processo,
            clienteProcesso: selectedProcesso.cliente,
          }),
        },
        resultado_json: {
          prazoAnos: resultado.prazoAnos,
          prazoEfetivo: resultado.prazoEfetivo,
          reducaoAplicada: resultado.reducaoAplicada,
          prescreveu: resultado.prescreveu,
          diasParaPrescricao: resultado.diasParaPrescricao,
          dataPrescricao: resultado.dataPrescricao?.toISOString(),
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
          <CardTitle className="text-base">Prescrição Penal</CardTitle>
          <CardDescription>
            Prazo prescricional conforme tabela do art. 109 CP, com redução pela metade (art. 115 CP) quando aplicável
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

            {/* Pena */}
            <div className="space-y-1.5">
              <Label>Pena (máxima abstrata para PPP; pena aplicada para retroativa)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input type="number" min={0} placeholder="0" {...register("penaAnos")} />
                  <p className="text-xs text-muted-foreground mt-1">Anos</p>
                </div>
                <div>
                  <Input type="number" min={0} max={11} placeholder="0" {...register("penaMeses")} />
                  <p className="text-xs text-muted-foreground mt-1">Meses</p>
                </div>
              </div>
            </div>

            {/* Data de referência */}
            <div className="space-y-1.5">
              <Label>Data de referência</Label>
              <DatePicker
                value={watch("dataReferencia") ?? ""}
                onChange={(v) => setValue("dataReferencia", v, { shouldValidate: true })}
              />
              <p className="text-xs text-muted-foreground">
                PPP: data do fato · Retroativa: data da sentença · Executória: data do trânsito em julgado
              </p>
              {errors.dataReferencia && (
                <p className="text-xs text-destructive">{errors.dataReferencia.message}</p>
              )}
            </div>

            <Separator />

            {/* Redução pela metade */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Redução pela metade — art. 115 CP</p>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Réu menor de 21 anos na data do fato</p>
                  <p className="text-xs text-muted-foreground">art. 115 c/c art. 65, I CP</p>
                </div>
                <Switch
                  checked={reducaoMenor21}
                  onCheckedChange={(v) => setValue("reducaoMenor21", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Réu maior de 70 anos na data da sentença</p>
                  <p className="text-xs text-muted-foreground">art. 115 CP (Súmula 191 STJ)</p>
                </div>
                <Switch
                  checked={reducaoMaior70}
                  onCheckedChange={(v) => setValue("reducaoMaior70", v)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong>Tabela art. 109 CP:</strong> pena &gt; 12 anos → 20 anos; &gt; 8 anos → 16 anos;
              &gt; 4 anos → 12 anos; &gt; 2 anos → 8 anos; &gt; 1 ano → 4 anos; ≤ 1 ano → 3 anos.
            </div>

            <Button type="submit" className="w-full" disabled={isCalculating}>
              {isCalculating ? "Calculando…" : "Verificar prescrição"}
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
        <ResultadoPrescricaoCard
          resultado={resultado}
          onSalvar={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
