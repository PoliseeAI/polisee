export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bill_actions: {
        Row: {
          action_code: string | null
          action_date: string | null
          action_text: string | null
          bill_id: string
          committee_code: string | null
          committee_name: string | null
          created_at: string | null
          id: number
          source_system: string | null
        }
        Insert: {
          action_code?: string | null
          action_date?: string | null
          action_text?: string | null
          bill_id: string
          committee_code?: string | null
          committee_name?: string | null
          created_at?: string | null
          id?: number
          source_system?: string | null
        }
        Update: {
          action_code?: string | null
          action_date?: string | null
          action_text?: string | null
          bill_id?: string
          committee_code?: string | null
          committee_name?: string | null
          created_at?: string | null
          id?: number
          source_system?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_actions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["bill_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "bill_chunks_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "bill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_cosponsors: {
        Row: {
          bill_id: string
          created_at: string | null
          district: number | null
          id: number
          is_withdrawn: boolean | null
          member_id: string
          member_name: string | null
          party: string | null
          sponsorship_date: string | null
          state: string | null
        }
        Insert: {
          bill_id: string
          created_at?: string | null
          district?: number | null
          id?: number
          is_withdrawn?: boolean | null
          member_id: string
          member_name?: string | null
          party?: string | null
          sponsorship_date?: string | null
          state?: string | null
        }
        Update: {
          bill_id?: string
          created_at?: string | null
          district?: number | null
          id?: number
          is_withdrawn?: boolean | null
          member_id?: string
          member_name?: string | null
          party?: string | null
          sponsorship_date?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_cosponsors_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["bill_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "bill_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "bill_nodes"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "bill_subjects_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["bill_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "bill_summaries_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["bill_id"]
          },
        ]
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
        }
        Relationships: []
      }
      committees: {
        Row: {
          chamber: string
          committee_code: string
          committee_type: string | null
          congress: number
          created_at: string | null
          id: number
          name: string | null
          parent_committee_code: string | null
          updated_at: string | null
        }
        Insert: {
          chamber: string
          committee_code: string
          committee_type?: string | null
          congress: number
          created_at?: string | null
          id?: number
          name?: string | null
          parent_committee_code?: string | null
          updated_at?: string | null
        }
        Update: {
          chamber?: string
          committee_code?: string
          committee_type?: string | null
          congress?: number
          created_at?: string | null
          id?: number
          name?: string | null
          parent_committee_code?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      export_history: {
        Row: {
          analysis_id: string
          created_at: string | null
          export_type: string
          file_path: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          analysis_id: string
          created_at?: string | null
          export_type: string
          file_path: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_id?: string
          created_at?: string | null
          export_type?: string
          file_path?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_year: number | null
          chamber: string
          congress: number
          created_at: string | null
          death_year: number | null
          district: number | null
          first_name: string | null
          full_name: string | null
          id: number
          last_name: string | null
          leadership_role: string | null
          member_id: string
          middle_name: string | null
          nickname: string | null
          party: string | null
          state: string | null
          suffix: string | null
          terms: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          birth_year?: number | null
          chamber: string
          congress: number
          created_at?: string | null
          death_year?: number | null
          district?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: number
          last_name?: string | null
          leadership_role?: string | null
          member_id: string
          middle_name?: string | null
          nickname?: string | null
          party?: string | null
          state?: string | null
          suffix?: string | null
          terms?: Json | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_year?: number | null
          chamber?: string
          congress?: number
          created_at?: string | null
          death_year?: number | null
          district?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: number
          last_name?: string | null
          leadership_role?: string | null
          member_id?: string
          middle_name?: string | null
          nickname?: string | null
          party?: string | null
          state?: string | null
          suffix?: string | null
          terms?: Json | null
          title?: string | null
          updated_at?: string | null
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
        Relationships: [
          {
            foreignKeyName: "personas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      representative_contact_messages: {
        Row: {
          bill_type: string | null
          category: string
          created_at: string | null
          id: string
          message_template: string
          subject: string
          title: string
          updated_at: string | null
        }
        Insert: {
          bill_type?: string | null
          category: string
          created_at?: string | null
          id?: string
          message_template: string
          subject: string
          title: string
          updated_at?: string | null
        }
        Update: {
          bill_type?: string | null
          category?: string
          created_at?: string | null
          id?: string
          message_template?: string
          subject?: string
          title?: string
          updated_at?: string | null
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
          next_election: string | null
          office: string | null
          party: string
          phone: string | null
          state: string
          term_end: string | null
          term_start: string | null
          title: string
          twitter: string | null
          updated_at: string | null
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
          next_election?: string | null
          office?: string | null
          party: string
          phone?: string | null
          state: string
          term_end?: string | null
          term_start?: string | null
          title: string
          twitter?: string | null
          updated_at?: string | null
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
          next_election?: string | null
          office?: string | null
          party?: string
          phone?: string | null
          state?: string
          term_end?: string | null
          term_start?: string | null
          title?: string
          twitter?: string | null
          updated_at?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      usage_analytics: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_representative_contacts: {
        Row: {
          bill_id: string | null
          contact_method: string | null
          contacted_at: string | null
          created_at: string | null
          custom_message: string | null
          id: string
          message_id: string | null
          representative_id: string | null
          sentiment: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          bill_id?: string | null
          contact_method?: string | null
          contacted_at?: string | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          message_id?: string | null
          representative_id?: string | null
          sentiment: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          bill_id?: string | null
          contact_method?: string | null
          contacted_at?: string | null
          created_at?: string | null
          custom_message?: string | null
          id?: string
          message_id?: string | null
          representative_id?: string | null
          sentiment?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_representative_contacts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "representative_contact_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_representative_contacts_representative_id_fkey"
            columns: ["representative_id"]
            isOneToOne: false
            referencedRelation: "representatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_representative_contacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_expired_personas: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      search_bill_chunks: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
        }
        Returns: {
          id: number
          node_id: number
          bill_id: string
          chunk_text: string
          metadata: Json
          similarity: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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

