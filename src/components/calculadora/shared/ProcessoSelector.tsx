// src/components/calculadora/shared/ProcessoSelector.tsx
import { useLegalCases } from "@/hooks/useLegalCases";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProcessoInfo {
  id: string;
  numero_processo: string;
  cliente: string;
}

interface ProcessoSelectorProps {
  value: string; // "" | "none" | case UUID
  onChange: (processo: ProcessoInfo | null) => void;
}

export function ProcessoSelector({ value, onChange }: ProcessoSelectorProps) {
  const { casesQuery } = useLegalCases();

  if (casesQuery.isLoading) {
    return <Skeleton className="h-9 w-full rounded-md" />;
  }

  const cases = casesQuery.data ?? [];

  const handleChange = (selected: string) => {
    if (selected === "none") {
      onChange(null);
      return;
    }
    const caso = cases.find((c) => c.id === selected);
    if (caso) {
      onChange({
        id: caso.id,
        numero_processo: caso.numero_processo,
        cliente: caso.cliente ?? "",
      });
    }
  };

  return (
    <Select value={value || "none"} onValueChange={handleChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Sem processo vinculado" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem processo vinculado</SelectItem>
        {cases.map((caso) => (
          <SelectItem key={caso.id} value={caso.id}>
            {caso.numero_processo}
            {caso.cliente ? ` — ${caso.cliente}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
