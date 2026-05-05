import { useCallback, useEffect, useState } from "react";
import { Clock, Download, FileSpreadsheet, RotateCcw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { gerarPdf } from "@/lib/pdf/gerarPdf";
import type { CalculoHistorico } from "@/hooks/useCalculoHistorico";



// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoricoCalculosProps {
  area?: string;
  onRestaurar?: (inputs: Record<string, unknown>) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AREA_LABELS: Record<string, string> = {
  civel: "Cível",
  trabalhista: "Trabalhista",
  penal: "Penal",
  empresarial: "Empresarial",
  tributario: "Tributário",
};

const AREAS = [
  { value: "all", label: "Todas as áreas" },
  { value: "civel", label: "Cível" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "penal", label: "Penal" },
  { value: "empresarial", label: "Empresarial" },
  { value: "tributario", label: "Tributário" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarTotal(resultado: Record<string, unknown>) {
  const raw = resultado?.total ?? resultado?.totalGeral ?? resultado?.liquidoDevido;
  const total = parseFloat(String(raw ?? "0"));
  if (isNaN(total) || total === 0) return "—";
  return total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildShareText(calculo: CalculoHistorico): string {
  const area = AREA_LABELS[calculo.area] ?? calculo.area;
  const titulo = calculo.titulo ?? calculo.tipo;
  const data = formatarData(calculo.created_at);
  const total = formatarTotal(calculo.resultado_json);

  const resultLines = Object.entries(calculo.resultado_json)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 6)
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, " $1").toLowerCase();
      return `• ${label}: ${v}`;
    })
    .join("\n");

  return [
    `Lex — Calculadora Jurídica`,
    `Área: ${area} | ${titulo}`,
    `Data: ${data}`,
    `Total: ${total}`,
    "",
    resultLines,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HistoricoCalculos({ area: areaProp, onRestaurar }: HistoricoCalculosProps) {
  const [calculos, setCalculos] = useState<CalculoHistorico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState(areaProp ?? "all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // PDF dialog state
  const [pdfTarget, setPdfTarget] = useState<CalculoHistorico | null>(null);
  const [pdfNumeroProcesso, setPdfNumeroProcesso] = useState("");
  const [pdfPartes, setPdfPartes] = useState("");
  const [pdfTribunal, setPdfTribunal] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historicoTable = () => supabase.from("calculos_historico" as any);

  const fetchHistorico = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = historicoTable()
        .select("id, user_id, area, tipo, titulo, resultado_json, inputs_json, steps_json, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (areaFilter && areaFilter !== "all") query = query.eq("area", areaFilter);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");

      const { data, error } = await query;
      if (error) throw error;
      setCalculos((data ?? []) as CalculoHistorico[]);
    } catch {
      toast.error("Erro ao carregar histórico de cálculos.");
    } finally {
      setIsLoading(false);
    }
  }, [areaFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchHistorico();
  }, [fetchHistorico]);

  const handleExcluir = async (id: string) => {
    try {
      const { error } = await historicoTable().delete().eq("id", id);
      if (error) throw error;
      setCalculos((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cálculo removido.");
    } catch {
      toast.error("Erro ao excluir cálculo.");
    }
  };

  const handleShare = (calculo: CalculoHistorico) => {
    const text = buildShareText(calculo);
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Resumo copiado para a área de transferência."))
      .catch(() => toast.error("Não foi possível copiar. Tente novamente."));
  };

  const handleOpenPdfDialog = (calculo: CalculoHistorico) => {
    setPdfTarget(calculo);
    setPdfNumeroProcesso(String(calculo.inputs_json.numeroProcesso ?? ""));
    setPdfPartes(String(calculo.inputs_json.clienteProcesso ?? ""));
    setPdfTribunal("");
  };

  const handleDownloadPdf = async () => {
    if (!pdfTarget) return;
    setIsGeneratingPdf(true);
    try {
      await gerarPdf(pdfTarget, {
        numeroProcesso: pdfNumeroProcesso || undefined,
        partes: pdfPartes || undefined,
        tribunal: pdfTribunal || undefined,
      });
      setPdfTarget(null);
    } catch {
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadExcel = async (calculo: CalculoHistorico) => {
    try {
      const { gerarExcel } = await import("@/lib/pdf/gerarExcel");
      gerarExcel(calculo);
    } catch {
      toast.error("Erro ao gerar Excel. Tente novamente.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {!areaProp && (
          <div className="w-44">
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Área" />
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
        )}
        <div className="flex items-center gap-2">
          <DatePicker
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="De"
            className="w-36 text-sm"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <DatePicker
            value={dateTo}
            onChange={setDateTo}
            placeholder="Até"
            className="w-36 text-sm"
          />
        </div>
        {(dateFrom || dateTo || (areaFilter && areaFilter !== "all")) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs"
            onClick={() => { setDateFrom(""); setDateTo(""); if (!areaProp) setAreaFilter("all"); }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : calculos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <Clock className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">Nenhum cálculo salvo ainda</p>
          <p className="text-xs mt-1">Os cálculos aparecem aqui após você salvá-los</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calculos.map((calculo) => (
            <Card key={calculo.id}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {AREA_LABELS[calculo.area] ?? calculo.area}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{calculo.tipo}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium truncate">{calculo.titulo}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatarData(calculo.created_at)}
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {formatarTotal(calculo.resultado_json)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {onRestaurar && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Restaurar inputs"
                        onClick={() => onRestaurar(calculo.inputs_json)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Compartilhar (copiar resumo)"
                      onClick={() => handleShare(calculo)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Baixar Excel"
                      onClick={() => handleDownloadExcel(calculo)}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Baixar PDF"
                      onClick={() => handleOpenPdfDialog(calculo)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Excluir"
                      onClick={() => handleExcluir(calculo.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Options Dialog */}
      <Dialog open={!!pdfTarget} onOpenChange={(open) => { if (!open) setPdfTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Preencha os dados do processo (opcional) para incluir no cabeçalho do PDF.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="pdfProcesso">Número do processo</Label>
              <Input
                id="pdfProcesso"
                placeholder="0000000-00.0000.0.00.0000"
                value={pdfNumeroProcesso}
                onChange={(e) => setPdfNumeroProcesso(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdfPartes">Partes</Label>
              <Input
                id="pdfPartes"
                placeholder="Autor vs. Réu"
                value={pdfPartes}
                onChange={(e) => setPdfPartes(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pdfTribunal">Tribunal / Vara</Label>
              <Input
                id="pdfTribunal"
                placeholder="Ex.: 3ª Vara do Trabalho de São Paulo"
                value={pdfTribunal}
                onChange={(e) => setPdfTribunal(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPdf ? "Gerando…" : "Baixar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
