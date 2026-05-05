import { useState } from "react";
import { Copy, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL } from "@/lib/calculators/engine";
import type { ResultadoCorrecao } from "@/lib/calculators/civel";

interface ResultadoCardProps {
  resultado: ResultadoCorrecao;
  onSalvar?: () => void;
  isSaving?: boolean;
}

export function ResultadoCard({ resultado, onSalvar, isSaving }: ResultadoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleCopiar = () => {
    navigator.clipboard.writeText(
      `Total: ${formatBRL(resultado.total)}\nValor corrigido: ${formatBRL(resultado.valorCorrigido)}\nJuros: ${formatBRL(resultado.juros)}\nFator de correção: ${resultado.fatorCorrecao.toFixed(6)}`
    );
  };

  const correcaoValor = resultado.valorCorrigido.minus(resultado.valorOriginal);

  return (
    <div className="space-y-4">
      {/* Header com regime */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant={resultado.regimeJuros === "post-14905" ? "default" : "secondary"}
            className={
              resultado.regimeJuros === "post-14905"
                ? "bg-green-100 text-green-800 border-green-200"
                : resultado.regimeJuros === "misto"
                ? "bg-blue-100 text-blue-800 border-blue-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
            }
          >
            {resultado.regimeJuros === "post-14905"
              ? "Lei 14.905/2024"
              : resultado.regimeJuros === "misto"
              ? "Regime Misto"
              : "Anterior à Lei 14.905/2024"}
          </Badge>
          <span className="text-xs text-muted-foreground">{resultado.legislacao}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopiar}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copiar
          </Button>
          {onSalvar && (
            <Button size="sm" onClick={onSalvar} disabled={isSaving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? "Salvando…" : "Salvar"}
            </Button>
          )}
        </div>
      </div>

      {/* Cards de resultado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Valor Original
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold">{formatBRL(resultado.valorOriginal)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Correção Monetária
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold text-blue-600">
              {formatBRL(correcaoValor)}
            </p>
            <p className="text-xs text-muted-foreground">
              Fator: {resultado.fatorCorrecao.toFixed(6)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Juros de Mora
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-semibold text-amber-600">
              {formatBRL(resultado.juros)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-primary">Total Atualizado</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xl font-bold text-primary">{formatBRL(resultado.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Memória de cálculo */}
      {resultado.detalhes.length > 0 && (
        <div className="rounded-lg border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            onClick={() => setExpanded(!expanded)}
          >
            <span>Memória de Cálculo ({resultado.detalhes.length} meses)</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <>
              <Separator />
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">Taxa (%)</TableHead>
                      <TableHead className="text-right">Fator Mês</TableHead>
                      <TableHead className="text-right">Fator Acum.</TableHead>
                      <TableHead className="text-right">Valor Base</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.detalhes.map((d) => (
                      <TableRow key={d.dataRef}>
                        <TableCell className="font-medium capitalize">{d.mes}</TableCell>
                        <TableCell className="text-right">
                          {d.taxaMes.toFixed(4)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {d.fatorMes.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right">
                          {d.fatorAcumulado.toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatBRL(d.valorBase)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
