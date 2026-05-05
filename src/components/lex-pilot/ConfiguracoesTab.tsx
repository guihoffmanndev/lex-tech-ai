import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Upload, X, Building2 } from "lucide-react";
import type { LexOfficeSettings } from "./types";

export default function ConfiguracoesTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome_escritorio: "",
    oab: "",
    endereco: "",
    telefone: "",
    email: "",
    site: "",
    logo_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lex_office_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      const s = data as LexOfficeSettings;
      setSettingsId(s.id);
      setForm({
        nome_escritorio: s.nome_escritorio || "",
        oab: s.oab || "",
        endereco: s.endereco || "",
        telefone: s.telefone || "",
        email: s.email || "",
        site: s.site || "",
        logo_url: s.logo_url || "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG ou JPG)");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("Usuário não autenticado");
      setUploading(false);
      return;
    }
    const path = `${currentUser.id}/logos/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lex-assets").upload(path, file);
    if (error) {
      toast.error("Erro ao enviar logo");
    } else {
      const { data } = supabase.storage.from("lex-assets").getPublicUrl(path);
      set("logo_url", data.publicUrl);
      toast.success("Logo enviado");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };

    if (settingsId) {
      const { error } = await supabase
        .from("lex_office_settings")
        .update(payload)
        .eq("id", settingsId);
      if (error) toast.error("Erro ao salvar configurações");
      else toast.success("Configurações salvas");
    } else {
      const { data, error } = await supabase
        .from("lex_office_settings")
        .insert({ ...payload, user_id: user?.id })
        .select("id")
        .single();
      if (error) toast.error("Erro ao salvar configurações");
      else {
        setSettingsId(data.id);
        toast.success("Configurações salvas");
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Timbre do Escritório
          </CardTitle>
          <CardDescription>
            Essas informações aparecerão no cabeçalho de todos os documentos exportados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div>
            <Label>Logo do escritório</Label>
            <div className="mt-2 flex items-center gap-4">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} alt="Logo" className="h-14 max-w-[200px] object-contain rounded border bg-card p-1" />
                  <button
                    onClick={() => set("logo_url", "")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors text-sm text-muted-foreground">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Enviando..." : "Enviar logo (PNG ou JPG)"}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Recomendado: 300×100px</p>
          </div>

          <div>
            <Label>Nome do escritório</Label>
            <Input className="notion-input mt-1" value={form.nome_escritorio} onChange={(e) => set("nome_escritorio", e.target.value)} />
          </div>

          <div>
            <Label>Número(s) OAB</Label>
            <Input className="notion-input mt-1" value={form.oab} onChange={(e) => set("oab", e.target.value)} placeholder="OAB/SP 123.456" />
          </div>

          <div>
            <Label>Endereço</Label>
            <Input className="notion-input mt-1" value={form.endereco} onChange={(e) => set("endereco", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input className="notion-input mt-1" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" className="notion-input mt-1" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Site</Label>
            <Input className="notion-input mt-1" value={form.site} onChange={(e) => set("site", e.target.value)} placeholder="https://" />
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
