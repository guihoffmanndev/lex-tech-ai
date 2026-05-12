import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, Loader2 } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string;
  oab_number: string;
  firm_name: string;
  avatar_url: string | null;
}

export default function Perfil() {
  const { user, supabaseUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ProfileData>({
    full_name: "",
    email: "",
    oab_number: "",
    firm_name: "",
    avatar_url: null,
  });

  const { isLoading: loading, data: profileData } = useQuery({
    queryKey: ["profile", supabaseUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, oab_number, firm_name, avatar_url")
        .eq("id", supabaseUser!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!supabaseUser,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!profileData) return;
    setForm({
      full_name: profileData.full_name || "",
      email: profileData.email || "",
      oab_number: profileData.oab_number || "",
      firm_name: profileData.firm_name || "",
      avatar_url: profileData.avatar_url,
    });
  }, [profileData]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabaseUser) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${supabaseUser.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
      setForm((prev) => ({ ...prev, avatar_url }));

      await supabase
        .from("profiles")
        .update({ avatar_url })
        .eq("id", supabaseUser.id);

      toast.success("Avatar atualizado");
    } catch (err: unknown) {
      toast.error("Erro ao enviar avatar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!supabaseUser) return;
    if (!form.full_name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          oab_number: form.oab_number.trim() || null,
          firm_name: form.firm_name.trim() || null,
        })
        .eq("id", supabaseUser.id);
      if (error) throw error;

      // Also update auth metadata so sidebar reflects changes
      await supabase.auth.updateUser({
        data: { name: form.full_name.trim(), full_name: form.full_name.trim() },
      });

      toast.success("Perfil salvo com sucesso");
    } catch (err: unknown) {
      toast.error("Erro ao salvar: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie suas informações pessoais e profissionais
        </p>
      </div>

      <Card className="p-6">
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative group">
            <Avatar className="h-20 w-20 text-lg">
              <AvatarImage src={form.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {user?.iniciais ?? "?"}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="font-semibold text-lg">{form.full_name || "Seu nome"}</p>
            <p className="text-sm text-muted-foreground">{form.email}</p>
          </div>
        </div>

        {/* Form */}
        <div className="grid gap-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                value={form.email}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oab_number">Número da OAB</Label>
              <Input
                id="oab_number"
                value={form.oab_number}
                onChange={(e) => setForm((p) => ({ ...p, oab_number: e.target.value }))}
                placeholder="Ex: 123.456/SP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firm_name">Nome do escritório</Label>
              <Input
                id="firm_name"
                value={form.firm_name}
                onChange={(e) => setForm((p) => ({ ...p, firm_name: e.target.value }))}
                placeholder="Nome do escritório"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar alterações
          </Button>
        </div>
      </Card>
    </div>
  );
}
