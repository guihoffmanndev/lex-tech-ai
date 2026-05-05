export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_statuses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      collaborator_tasks: {
        Row: {
          case_name: string | null
          collaborator_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_name?: string | null
          collaborator_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_name?: string | null
          collaborator_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_tasks_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          email: string | null
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          area: string | null
          category: string
          client: string | null
          client_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          area?: string | null
          category: string
          client?: string | null
          client_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          area?: string | null
          category?: string
          client?: string | null
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "lex_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_recentes: {
        Row: {
          acessado_em: string
          id: string
          item_id: string
          item_nome: string
          item_path: string
          tipo: string
          user_id: string
        }
        Insert: {
          acessado_em?: string
          id?: string
          item_id: string
          item_nome: string
          item_path: string
          tipo: string
          user_id: string
        }
        Update: {
          acessado_em?: string
          id?: string
          item_id?: string
          item_nome?: string
          item_path?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_documents: {
        Row: {
          collaborator_id: string | null
          created_at: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          user_id: string
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          user_id: string
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "hr_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_cases: {
        Row: {
          area: string
          client_id: string | null
          cliente: string | null
          created_at: string
          custas_adiantadas: number
          custo_mensal: number
          data_prevista_encerramento: string | null
          descricao: string | null
          id: string
          numero_processo: string
          percentual_honorarios: number
          score_risco: string
          status: string
          tipo_honorario: string
          updated_at: string
          user_id: string
          valor_causa: number
        }
        Insert: {
          area?: string
          client_id?: string | null
          cliente?: string | null
          created_at?: string
          custas_adiantadas?: number
          custo_mensal?: number
          data_prevista_encerramento?: string | null
          descricao?: string | null
          id?: string
          numero_processo: string
          percentual_honorarios?: number
          score_risco?: string
          status?: string
          tipo_honorario?: string
          updated_at?: string
          user_id: string
          valor_causa?: number
        }
        Update: {
          area?: string
          client_id?: string | null
          cliente?: string | null
          created_at?: string
          custas_adiantadas?: number
          custo_mensal?: number
          data_prevista_encerramento?: string | null
          descricao?: string | null
          id?: string
          numero_processo?: string
          percentual_honorarios?: number
          score_risco?: string
          status?: string
          tipo_honorario?: string
          updated_at?: string
          user_id?: string
          valor_causa?: number
        }
        Relationships: []
      }
      lex_clients: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          estado: string | null
          estado_civil: string | null
          id: string
          nacionalidade: string | null
          nome_completo: string
          numero: string | null
          observacoes: string | null
          profissao: string | null
          razao_social: string | null
          rg: string | null
          rg_emissor: string | null
          rg_uf: string | null
          rua: string | null
          status: string
          telefone: string | null
          tipo_pessoa: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          nacionalidade?: string | null
          nome_completo: string
          numero?: string | null
          observacoes?: string | null
          profissao?: string | null
          razao_social?: string | null
          rg?: string | null
          rg_emissor?: string | null
          rg_uf?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          nacionalidade?: string | null
          nome_completo?: string
          numero?: string | null
          observacoes?: string | null
          profissao?: string | null
          razao_social?: string | null
          rg?: string | null
          rg_emissor?: string | null
          rg_uf?: string | null
          rua?: string | null
          status?: string
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lex_office_settings: {
        Row: {
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome_escritorio: string | null
          oab: string | null
          site: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_escritorio?: string | null
          oab?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_escritorio?: string | null
          oab?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lex_templates: {
        Row: {
          categoria: string
          conteudo: string
          created_at: string | null
          docx_file_path: string | null
          id: string
          nome: string
          updated_at: string | null
          user_id: string | null
          variable_mappings: Json | null
        }
        Insert: {
          categoria?: string
          conteudo?: string
          created_at?: string | null
          docx_file_path?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          user_id?: string | null
          variable_mappings?: Json | null
        }
        Update: {
          categoria?: string
          conteudo?: string
          created_at?: string | null
          docx_file_path?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          user_id?: string | null
          variable_mappings?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          firm_name: string | null
          full_name: string
          id: string
          oab_number: string | null
          plan: string
          stripe_customer_id: string | null
          terms_accepted_at: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          firm_name?: string | null
          full_name?: string
          id: string
          oab_number?: string | null
          plan?: string
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          firm_name?: string | null
          full_name?: string
          id?: string
          oab_number?: string | null
          plan?: string
          stripe_customer_id?: string | null
          terms_accepted_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "collaborator_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_files: {
        Row: {
          client: string | null
          created_at: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          client?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vault_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vault_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          actions_executed: Json | null
          error_message: string | null
          executed_at: string
          id: string
          status: string
          trigger_data: Json | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          status?: string
          trigger_data?: Json | null
          user_id: string
          workflow_id: string
        }
        Update: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          status?: string
          trigger_data?: Json | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          actions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          run_count: number
          trigger_conditions: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_conditions?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_conditions?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_plan_rank: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
