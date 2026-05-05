import { TarefasTab } from "@/components/colaboradores/TarefasTab";

export default function Tarefas() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl">Tarefas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie tarefas da equipe no quadro Kanban
        </p>
      </div>
      <TarefasTab />
    </div>
  );
}
