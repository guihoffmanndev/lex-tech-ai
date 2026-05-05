import { useState, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Pencil, Copy, Trash2, Eye, FileText, Loader2, Upload } from "lucide-react";
import TemplateEditor from "./TemplateEditor";
import DocxVariableMapper from "./DocxVariableMapper";
import type { LexTemplate } from "./types";
import { useRecentes } from "@/hooks/useRecentes";

export default function TemplatesTab() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<LexTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LexTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LexTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const { registrarAcesso } = useRecentes();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lex_templates")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error("Erro ao carregar modelos");
    else setTemplates(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = templates.filter((t) =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.categoria.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Clean up storage if it's a docx template
    if (deleteTarget.docx_file_path) {
      await supabase.storage.from("lex-assets").remove([deleteTarget.docx_file_path]);
    }
    const { error } = await supabase.from("lex_templates").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Erro ao excluir modelo");
    else {
      toast.success("Modelo excluído");
      setTemplates((p) => p.filter((t) => t.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const handleDuplicate = async (t: LexTemplate) => {
    const { error } = await supabase.from("lex_templates").insert({
      nome: `${t.nome} (cópia)`,
      categoria: t.categoria,
      conteudo: t.conteudo,
      user_id: user?.id,
    });
    if (error) toast.error("Erro ao duplicar");
    else {
      toast.success("Modelo duplicado");
      fetchTemplates();
    }
  };

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    fetchTemplates();
  };

  const handleImportDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      // Upload binary to storage
      const path = `${user.id}/templates/${Date.now()}.docx`;
      const { error: uploadError } = await supabase.storage
        .from("lex-assets")
        .upload(path, file);
      if (uploadError) throw uploadError;

      // Create template record
      const nome = file.name.replace(/\.docx$/i, "");
      const { data, error } = await supabase
        .from("lex_templates")
        .insert({
          nome,
          categoria: "Outros",
          conteudo: "",
          docx_file_path: path,
          user_id: user.id,
        })
        .select("*")
        .single();
      if (error) {
        // Cleanup storage on DB error
        await supabase.storage.from("lex-assets").remove([path]);
        throw error;
      }
      toast.success(`Modelo "${nome}" importado com sucesso`);
      fetchTemplates();
      // Open the mapper immediately
      setEditing(data as LexTemplate);
    } catch {
      toast.error("Erro ao importar arquivo .docx");
    }
    e.target.value = "";
  };

  // If editing or creating, show editor full screen
  if (editing || creating) {
    if (editing?.docx_file_path) {
      return (
        <DocxVariableMapper
          template={editing}
          onSaved={handleSaved}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      );
    }
    return (
      <TemplateEditor
        template={editing}
        onSaved={handleSaved}
        onCancel={() => { setEditing(null); setCreating(false); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar modelos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" /> Importar .docx
              <input type="file" accept=".docx" className="hidden" onChange={handleImportDocx} />
            </label>
          </Button>
          <Button onClick={() => setCreating(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Modelo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {search ? "Nenhum modelo encontrado." : "Nenhum modelo cadastrado."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <Card key={t.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-medium text-sm truncate">{t.nome}</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{t.categoria}</Badge>
                  {t.docx_file_path && (
                    <Badge variant="outline" className="text-[10px] shrink-0 border-blue-300 text-blue-600">
                      .docx
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualizado em {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                </p>
                <div className="flex items-center gap-1 pt-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditing(t); registrarAcesso.mutate({ tipo: "documento", item_id: t.id, item_nome: t.nome, item_path: "/lex-pilot" }); }}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  {!t.docx_file_path && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleDuplicate(t)}>
                      <Copy className="h-3 w-3" /> Duplicar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setPreviewHtml(t.conteudo); registrarAcesso.mutate({ tipo: "documento", item_id: t.id, item_nome: t.nome, item_path: "/lex-pilot" }); }}>
                    <Eye className="h-3 w-3" /> Ver
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização</DialogTitle>
            <DialogDescription>Modelo com variáveis não substituídas</DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-4 bg-card"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml || "") }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir modelo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
