import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, X, Plus, ChevronDown, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { LexClient } from "./types";
import { UFS } from "./types";
import { formatCnpj, formatCpfInput, formatPhone } from "@/lib/formatters";
import { formatCNJ } from "@/lib/formatCNJ";

const UFS_FULL: { sigla: string; nome: string }[] = [
  { sigla: "AC", nome: "Acre" }, { sigla: "AL", nome: "Alagoas" }, { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" }, { sigla: "BA", nome: "Bahia" }, { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" }, { sigla: "ES", nome: "Espírito Santo" }, { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" }, { sigla: "MT", nome: "Mato Grosso" }, { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" }, { sigla: "PA", nome: "Pará" }, { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" }, { sigla: "PE", nome: "Pernambuco" }, { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" }, { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" }, { sigla: "RO", nome: "Rondônia" }, { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" }, { sigla: "SP", nome: "São Paulo" }, { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

// ── Process type for local state ──

interface LocalProcess {
  id: string;
  numero_processo: string;
  descricao: string;
  area: string;
  status: string;
}

export default function ClienteForm({ client, onSaved, onCancel }: Props) {
  const isEdit = !!client;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [createVaultFolder, setCreateVaultFolder] = useState(true);
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">(client?.tipo_pessoa || "pf");
  const initDob = client?.data_nascimento ? client.data_nascimento.split("-") : [];
  const [dobYear, setDobYear] = useState(initDob[0] || "");
  const [dobMonth, setDobMonth] = useState(initDob[1] || "");
  const [dobDay, setDobDay] = useState(initDob[2] || "");
  const [form, setForm] = useState({
    nome_completo: client?.nome_completo || "",
    cpf: client?.cpf || "",
    cnpj: client?.cnpj || "",
    razao_social: client?.razao_social || "",
    rg: client?.rg || "",
    rg_emissor: client?.rg_emissor || "",
    rg_uf: client?.rg_uf || "",
    data_nascimento: client?.data_nascimento || "",
    estado_civil: client?.estado_civil || "",
    profissao: client?.profissao || "",
    nacionalidade: client?.nacionalidade || "Brasileiro(a)",
    email: client?.email || "",
    telefone: client?.telefone || "",
    cep: client?.cep || "",
    rua: client?.rua || "",
    numero: client?.numero || "",
    complemento: client?.complemento || "",
    bairro: client?.bairro || "",
    cidade: client?.cidade || "",
    estado: client?.estado || "",
    observacoes: client?.observacoes || "",
    status: client?.status || "Ativo",
  });

  // Processos locais (Dados Processuais tab)
  const [processos, setProcessos] = useState<LocalProcess[]>([]);
  const [originalProcessIds, setOriginalProcessIds] = useState<Set<string>>(new Set());
  const [showProcessForm, setShowProcessForm] = useState(false);
  const [newProcesso, setNewProcesso] = useState({ numero_processo: "", descricao: "", area: "Cível", status: "Ativo" });

  // Load existing legal_cases when editing
  useEffect(() => {
    if (!isEdit || !client?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from("legal_cases")
        .select("*")
        .eq("client_id", client.id);
      if (data && data.length > 0) {
        const mapped: LocalProcess[] = data.map((c) => ({
          id: c.id,
          numero_processo: c.numero_processo,
          descricao: c.descricao || "",
          area: c.area,
          status: c.status === "ativa" ? "Ativo" : c.status === "encerrada" ? "Encerrado" : "Suspenso",
        }));
        setProcessos(mapped);
        setOriginalProcessIds(new Set(mapped.map((p) => p.id)));
      }
    };
    load();
  }, [isEdit, client?.id]);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));
  const isPJ = tipoPessoa === "pj";

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((p) => ({
          ...p,
          rua: data.logradouro || p.rua,
          bairro: data.bairro || p.bairro,
          cidade: data.localidade || p.cidade,
          estado: data.uf || p.estado,
          complemento: data.complemento || p.complemento,
        }));
      }
    } catch {
      // ignore
    }
    setLoadingCep(false);
  };

  const addProcesso = () => {
    if (!newProcesso.numero_processo.trim()) {
      toast.error("Número do processo é obrigatório");
      return;
    }
    setProcessos((prev) => [...prev, { ...newProcesso, id: crypto.randomUUID() }]);
    setNewProcesso({ numero_processo: "", descricao: "", area: "Cível", status: "Ativo" });
    setShowProcessForm(false);
  };

  const removeProcesso = (id: string) => setProcessos((prev) => prev.filter((p) => p.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome_completo.trim()) {
      toast.error("Nome completo é obrigatório");
      return;
    }

    // Validate doc format
    if (isPJ) {
      const cnpjDigits = form.cnpj.replace(/\D/g, "");
      if (cnpjDigits && cnpjDigits.length !== 14) {
        toast.error("CNPJ deve ter 14 dígitos");
        return;
      }
    } else {
      const cpfDigits = form.cpf.replace(/\D/g, "");
      if (cpfDigits && cpfDigits.length !== 11) {
        toast.error("CPF deve ter 11 dígitos");
        return;
      }
    }

    setSaving(true);
    const payload = {
      nome_completo: form.nome_completo,
      tipo_pessoa: tipoPessoa,
      cpf: isPJ ? null : form.cpf.replace(/\D/g, "") || null,
      cnpj: isPJ ? form.cnpj.replace(/\D/g, "") || null : null,
      razao_social: isPJ ? form.razao_social : null,
      email: form.email || null,
      telefone: form.telefone.replace(/\D/g, "") || null,
      cep: form.cep || null,
      rua: form.rua || null,
      numero: form.numero || null,
      complemento: form.complemento || null,
      bairro: form.bairro || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      observacoes: form.observacoes || null,
      status: form.status,
      rg: form.rg || null,
      rg_emissor: form.rg_emissor || null,
      rg_uf: form.rg_uf || null,
      data_nascimento: form.data_nascimento || null,
      estado_civil: form.estado_civil || null,
      profissao: form.profissao || null,
      nacionalidade: form.nacionalidade || null,
      updated_at: new Date().toISOString(),
    };

    if (isEdit) {
      const { error } = await supabase
        .from("lex_clients")
        .update(payload)
        .eq("id", client!.id);
      if (error) {
        toast.error("Erro ao atualizar cliente");
      } else {
        // Sync legal_cases: delete removed, insert new
        const currentIds = new Set(processos.map((p) => p.id));
        const toDelete = [...originalProcessIds].filter((id) => !currentIds.has(id));
        const toInsert = processos.filter((p) => !originalProcessIds.has(p.id));

        for (const id of toDelete) {
          await supabase.from("legal_cases").delete().eq("id", id);
        }
        for (const p of toInsert) {
          await supabase.from("legal_cases").insert({
            numero_processo: p.numero_processo,
            descricao: p.descricao || null,
            area: p.area,
            status: p.status === "Ativo" ? "ativa" : p.status === "Encerrado" ? "encerrada" : "suspensa",
            client_id: client!.id,
            cliente: form.nome_completo,
            user_id: user!.id,
          });
        }

        toast.success("Cliente atualizado");
        onSaved();
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("lex_clients")
        .insert({ ...payload, user_id: user?.id })
        .select("id")
        .single();
      if (error) {
        const msg = error.code === "42501" || error.message?.includes("row-level security")
          ? "Seu plano não permite cadastrar clientes. Faça upgrade para Plus+ ou superior."
          : "Erro ao cadastrar cliente";
        toast.error(msg);
      } else {
        const clientId = inserted?.id;

        // Create legal cases from processos
        if (processos.length > 0 && clientId) {
          for (const p of processos) {
            await supabase.from("legal_cases").insert({
              numero_processo: p.numero_processo,
              descricao: p.descricao || null,
              area: p.area,
              status: p.status === "Ativo" ? "ativa" : "encerrada",
              client_id: clientId,
              cliente: form.nome_completo,
              user_id: user!.id,
            });
          }
        }

        if (createVaultFolder && form.nome_completo.trim()) {
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) throw new Error("Usuário não autenticado");
            const { error: folderError } = await supabase
              .from("vault_folders")
              .insert({ name: form.nome_completo.trim(), user_id: currentUser.id });
            if (folderError) throw folderError;
            queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
            toast.success("Cliente cadastrado e pasta criada no Vault");
          } catch {
            toast.warning("Cliente cadastrado. Não foi possível criar a pasta no Vault — tente novamente");
          }
        } else {
          toast.success("Cliente cadastrado");
        }
        onSaved();
      }
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">{isEdit ? "Editar Cliente" : "Novo Cliente"}</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dados-pessoais" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="dados-pessoais" className="flex-1">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="dados-processuais" className="flex-1">Dados Processuais</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Dados Pessoais ── */}
        <TabsContent value="dados-pessoais" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
          <div className="space-y-4">
            {/* Nome completo — full width */}
            <div>
              <Label>Nome completo *</Label>
              <Input className="mt-1" value={form.nome_completo} onChange={(e) => set("nome_completo", e.target.value)} />
            </div>

            {/* Tipo de pessoa — segmented toggle */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de pessoa</Label>
                <div className="flex mt-1 rounded-md border border-input overflow-hidden">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${!isPJ ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                    onClick={() => setTipoPessoa("pf")}
                  >
                    PF
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-sm font-medium transition-colors border-l border-input ${isPJ ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-accent"}`}
                    onClick={() => setTipoPessoa("pj")}
                  >
                    PJ
                  </button>
                </div>
              </div>

              {/* CPF / CNPJ */}
              <div>
                <Label>{isPJ ? "CNPJ" : "CPF"}</Label>
                {isPJ ? (
                  <Input
                    className="mt-1"
                    value={formatCnpj(form.cnpj)}
                    onChange={(e) => set("cnpj", e.target.value.replace(/\D/g, "").slice(0, 14))}
                    placeholder="00.000.000/0000-00"
                  />
                ) : (
                  <Input
                    className="mt-1"
                    value={formatCpfInput(form.cpf)}
                    onChange={(e) => set("cpf", e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="000.000.000-00"
                  />
                )}
              </div>
            </div>

            {/* RG + Órgão emissor + UF */}
            {!isPJ && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>RG</Label>
                  <Input className="mt-1" value={form.rg} onChange={(e) => set("rg", e.target.value)} placeholder="0.000.000" />
                </div>
                <div>
                  <Label>Órgão emissor</Label>
                  <Input className="mt-1" value={form.rg_emissor} onChange={(e) => set("rg_emissor", e.target.value)} placeholder="SSP" />
                </div>
                <div>
                  <Label>UF emissor</Label>
                  <Select value={form.rg_uf} onValueChange={(v) => set("rg_uf", v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {UFS.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Data de nascimento — dropdowns */}
            {!isPJ && (() => {
              const parts = form.data_nascimento ? form.data_nascimento.split("-") : [];
              const selYear = parts[0] || dobYear;
              const selMonth = parts[1] || dobMonth;
              const selDay = parts[2] || dobDay;

              const currentYear = new Date().getFullYear();
              const years = Array.from({ length: 120 }, (_, i) => String(currentYear - i));
              const months = [
                { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" },
                { value: "03", label: "Março" }, { value: "04", label: "Abril" },
                { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
                { value: "07", label: "Julho" }, { value: "08", label: "Agosto" },
                { value: "09", label: "Setembro" }, { value: "10", label: "Outubro" },
                { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
              ];

              const daysInMonth = selYear && selMonth
                ? new Date(Number(selYear), Number(selMonth), 0).getDate()
                : 31;
              const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0"));

              const updateDate = (y: string, m: string, d: string) => {
                if (y && m) {
                  const maxDay = new Date(Number(y), Number(m), 0).getDate();
                  if (Number(d) > maxDay) d = String(maxDay).padStart(2, "0");
                }
                setDobYear(y); setDobMonth(m); setDobDay(d);
                set("data_nascimento", y && m && d ? `${y}-${m}-${d}` : "");
              };

              return (
                <div>
                  <Label>Data de nascimento</Label>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <Select value={selDay || undefined} onValueChange={(v) => updateDate(selYear, selMonth, v)}>
                      <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
                      <SelectContent>
                        {days.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selMonth || undefined} onValueChange={(v) => updateDate(selYear, v, selDay)}>
                      <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selYear || undefined} onValueChange={(v) => updateDate(v, selMonth, selDay)}>
                      <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })()}

            {/* Email + Telefone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail</Label>
                <Input type="email" className="mt-1" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  className="mt-1"
                  value={formatPhone(form.telefone)}
                  onChange={(e) => set("telefone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {/* Status + Cidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade</Label>
                <Input className="mt-1" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
            </div>

            {/* Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {UFS_FULL.map((uf) => (
                      <SelectItem key={uf.sigla} value={uf.sigla}>{uf.sigla} — {uf.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div />
            </div>

            {/* Endereço completo — full width */}
            <div>
              <Label>Endereço completo</Label>
              <div className="space-y-3 mt-1">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Label className="text-xs text-muted-foreground">CEP</Label>
                    <div className="relative">
                      <Input
                        value={form.cep}
                        onChange={(e) => set("cep", e.target.value)}
                        onBlur={() => fetchCep(form.cep)}
                        placeholder="00000-000"
                      />
                      {loadingCep && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Rua</Label>
                    <Input value={form.rua} onChange={(e) => set("rua", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Complemento</Label>
                    <Input value={form.complemento} onChange={(e) => set("complemento", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Bairro</Label>
                    <Input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea className="mt-1 min-h-[80px]" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </div>

            {/* Vault folder checkbox — only on creation */}
            {!isEdit && (
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="create-vault-folder"
                  checked={createVaultFolder}
                  onCheckedChange={(v) => setCreateVaultFolder(v === true)}
                />
                <Label htmlFor="create-vault-folder" className="text-sm font-normal cursor-pointer">
                  Criar pasta no Vault automaticamente para este cliente
                </Label>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Dados Processuais ── */}
        <TabsContent value="dados-processuais" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Processos</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowProcessForm(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar Processo
              </Button>
            </div>

            {/* Add process form */}
            {showProcessForm && (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div>
                  <Label>Número do processo (CNJ) *</Label>
                  <Input
                    className="mt-1"
                    value={formatCNJ(newProcesso.numero_processo)}
                    onChange={(e) => setNewProcesso((p) => ({ ...p, numero_processo: e.target.value.replace(/\D/g, "").slice(0, 20) }))}
                    placeholder="0001234-56.2024.8.16.0001"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    className="mt-1"
                    value={newProcesso.descricao}
                    onChange={(e) => setNewProcesso((p) => ({ ...p, descricao: e.target.value }))}
                    placeholder="Ação de Cobrança"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Área</Label>
                    <Select value={newProcesso.area} onValueChange={(v) => setNewProcesso((p) => ({ ...p, area: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Cível", "Trabalhista", "Criminal", "Tributário", "Família", "Previdenciário", "Administrativo", "Outros"].map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={newProcesso.status} onValueChange={(v) => setNewProcesso((p) => ({ ...p, status: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                        <SelectItem value="Suspenso">Suspenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowProcessForm(false)}>Cancelar</Button>
                  <Button type="button" size="sm" onClick={addProcesso}>Adicionar</Button>
                </div>
              </div>
            )}

            {/* Process list */}
            {processos.length === 0 && !showProcessForm && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum processo cadastrado. Clique em + Adicionar Processo para começar.
              </div>
            )}

            {processos.map((p) => (
              <Collapsible key={p.id}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium font-mono truncate">{formatCNJ(p.numero_processo)}</span>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{p.area}</Badge>
                        </div>
                        {p.descricao && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.descricao}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Badge variant={p.status === "Ativo" ? "default" : "outline"} className="text-[10px]">
                          {p.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span role="button" className="p-1 rounded hover:bg-accent" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => removeProcesso(p.id)}>Remover</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-3 pt-1 border-t text-sm space-y-1">
                      <p><span className="text-muted-foreground">Área:</span> {p.area}</p>
                      <p><span className="text-muted-foreground">Status:</span> {p.status}</p>
                      {p.descricao && <p><span className="text-muted-foreground">Descrição:</span> {p.descricao}</p>}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer — fixed */}
      <div className="border-t border-border px-6 py-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Salvar Cliente
        </Button>
      </div>
    </form>
  );
}
