import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Upload } from "lucide-react";
import DocxPreviewPanel from "./DocxPreviewPanel";
import VariableMappingPanel from "./VariableMappingPanel";
import type { LexTemplate } from "./types";
import { CATEGORIAS } from "./types";

interface Props {
  template: LexTemplate;
  onSaved: () => void;
  onCancel: () => void;
}

export default function DocxVariableMapper({ template, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const [nome, setNome] = useState(template.nome);
  const [categoria, setCategoria] = useState(template.categoria);
  const [saving, setSaving] = useState(false);
  const [docxData, setDocxData] = useState<ArrayBuffer | null>(null);
  const [loadingDocx, setLoadingDocx] = useState(true);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Array<{ find: string; replace: string }>>(
    template.variable_mappings || []
  );
  const [searchText, setSearchText] = useState("");

  // Load the .docx binary from Supabase Storage
  useEffect(() => {
    if (!template.docx_file_path) return;
    setLoadingDocx(true);
    supabase.storage
      .from("lex-assets")
      .download(template.docx_file_path)
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Erro ao carregar documento .docx");
          return;
        }
        data.arrayBuffer().then((ab) => setDocxData(ab));
      })
      .finally(() => setLoadingDocx(false));
  }, [template.docx_file_path]);

  const handleTextSelected = useCallback((text: string) => {
    setSelectedText(text);
    setSearchText("");
  }, []);

  // When searchText changes and has content, use it as selected text
  useEffect(() => {
    if (searchText.trim()) {
      setSelectedText(searchText.trim());
    }
  }, [searchText]);

  const handleAddMapping = useCallback((mapping: { find: string; replace: string }) => {
    setMappings((prev) => [...prev, mapping]);
  }, []);

  const handleRemoveMapping = useCallback((index: number) => {
    setMappings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedText(null);
    setSearchText("");
  }, []);

  const handleReupload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      // Delete old file from storage
      if (template.docx_file_path) {
        await supabase.storage.from("lex-assets").remove([template.docx_file_path]);
      }

      // Upload new file
      const path = `${user.id}/templates/${Date.now()}.docx`;
      const { error: uploadError } = await supabase.storage
        .from("lex-assets")
        .upload(path, file);
      if (uploadError) throw uploadError;

      // Update template record
      const { error: updateError } = await supabase
        .from("lex_templates")
        .update({
          docx_file_path: path,
          variable_mappings: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id);
      if (updateError) throw updateError;

      // Reload
      const ab = await file.arrayBuffer();
      setDocxData(ab);
      setMappings([]);
      toast.success("Documento reenviado com sucesso");
    } catch {
      toast.error("Erro ao reenviar documento");
    }
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome do documento é obrigatório");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("lex_templates")
      .update({
        nome,
        categoria,
        variable_mappings: mappings.length > 0 ? mappings : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id);

    if (error) {
      toast.error("Erro ao salvar modelo");
    } else {
      toast.success("Modelo salvo");
      onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onCancel} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" asChild>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4" /> Reenviar .docx
              <input type="file" accept=".docx" className="hidden" onChange={handleReupload} />
            </label>
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Name & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome do documento</Label>
          <Input className="notion-input mt-1" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview + Mapping panels */}
      {loadingDocx ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <DocxPreviewPanel
            docxData={docxData}
            onTextSelected={handleTextSelected}
            mappings={mappings}
          />
          <VariableMappingPanel
            selectedText={selectedText}
            mappings={mappings}
            onAddMapping={handleAddMapping}
            onRemoveMapping={handleRemoveMapping}
            onClearSelection={handleClearSelection}
            searchText={searchText}
            onSearchTextChange={setSearchText}
          />
        </div>
      )}
    </div>
  );
}
