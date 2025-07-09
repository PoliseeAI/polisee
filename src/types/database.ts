export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_bill_summaries: {
        Row: {
          bill_id: string
          bill_text_hash: string
          fiscal_impact: string
          generated_at: string | null
          id: number
          key_changes: string[]
          model_used: string
          timeline: string
          what_it_does: string
          who_it_affects: string[]
        }
        Insert: {
          bill_id: string
          bill_text_hash: string
          fiscal_impact: string
          generated_at?: string | null
          id?: number
          key_changes: string[]
          model_used?: string
          timeline: string
          what_it_does: string
          who_it_affects: string[]
        }
        Update: {
          bill_id?: string
          bill_text_hash?: string
          fiscal_impact?: string
          generated_at?: string | null
          id?: number
          key_changes?: string[]
          model_used?: string
          timeline?: string
          what_it_does?: string
          who_it_affects?: string[]
        }
        Relationships: []
      }
      bills: {
        Row: {
          bill_id: string
          cboc_estimate_url: string | null
          congress: number
          constitutional_authority_text: string | null
          created_at: string | null
          id: number
          introduced_date: string | null
          is_active: boolean | null
          latest_action: string | null
          latest_action_date: string | null
          number: number
          origin_chamber: string | null
          policy_area: string | null
          raw_data: Json | null
          sponsor_id: string | null
          sponsor_name: string | null
          sponsor_party: string | null
          sponsor_state: string | null
          title: string | null
          type: string
          update_date: string | null
          text: string | null
        }
        Insert: {
          bill_id: string
          cboc_estimate_url?: string | null
          congress: number
          constitutional_authority_text?: string | null
          created_at?: string | null
          id?: number
          introduced_date?: string | null
          is_active?: boolean | null
          latest_action?: string | null
          latest_action_date?: string | null
          number: number
          origin_chamber?: string | null
          policy_area?: string | null
          raw_data?: Json | null
          sponsor_id?: string | null
          sponsor_name?: string | null
          sponsor_party?: string | null
          sponsor_state?: string | null
          title?: string | null
          type: string
          update_date?: string | null
          text?: string | null
        }
        Update: {
          bill_id?: string
          cboc_estimate_url?: string | null
          congress?: number
          constitutional_authority_text?: string | null
          created_at?: string | null
          id?: number
          introduced_date?: string | null
          is_active?: boolean | null
          latest_action?: string | null
          latest_action_date?: string | null
          number?: number
          origin_chamber?: string | null
          policy_area?: string | null
          raw_data?: Json | null
          sponsor_id?: string | null
          sponsor_name?: string | null
          sponsor_party?: string | null
          sponsor_state?: string | null
          title?: string | null
          type?: string
          update_date?: string | null
          text?: string | null
        }
        Relationships: []
      }
      bill_summaries: {
        Row: {
          action_date: string | null
          action_desc: string | null
          bill_id: string
          created_at: string | null
          id: number
          summary_text: string | null
          update_date: string | null
          version_code: string | null
        }
        Insert: {
          action_date?: string | null
          action_desc?: string | null
          bill_id: string
          created_at?: string | null
          id?: number
          summary_text?: string | null
          update_date?: string | null
          version_code?: string | null
        }
        Update: {
          action_date?: string | null
          action_desc?: string | null
          bill_id?: string
          created_at?: string | null
          id?: number
          summary_text?: string | null
          update_date?: string | null
          version_code?: string | null
        }
        Relationships: []
      }
      bill_subjects: {
        Row: {
          bill_id: string
          created_at: string | null
          id: number
          subject_name: string
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          id?: number
          subject_name: string
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          id?: number
          subject_name?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          age: number
          business_type: string | null
          created_at: string | null
          dependents: number
          employee_count: number | null
          expires_at: string
          has_health_insurance: boolean
          has_higher_education: boolean
          has_medicare: boolean
          has_social_security: boolean
          id: string
          income_bracket: string
          location: string
          occupation: string
          school_district: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          age: number
          business_type?: string | null
          created_at?: string | null
          dependents?: number
          employee_count?: number | null
          expires_at?: string
          has_health_insurance?: boolean
          has_higher_education?: boolean
          has_medicare?: boolean
          has_social_security?: boolean
          id?: string
          income_bracket: string
          location: string
          occupation: string
          school_district?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number
          business_type?: string | null
          created_at?: string | null
          dependents?: number
          employee_count?: number | null
          expires_at?: string
          has_health_insurance?: boolean
          has_higher_education?: boolean
          has_medicare?: boolean
          has_social_security?: boolean
          id?: string
          income_bracket?: string
          location?: string
          occupation?: string
          school_district?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      representatives: {
        Row: {
          bioguide_id: string
          chamber: string
          contact_form: string | null
          created_at: string | null
          district: string | null
          email: string | null
          facebook: string | null
          first_name: string
          id: string
          image_url: string | null
          in_office: boolean | null
          last_name: string
          middle_name: string | null
          office: string | null
          party: string
          phone: string | null
          state: string
          term_end: string | null
          term_start: string | null
          title: string
          twitter: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          bioguide_id: string
          chamber: string
          contact_form?: string | null
          created_at?: string | null
          district?: string | null
          email?: string | null
          facebook?: string | null
          first_name: string
          id?: string
          image_url?: string | null
          in_office?: boolean | null
          last_name: string
          middle_name?: string | null
          office?: string | null
          party: string
          phone?: string | null
          state: string
          term_end?: string | null
          term_start?: string | null
          title: string
          twitter?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          bioguide_id?: string
          chamber?: string
          contact_form?: string | null
          created_at?: string | null
          district?: string | null
          email?: string | null
          facebook?: string | null
          first_name?: string
          id?: string
          image_url?: string | null
          in_office?: boolean | null
          last_name?: string
          middle_name?: string | null
          office?: string | null
          party?: string
          phone?: string | null
          state?: string
          term_end?: string | null
          term_start?: string | null
          title?: string
          twitter?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          analysis_id: string | null
          comment: string | null
          created_at: string | null
          feedback_type: string
          id: string
          rating: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          comment?: string | null
          created_at?: string | null
          feedback_type: string
          id?: string
          rating: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          comment?: string | null
          created_at?: string | null
          feedback_type?: string
          id?: string
          rating?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bill_nodes: {
        Row: {
          bill_id: string
          created_at: string | null
          full_path: string | null
          heading: string | null
          id: number
          level: string
          node_text: string | null
          parent_id: number | null
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          full_path?: string | null
          heading?: string | null
          id?: number
          level: string
          node_text?: string | null
          parent_id?: number | null
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          full_path?: string | null
          heading?: string | null
          id?: number
          level?: string
          node_text?: string | null
          parent_id?: number | null
        }
        Relationships: []
      }
      bill_chunks: {
        Row: {
          bill_id: string
          chunk_text: string | null
          created_at: string | null
          embedding: string | null
          id: number
          metadata: Json | null
          node_id: number
        }
        Insert: {
          bill_id: string
          chunk_text?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
          node_id: number
        }
        Update: {
          bill_id?: string
          chunk_text?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
          node_id?: number
        }
        Relationships: []
      }
      [key: string]: any
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_bill_hierarchy: {
        Args: { node_id_param: number }
        Returns: {
          id: number
          bill_id: string
          parent_id: number
          level: string
          heading: string
          node_text: string
          full_path: string
          depth: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
