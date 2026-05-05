import { useAuth } from "@/contexts/AuthContext";

export type Feature =
  | "assistente"
  | "vault"
  | "workflows"
  | "financeiro"
  | "relatorios"
  | "colaboradores"
  | "clientes"
  | "tarefas"
  | "lex-pilot"
  | "calculadora";

const PLAN_FEATURES: Record<string, Feature[]> = {
  free: [],
  starter: ["assistente", "vault", "workflows", "tarefas", "financeiro"],
  "plus+": ["assistente", "vault", "workflows", "financeiro", "colaboradores", "clientes", "relatorios", "tarefas", "calculadora"],
  pro: ["assistente", "vault", "workflows", "financeiro", "colaboradores", "clientes", "relatorios", "tarefas", "lex-pilot", "calculadora"],
};

const FEATURE_MIN_PLAN: Record<Feature, string> = {
  assistente: "starter",
  vault: "starter",
  workflows: "starter",
  financeiro: "starter",
  relatorios: "plus+",
  colaboradores: "plus+",
  clientes: "plus+",
  tarefas: "starter",
  "lex-pilot": "pro",
  calculadora: "plus+",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  "plus+": "Plus+",
  pro: "Pro",
};

export function usePlanPermissions() {
  const { subscription } = useAuth();
  const currentPlan = subscription.plan || "free";

  const hasAccess = (feature: Feature): boolean => {
    const allowed = PLAN_FEATURES[currentPlan] ?? PLAN_FEATURES.free;
    return allowed.includes(feature);
  };

  const getRequiredPlan = (feature: Feature): string => {
    return PLAN_LABELS[FEATURE_MIN_PLAN[feature]] ?? "Plus+";
  };

  return { currentPlan, hasAccess, getRequiredPlan };
}
