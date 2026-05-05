// src/components/calculadora/shared/IndicesBanner.tsx
import { useIndicesRecentes } from "@/hooks/useIndices";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatMesAno(dataReferencia: string): string {
  try {
    return format(parseISO(dataReferencia), "MMM/yyyy", { locale: ptBR });
  } catch {
    return dataReferencia;
  }
}

function formatValor(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function isNovo(atualizadoEm: string): boolean {
  return new Date(atualizadoEm) > subHours(new Date(), 48);
}

export function IndicesBanner() {
  const { data: indices, isLoading, isError } = useIndicesRecentes();

  if (isLoading) {
    return <Skeleton className="h-10 w-full rounded-none" />;
  }

  if (isError || !indices || indices.length === 0) {
    return null;
  }

  const items = indices.map((idx) => ({
    text: `${idx.indice} ${formatMesAno(idx.data_referencia)}: ${formatValor(idx.valor)}%`,
    novo: isNovo(idx.atualizado_em),
  }));

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <>
      <style>{`
        @keyframes lex-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .lex-ticker-track {
          animation: lex-ticker 35s linear infinite;
          display: flex;
          white-space: nowrap;
        }
        .lex-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="w-full h-10 bg-muted/40 border-b overflow-hidden flex items-center">
        <div className="lex-ticker-track">
          {doubled.map((item, i) => (
            <span key={i} className="flex items-center gap-1 mx-5 text-xs text-muted-foreground">
              <span>{item.text}</span>
              {item.novo && (
                <Badge className="h-4 px-1 text-[10px] bg-green-500/15 text-green-700 border-0 rounded-sm">
                  Novo
                </Badge>
              )}
              <span className="ml-4 text-muted-foreground/30">|</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
