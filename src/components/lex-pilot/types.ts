export interface LexClient {
  id: string;
  tipo_pessoa: "pf" | "pj";
  nome_completo: string;
  cpf: string | null;
  cnpj: string | null;
  razao_social: string | null;
  rg: string | null;
  rg_emissor: string | null;
  rg_uf: string | null;
  data_nascimento: string | null;
  estado_civil: string | null;
  profissao: string | null;
  nacionalidade: string | null;
  email: string | null;
  telefone: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LexTemplate {
  id: string;
  nome: string;
  categoria: string;
  conteudo: string;
  docx_file_path: string | null;
  variable_mappings: Array<{ find: string; replace: string }> | null;
  created_at: string;
  updated_at: string;
}

export interface LexOfficeSettings {
  id: string;
  nome_escritorio: string | null;
  oab: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export const VARIABLE_LIST = [
  { key: "{{NOME}}", label: "Nome completo" },
  { key: "{{CPF}}", label: "CPF formatado" },
  { key: "{{RG}}", label: "RG + emissor + UF" },
  { key: "{{DATA_NASCIMENTO}}", label: "Data de nascimento" },
  { key: "{{ESTADO_CIVIL}}", label: "Estado civil" },
  { key: "{{PROFISSAO}}", label: "Profissão" },
  { key: "{{NACIONALIDADE}}", label: "Nacionalidade" },
  { key: "{{EMAIL}}", label: "E-mail" },
  { key: "{{TELEFONE}}", label: "Telefone" },
  { key: "{{ENDERECO_COMPLETO}}", label: "Endereço completo" },
  { key: "{{CIDADE}}", label: "Cidade" },
  { key: "{{ESTADO}}", label: "Estado (UF)" },
  { key: "{{DATA_HOJE}}", label: "Data atual por extenso" },
  { key: "{{DATA_HOJE_NUMERICA}}", label: "Data numérica" },
  { key: "{{CAMPO_ASSINATURA}}", label: "Linha de assinatura" },
  { key: "{{QUALIFICACAO_COMPLETA}}", label: "Qualificação completa" },
] as const;

export const VARIABLE_LIST_DOCX = VARIABLE_LIST.map((v) => ({
  key: v.key.replace(/\{\{/g, "{").replace(/\}\}/g, "}"),
  label: v.label,
}));

export const CATEGORIAS = ["Contratos", "Procurações", "Declarações", "Petições", "Outros"] as const;

export const ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"] as const;

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
] as const;
