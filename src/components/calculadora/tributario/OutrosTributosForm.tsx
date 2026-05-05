import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Decimal from "decimal.js";
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
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

import {
  itbi,
  itcmd,
  tributosEmAtraso,
  inssPatronal,
  type ResultadoItbi,
  type ResultadoItcmd,
  type ResultadoTributosAtraso,
  type ResultadoInssPatronal,
} from "@/lib/calculators/tributario";
import { formatBRL } from "@/lib/calculators/engine";
import { LinhaResultado } from "@/components/calculadora/shared/LinhaResultado";

type SubTab = "itbi" | "itcmd" | "atraso" | "inss";

// ─── ITBI ─────────────────────────────────────────────────────────────────────

const schemaItbi = z.object({
  valorVenal: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor venal"),
  valorTransacao: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor da transação"),
  aliquota: z.coerce.number().min(0.5).max(5, "Alíquota inválida"),
});
type FormItbi = z.infer<typeof schemaItbi>;

function ItbiForm() {
  const [resultado, setResultado] = useState<ResultadoItbi | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormItbi>({
    resolver: zodResolver(schemaItbi),
    defaultValues: { valorVenal: "0", valorTransacao: "0", aliquota: 2 },
  });

  const valorVenalField = watch("valorVenal");
  const valorTransacaoField = watch("valorTransacao");

  const onSubmit = (data: FormItbi) => {
    try {
      const res = itbi(
        new Decimal(data.valorVenal),
        new Decimal(data.valorTransacao),
        new Decimal(data.aliquota)
      );
      setResultado(res);
    } catch { toast.error("Erro ao calcular."); }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "itbi",
        titulo: `ITBI ${watch("aliquota")}% — ${formatBRL(resultado.itbi)}`,
        inputs_json: { valorVenal: valorVenalField, valorTransacao: valorTransacaoField, aliquota: watch("aliquota") },
        resultado_json: { itbi: resultado.itbi.toString(), baseCalculo: resultado.baseCalculo.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Valor venal do imóvel (IPTU)</Label>
          <CurrencyInput value={valorVenalField} onChange={(v) => setValue("valorVenal", v, { shouldValidate: true })} />
          {errors.valorVenal && <p className="text-xs text-destructive">{errors.valorVenal.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Valor de transação / escritura</Label>
          <CurrencyInput value={valorTransacaoField} onChange={(v) => setValue("valorTransacao", v, { shouldValidate: true })} />
          {errors.valorTransacao && <p className="text-xs text-destructive">{errors.valorTransacao.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Alíquota municipal (%)</Label>
          <Input type="number" step={0.1} min={0.5} max={5} placeholder="Ex: 2" {...register("aliquota")} />
          {errors.aliquota && <p className="text-xs text-destructive">{errors.aliquota.message}</p>}
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
          Base = maior valor entre venal e transação (Tema 1.113 STJ).
        </div>
        <Button type="submit" className="w-full">Calcular ITBI</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label="Valor venal" valor={formatBRL(resultado.valorVenal)} />
            <LinhaResultado label="Valor transação" valor={formatBRL(resultado.valorTransacao)} />
            <LinhaResultado label="Base de cálculo (maior)" valor={formatBRL(resultado.baseCalculo)} />
            <LinhaResultado label={`ITBI (${resultado.aliquota.toString()}%)`} valor={formatBRL(resultado.itbi)} destaque />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── ITCMD ────────────────────────────────────────────────────────────────────

const schemaItcmd = z.object({
  valorBem: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor do bem"),
  estado: z.string().min(2).max(2),
  tipo: z.enum(["doacao", "heranca"] as const),
});
type FormItcmd = z.infer<typeof schemaItcmd>;

const ESTADOS_BR = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function ItcmdForm() {
  const [resultado, setResultado] = useState<ResultadoItcmd | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormItcmd>({
    resolver: zodResolver(schemaItcmd),
    defaultValues: { valorBem: "0", estado: "SP", tipo: "doacao" },
  });

  const valorField = watch("valorBem");
  const estado = watch("estado");
  const tipo = watch("tipo");

  const onSubmit = (data: FormItcmd) => {
    try {
      const res = itcmd(new Decimal(data.valorBem), data.estado, data.tipo);
      setResultado(res);
    } catch { toast.error("Erro ao calcular."); }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "itcmd",
        titulo: `ITCMD ${estado} (${tipo}) — ${formatBRL(resultado.itcmd)}`,
        inputs_json: { valorBem: valorField, estado, tipo },
        resultado_json: { itcmd: resultado.itcmd.toString(), aliquota: resultado.aliquota.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Valor do bem transmitido</Label>
          <CurrencyInput value={valorField} onChange={(v) => setValue("valorBem", v, { shouldValidate: true })} />
          {errors.valorBem && <p className="text-xs text-destructive">{errors.valorBem.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              defaultValue={estado}
              onValueChange={(v) => setValue("estado", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_BR.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-1">
              {([
                { value: "doacao", label: "Doação" },
                { value: "heranca", label: "Herança" },
              ] as const).map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={tipo === value ? "default" : "outline"}
                  className="flex-1 text-xs"
                  onClick={() => setValue("tipo", value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button type="submit" className="w-full">Calcular ITCMD</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label="Valor do bem" valor={formatBRL(resultado.valorBem)} />
            <LinhaResultado label={`Alíquota ${resultado.estado} (${resultado.tipo})`} valor={`${resultado.aliquota.toString()}%`} />
            <LinhaResultado label="ITCMD" valor={formatBRL(resultado.itcmd)} destaque />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Tributos em Atraso ───────────────────────────────────────────────────────

const schemaAtraso = z.object({
  tributo: z.string().min(1, "Informe o tributo"),
  valorOriginal: z.string().refine((v) => parseFloat(v) > 0, "Informe o valor"),
  diasAtraso: z.coerce.number().int().min(1, "Mínimo 1 dia"),
  selicAcumuladaPct: z.coerce.number().min(0, "Informe a SELIC acumulada"),
});
type FormAtraso = z.infer<typeof schemaAtraso>;

function AtrasoForm() {
  const [resultado, setResultado] = useState<ResultadoTributosAtraso | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormAtraso>({
    resolver: zodResolver(schemaAtraso),
    defaultValues: { tributo: "IRPJ", valorOriginal: "0", diasAtraso: 30, selicAcumuladaPct: 1.2 },
  });

  const valorField = watch("valorOriginal");

  const onSubmit = (data: FormAtraso) => {
    try {
      const res = tributosEmAtraso(
        data.tributo,
        new Decimal(data.valorOriginal),
        data.diasAtraso,
        new Decimal(data.selicAcumuladaPct)
      );
      setResultado(res);
    } catch { toast.error("Erro ao calcular."); }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "tributo-atraso",
        titulo: `${resultado.tributo} em atraso ${resultado.diasAtraso}d — ${formatBRL(resultado.totalPagar)}`,
        inputs_json: { tributo: resultado.tributo, valorOriginal: valorField, diasAtraso: resultado.diasAtraso },
        resultado_json: { totalAcrescimos: resultado.totalAcrescimos.toString(), totalPagar: resultado.totalPagar.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tributo</Label>
            <Input placeholder="Ex: IRPJ, CSLL, DARF..." {...register("tributo")} />
            {errors.tributo && <p className="text-xs text-destructive">{errors.tributo.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Dias em atraso</Label>
            <Input type="number" min={1} placeholder="Ex: 30" {...register("diasAtraso")} />
            {errors.diasAtraso && <p className="text-xs text-destructive">{errors.diasAtraso.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Valor original do tributo</Label>
          <CurrencyInput value={valorField} onChange={(v) => setValue("valorOriginal", v, { shouldValidate: true })} />
          {errors.valorOriginal && <p className="text-xs text-destructive">{errors.valorOriginal.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>SELIC acumulada no período (%)</Label>
          <Input type="number" step={0.01} min={0} placeholder="Ex: 1.2" {...register("selicAcumuladaPct")} />
          <p className="text-xs text-muted-foreground">Informe a taxa SELIC acumulada desde o mês seguinte ao vencimento.</p>
        </div>
        <Button type="submit" className="w-full">Calcular acréscimos</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label="Valor original" valor={formatBRL(resultado.valorOriginal)} />
            <LinhaResultado label={`Multa de mora (0,33%/dia × ${resultado.diasAtraso}d, cap 20%)`} valor={formatBRL(resultado.multaMora)} />
            <LinhaResultado label="SELIC acumulada" valor={formatBRL(resultado.selic)} />
            <LinhaResultado label="Multa mês de pagamento (1%)" valor={formatBRL(resultado.multoMesCalculo)} />
            <LinhaResultado label="Total acréscimos" valor={formatBRL(resultado.totalAcrescimos)} />
            <LinhaResultado label="Total a pagar" valor={formatBRL(resultado.totalPagar)} destaque />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── INSS Patronal ────────────────────────────────────────────────────────────

const schemaInss = z.object({
  folhaBruta: z.string().refine((v) => parseFloat(v) > 0, "Informe a folha"),
  rat: z.coerce.number().min(0.1).max(6, "RAT×FAP inválido"),
  terceiros: z.coerce.number().min(0).max(10),
});
type FormInss = z.infer<typeof schemaInss>;

function InssPatronalForm() {
  const [resultado, setResultado] = useState<ResultadoInssPatronal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, setValue, watch, register, formState: { errors } } = useForm<FormInss>({
    resolver: zodResolver(schemaInss),
    defaultValues: { folhaBruta: "0", rat: 2, terceiros: 5.8 },
  });

  const folhaField = watch("folhaBruta");

  const onSubmit = (data: FormInss) => {
    try {
      const res = inssPatronal(
        new Decimal(data.folhaBruta),
        new Decimal(data.rat),
        new Decimal(data.terceiros)
      );
      setResultado(res);
    } catch { toast.error("Erro ao calcular."); }
  };

  const handleSalvar = async () => {
    if (!resultado) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      await supabase.from("calculos_historico").insert({
        user_id: user.id,
        area: "tributario",
        tipo: "inss-patronal",
        titulo: `INSS Patronal — ${formatBRL(resultado.totalPatronal)}`,
        inputs_json: { folhaBruta: folhaField, rat: watch("rat"), terceiros: watch("terceiros") },
        resultado_json: { totalPatronal: resultado.totalPatronal.toString() },
        steps_json: [],
      });
      toast.success("Salvo no histórico!");
    } catch { toast.error("Erro ao salvar."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Folha salarial bruta</Label>
          <CurrencyInput value={folhaField} onChange={(v) => setValue("folhaBruta", v, { shouldValidate: true })} />
          {errors.folhaBruta && <p className="text-xs text-destructive">{errors.folhaBruta.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>RAT × FAP (%)</Label>
            <Input type="number" step={0.01} min={0.1} max={6} placeholder="Ex: 2" {...register("rat")} />
            <p className="text-xs text-muted-foreground">RAT bruto (1, 2 ou 3%) × FAP (0,5 a 2,0)</p>
            {errors.rat && <p className="text-xs text-destructive">{errors.rat.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Sistema S / Terceiros (%)</Label>
            <Input type="number" step={0.1} min={0} max={10} placeholder="Ex: 5.8" {...register("terceiros")} />
            <p className="text-xs text-muted-foreground">Varia por atividade CNAE</p>
          </div>
        </div>
        <Button type="submit" className="w-full">Calcular contribuição patronal</Button>
      </form>

      {resultado && (
        <Card>
          <CardContent className="pt-4 space-y-1 divide-y">
            <LinhaResultado label="Folha bruta" valor={formatBRL(resultado.folhaBruta)} />
            <LinhaResultado label="Contribuição patronal 20%" valor={formatBRL(resultado.inss20pct)} />
            <LinhaResultado label={`RAT×FAP (${resultado.rat.toString()}%)`} valor={formatBRL(resultado.ratTotal)} />
            <LinhaResultado label={`Sistema S / Terceiros (${resultado.terceiros.toString()}%)`} valor={formatBRL(resultado.terceirosTotal)} />
            <LinhaResultado label="Total patronal" valor={formatBRL(resultado.totalPatronal)} destaque />
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">{resultado.legislacao}</p>
            </div>
          </CardContent>
          <div className="px-6 pb-4">
            <Button variant="outline" size="sm" className="w-full" onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? "Salvando…" : "Salvar no histórico"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────

export function OutrosTributosForm() {
  const [subTab, setSubTab] = useState<SubTab>("itbi");

  const TABS: { id: SubTab; label: string }[] = [
    { id: "itbi", label: "ITBI" },
    { id: "itcmd", label: "ITCMD" },
    { id: "atraso", label: "Tributos em Atraso" },
    { id: "inss", label: "INSS Patronal" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outros Tributos</CardTitle>
          <CardDescription>ITBI, ITCMD, acréscimos por atraso e contribuição previdenciária patronal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1 mb-5">
            {TABS.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={subTab === t.id ? "default" : "outline"}
                className="text-xs"
                onClick={() => setSubTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {subTab === "itbi" && <ItbiForm />}
          {subTab === "itcmd" && <ItcmdForm />}
          {subTab === "atraso" && <AtrasoForm />}
          {subTab === "inss" && <InssPatronalForm />}
        </CardContent>
      </Card>
    </div>
  );
}
