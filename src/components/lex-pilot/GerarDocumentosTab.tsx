import { useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ChevronRight, ChevronLeft, Search, Wand2, Download, Eye, FileText,
  Loader2, PackageCheck, Archive, FileDown,
} from "lucide-react";
import { generateDocx, replaceVariables, buildClientDataMap } from "./docxGenerator";
import { applyMappingsToDocx, generateFromDocxTemplate } from "./docxTemplateEngine";
import type { LexClient, LexTemplate, LexOfficeSettings } from "./types";

interface GeneratedDoc {
  clientName: string;
  templateName: string;
  html: string;
  blob: Blob | null;
  filename: string;
}

export default function GerarDocumentosTab() {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<LexClient[]>([]);
  const [templates, setTemplates] = useState<LexTemplate[]>([]);
  const [settings, setSettings] = useState<LexOfficeSettings | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());
  const [searchClients, setSearchClients] = useState("");
  const [searchTemplates, setSearchTemplates] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedDoc[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, tRes, sRes] = await Promise.all([
      supabase.from("lex_clients").select("*").order("nome_completo"),
      supabase.from("lex_templates").select("*").order("nome"),
      supabase.from("lex_office_settings").select("*").limit(1).maybeSingle(),
    ]);
    setClients(cRes.data || []);
    setTemplates(tRes.data || []);
    if (sRes.data) setSettings(sRes.data as LexOfficeSettings);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTemplate = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredClients = clients.filter((c) => {
    const q = searchClients.toLowerCase();
    return c.nome_completo.toLowerCase().includes(q) || (c.cpf || "").includes(q);
  });

  const filteredTemplates = templates.filter((t) =>
    t.nome.toLowerCase().includes(searchTemplates.toLowerCase())
  );

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const selClients = clients.filter((c) => selectedClients.has(c.id));
      const selTemplates = templates.filter((t) => selectedTemplates.has(t.id));
      const docs: GeneratedDoc[] = [];

      for (const template of selTemplates) {
        // If docx-based template, download binary once
        let docxBinary: ArrayBuffer | null = null;
        if (template.docx_file_path) {
          const { data, error } = await supabase.storage
            .from("lex-assets")
            .download(template.docx_file_path);
          if (error || !data) {
            toast.error(`Erro ao baixar template "${template.nome}"`);
            continue;
          }
          docxBinary = await data.arrayBuffer();
        }

        if (docxBinary) {
          // New flow: docxtemplater — apply mappings once outside the client loop
          const withPlaceholders = applyMappingsToDocx(docxBinary, template.variable_mappings || []);
          for (const client of selClients) {
            const filename = `${template.nome} - ${client.nome_completo}.docx`;
            const clientData = buildClientDataMap(client);
            const finalBinary = generateFromDocxTemplate(withPlaceholders, clientData);
            const blob = new Blob([finalBinary], {
              type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });
            docs.push({ clientName: client.nome_completo, templateName: template.nome, html: "", blob, filename });
          }
        } else {
          for (const client of selClients) {
            const filename = `${template.nome} - ${client.nome_completo}.docx`;
            // Legacy flow: TipTap HTML
            const html = replaceVariables(template.conteudo, client);
            const blob = await generateDocx(html, settings);
            docs.push({ clientName: client.nome_completo, templateName: template.nome, html, blob, filename });
          }
        }
      }

      setResults(docs);
      setStep(4);
      toast.success(`${docs.length} documento(s) gerado(s) com sucesso!`);
    } catch {
      toast.error("Erro ao gerar documentos");
    }
    setGenerating(false);
  };

  const downloadDoc = (doc: GeneratedDoc) => {
    if (!doc.blob) return;
    const url = URL.createObjectURL(doc.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async (doc: GeneratedDoc) => {
    const html2pdf = (await import("html2pdf.js")).default;
    const container = document.createElement("div");
    container.innerHTML = DOMPurify.sanitize(doc.html);
    container.style.padding = "40px";
    container.style.fontFamily = "serif";
    container.style.fontSize = "12pt";
    container.style.lineHeight = "1.6";
    document.body.appendChild(container);
    try {
      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: doc.filename.replace(".docx", ".pdf"),
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(container)
        .save();
    } finally {
      document.body.removeChild(container);
    }
  };

  const downloadAll = async () => {
    const JSZip = (await import("jszip")).default;
    const { saveAs } = await import("file-saver");
    const zip = new JSZip();
    results.forEach((doc) => {
      if (doc.blob) zip.file(doc.filename, doc.blob);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "documentos-lex-pilot.zip");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { n: 1, label: "Selecionar Clientes" },
          { n: 2, label: "Selecionar Modelos" },
          { n: 3, label: "Gerar" },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                step >= n
                  ? step === n || (step === 4 && n === 3)
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{n}</span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Select Clients */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={searchClients} onChange={(e) => setSearchClients(e.target.value)} className="pl-9" />
          </div>
          {filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente cadastrado.</p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="hidden md:table-cell">Cidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer ${selectedClients.has(c.id) ? "bg-primary/5" : ""}`}
                      onClick={() => toggleClient(c.id)}
                    >
                      <TableCell>
                        <Checkbox checked={selectedClients.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{c.nome_completo}</TableCell>
                      <TableCell className="font-mono text-xs">{c.cpf}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{c.cidade || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedClients.size} cliente(s) selecionado(s)
            </p>
            <Button onClick={() => setStep(2)} disabled={selectedClients.size === 0} className="gap-1.5">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Templates */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar modelo..." value={searchTemplates} onChange={(e) => setSearchTemplates(e.target.value)} className="pl-9" />
          </div>
          {filteredTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum modelo cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTemplate(t.id)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTemplates.has(t.id) ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox checked={selectedTemplates.has(t.id)} onCheckedChange={() => toggleTemplate(t.id)} className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t.nome}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{t.categoria}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {selectedTemplates.size} modelo(s) selecionado(s)
              </p>
              <Button onClick={() => setStep(3)} disabled={selectedTemplates.size === 0} className="gap-1.5">
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Summary & Generate */}
      {step === 3 && (
        <div className="space-y-6 max-w-lg mx-auto text-center">
          <PackageCheck className="h-12 w-12 text-primary mx-auto" />
          <div>
            <h2 className="text-lg font-semibold">Resumo da geração</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedClients.size} cliente(s) × {selectedTemplates.size} modelo(s) ={" "}
              <strong>{selectedClients.size * selectedTemplates.size} documento(s)</strong>
            </p>
          </div>
          <div className="text-left space-y-3 bg-muted/30 rounded-lg p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Clientes</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {clients.filter((c) => selectedClients.has(c.id)).map((c) => (
                  <Badge key={c.id} variant="secondary" className="text-xs">{c.nome_completo}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Modelos</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {templates.filter((t) => selectedTemplates.has(t.id)).map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-xs">{t.nome}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button onClick={handleGenerate} disabled={generating} className="gap-1.5">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Gerar Documentos
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Documentos gerados ({results.length})</h2>
            {results.length > 1 && (
              <Button variant="outline" onClick={downloadAll} className="gap-1.5">
                <Archive className="h-4 w-4" /> Baixar todos (.zip)
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {results.map((doc, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename.replace(".docx", "")}</p>
                    <p className="text-xs text-muted-foreground">{doc.clientName} · {doc.templateName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.html && (
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setPreviewHtml(doc.html)}>
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => downloadDoc(doc)}>
                    <Download className="h-3.5 w-3.5" /> .docx
                  </Button>
                  {doc.html && (
                    <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => downloadPdf(doc)}>
                      <FileDown className="h-3.5 w-3.5" /> .pdf
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Button variant="outline" onClick={() => { setStep(1); setResults([]); setSelectedClients(new Set()); setSelectedTemplates(new Set()); }}>
              Nova geração
            </Button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização</DialogTitle>
            <DialogDescription>Documento com variáveis substituídas</DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-6 bg-card"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml || "") }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
