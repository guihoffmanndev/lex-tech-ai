import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collaborator } from "@/hooks/useCollaborators";
import { formatPhone } from "@/lib/formatters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: Collaborator | null;
  onSave: (data: {
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    department: string | null;
    status: string;
    hire_date: string | null;
    bio: string | null;
  }, id?: string) => void;
}

export function ColaboradorForm({ open, onOpenChange, colaborador, onSave }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("Empresarial");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("Ativo");
  const [hireDate, setHireDate] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (colaborador) {
      setName(colaborador.name);
      setRole(colaborador.role);
      setDepartment(colaborador.department || "Empresarial");
      setEmail(colaborador.email || "");
      setPhone(colaborador.phone || "");
      setStatus(colaborador.status);
      setHireDate(colaborador.hire_date || "");
      setBio(colaborador.bio || "");
    } else {
      setName(""); setRole(""); setDepartment("Empresarial");
      setEmail(""); setPhone(""); setStatus("Ativo"); setHireDate(""); setBio("");
    }
  }, [colaborador, open]);

  const handleSave = () => {
    if (!name.trim() || !role.trim()) return;

    onSave({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      role: role.trim(),
      department: department || null,
      status,
      hire_date: hireDate || null,
      bio: bio.trim() || null,
    }, colaborador?.id);
  };

  const isEditing = !!colaborador;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar Colaborador" : "Novo Colaborador"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-6 px-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome completo *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Dr. João Silva" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cargo / Função *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                {["Sócio-Fundador", "Sócio(a)", "Advogado Sênior", "Advogado Pleno", "Advogado Júnior", "Advogada Júnior", "Estagiário(a)", "Assistente Administrativa"].map(c => (
                  <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Área de atuação</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Empresarial", "Trabalhista", "Cível", "Tributário", "Administrativo"].map(a => (
                  <SelectItem key={a} value={a} className="text-sm">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@escritorio.com" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-0000" className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo" className="text-sm">Ativo</SelectItem>
                  <SelectItem value="Inativo" className="text-sm">Inativo</SelectItem>
                  <SelectItem value="Férias" className="text-sm">Férias</SelectItem>
                  <SelectItem value="Afastado" className="text-sm">Afastado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de admissão</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-sm", !hireDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {hireDate ? format(parseISO(hireDate), "dd/MM/yyyy") : "Selecionar data…"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={hireDate ? parseISO(hireDate) : undefined}
                    onSelect={(d) => setHireDate(d ? format(d, "yyyy-MM-dd") : "")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Sobre</Label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Bio ou observações sobre o colaborador" />
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !role.trim()}>{isEditing ? "Salvar Alterações" : "Salvar Colaborador"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
