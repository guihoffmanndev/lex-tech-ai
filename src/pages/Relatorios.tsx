import { useState, useRef, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useReportStats, type PeriodFilter } from "@/hooks/useReportStats";
import { FileText, FolderOpen, Clock, CheckCircle, Loader2, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const GAUGE_COLORS = [
  "hsl(var(--primary))",
  "hsl(190, 95%, 45%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 52%, 47%)",
];

const STATUS_COLORS: Record<string, string> = {
  "Em análise": "hsl(38, 92%, 50%)",
  "Revisado": "hsl(142, 71%, 45%)",
  "Arquivado": "hsl(var(--muted-foreground))",
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todo o período" },
];

export default function Relatorios() {
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const { data: stats, isLoading } = useReportStats(period);
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: `relatorio-${period}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(reportRef.current)
        .save();
      toast.success("PDF exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [period]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={20} />
        Carregando relatórios...
      </div>
    );
  }

  if (!stats || stats.totalFiles === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-2">
        <FileText size={40} className="text-muted-foreground" />
        <p className="text-lg font-medium">Nenhum dado disponível ainda</p>
        <p className="text-sm text-muted-foreground">Faça upload de documentos no Vault para ver os relatórios</p>
      </div>
    );
  }

  const emAnalise = stats.byStatus.find(s => s.name === "Em análise")?.value ?? 0;
  const revisados = stats.byStatus.find(s => s.name === "Revisado")?.value ?? 0;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
      {/* Header with filter + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            className="h-9"
          >
            {exporting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      <div ref={reportRef}>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={<FileText size={18} />} label="Total de Documentos" value={stats.totalFiles} />
          <KpiCard icon={<FolderOpen size={18} />} label="Pastas" value={stats.totalFolders} />
          <KpiCard icon={<Clock size={18} />} label="Em Análise" value={emAnalise} />
          <KpiCard icon={<CheckCircle size={18} />} label="Revisados" value={revisados} />
        </div>

        {/* Main row: Gauge + Clients + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Gauge Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-2">Tipos de Documento</h3>
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.byType}
                    cx="50%"
                    cy="85%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {stats.byType.map((_, i) => (
                      <Cell key={i} fill={GAUGE_COLORS[i % GAUGE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 pointer-events-none">
                <span className="text-3xl font-bold">{stats.totalFiles}</span>
                <span className="text-xs text-muted-foreground">Documentos</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {stats.byType.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GAUGE_COLORS[i % GAUGE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium">{item.value}</span>
                    <span className="text-muted-foreground w-10 text-right">
                      {((item.value / stats.totalFiles) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Clients */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3">Top Clientes</h3>
            <div className="space-y-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Cliente</span>
                <div className="flex gap-4">
                  <span className="w-10 text-right">Docs</span>
                  <span className="w-12 text-right">%</span>
                </div>
              </div>
              {stats.topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem dados</p>
              ) : (
                stats.topClients.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
                    <span className="truncate max-w-[140px]">{c.name}</span>
                    <div className="flex gap-4">
                      <span className="w-10 text-right font-medium">{c.count}</span>
                      <span className="w-12 text-right text-muted-foreground">{c.percentage}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-3">Status dos Documentos</h3>
            <div className="space-y-0">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Status</span>
                <div className="flex gap-4">
                  <span className="w-10 text-right">Docs</span>
                  <span className="w-12 text-right">%</span>
                </div>
              </div>
              {stats.byStatus.map((s) => (
                <div key={s.name} className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[s.name] ?? "hsl(var(--muted-foreground))" }}
                    />
                    <span>{s.name}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="w-10 text-right font-medium">{s.value}</span>
                    <span className="w-12 text-right text-muted-foreground">
                      {((s.value / stats.totalFiles) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        {stats.byMonth.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">Documentos por Mês</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byMonth}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {stats.byMonth.map((_, i) => (
                      <Cell key={i} fill={GAUGE_COLORS[i % GAUGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card flex flex-col gap-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
