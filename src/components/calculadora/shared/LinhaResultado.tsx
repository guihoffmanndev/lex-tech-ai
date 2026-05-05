interface LinhaResultadoProps {
  label: string;
  valor: string;
  destaque?: boolean;
}

export function LinhaResultado({ label, valor, destaque }: LinhaResultadoProps) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${destaque ? "font-semibold" : ""}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`tabular-nums text-sm ${destaque ? "text-primary text-base font-bold" : ""}`}>{valor}</span>
    </div>
  );
}
