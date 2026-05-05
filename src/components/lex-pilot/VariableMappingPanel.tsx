import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search } from "lucide-react";
import { VARIABLE_LIST_DOCX } from "./types";

interface Mapping {
  find: string;
  replace: string;
}

interface Props {
  selectedText: string | null;
  mappings: Mapping[];
  onAddMapping: (mapping: Mapping) => void;
  onRemoveMapping: (index: number) => void;
  onClearSelection: () => void;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}

export default function VariableMappingPanel({
  selectedText,
  mappings,
  onAddMapping,
  onRemoveMapping,
  onClearSelection,
  searchText,
  onSearchTextChange,
}: Props) {
  const [customVar, setCustomVar] = useState("");

  const handleSelectVariable = (varKey: string) => {
    if (!selectedText) return;
    onAddMapping({ find: selectedText, replace: varKey });
    onClearSelection();
  };

  const handleAddCustom = () => {
    if (!selectedText || !customVar.trim()) return;
    const key = `{${customVar.trim().toUpperCase().replace(/\s+/g, "_")}}`;
    onAddMapping({ find: selectedText, replace: key });
    setCustomVar("");
    onClearSelection();
  };

  return (
    <div className="border rounded-lg bg-card p-4 space-y-4 h-fit">
      {/* Selected text indicator */}
      {selectedText ? (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
          <p className="text-xs font-medium text-primary">Texto selecionado:</p>
          <p className="text-sm font-mono bg-background rounded px-2 py-1 break-all">
            "{selectedText}"
          </p>
          <p className="text-xs text-muted-foreground">Clique em uma variável abaixo para mapear</p>
        </div>
      ) : (
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Selecione um texto no documento para mapeá-lo a uma variável
          </p>
        </div>
      )}

      {/* Fallback: manual text search */}
      <div>
        <label className="text-xs font-medium flex items-center gap-1 mb-1">
          <Search className="h-3 w-3" /> Buscar texto no documento
        </label>
        <Input
          value={searchText}
          onChange={(e) => onSearchTextChange(e.target.value)}
          placeholder="Digite o texto a substituir..."
          className="h-8 text-xs"
        />
      </div>

      {/* Variable list */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Variáveis</h3>
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {VARIABLE_LIST_DOCX.map((v) => (
            <button
              key={v.key}
              onClick={() => handleSelectVariable(v.key)}
              disabled={!selectedText}
              className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="font-mono text-primary font-semibold text-[11px]">{v.key}</span>
              <span className="block text-muted-foreground mt-0.5 text-[10px]">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom variable */}
      <div className="pt-2 border-t space-y-2">
        <p className="text-xs font-medium">Variável personalizada</p>
        <div className="flex gap-1">
          <Input
            value={customVar}
            onChange={(e) => setCustomVar(e.target.value)}
            placeholder="VALOR_CAUSA"
            className="h-7 text-xs"
            disabled={!selectedText}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={handleAddCustom}
            disabled={!selectedText || !customVar.trim()}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Mappings list */}
      {mappings.length > 0 && (
        <div className="pt-2 border-t space-y-2">
          <h3 className="text-sm font-semibold">Mapeamentos ({mappings.length})</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {mappings.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 px-2 py-1.5 bg-muted/30 rounded text-xs"
              >
                <div className="min-w-0">
                  <span className="text-muted-foreground truncate block">"{m.find}"</span>
                  <Badge variant="secondary" className="text-[10px] font-mono mt-0.5">
                    {m.replace}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0 text-destructive"
                  onClick={() => onRemoveMapping(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
