import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Export generated types for use in components
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '@/types/database'

// Convenient type aliases
export type PersonaRow = Database['public']['Tables']['personas']['Row']
export type PersonaInsert = Database['public']['Tables']['personas']['Insert']
export type PersonaUpdate = Database['public']['Tables']['personas']['Update']

export type UserSessionRow = Database['public']['Tables']['user_sessions']['Row']
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert']
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update']

export type UserFeedbackRow = Database['public']['Tables']['user_feedback']['Row']
export type UserFeedbackInsert = Database['public']['Tables']['user_feedback']['Insert']
export type UserFeedbackUpdate = Database['public']['Tables']['user_feedback']['Update']

export type UsageAnalyticsRow = Database['public']['Tables']['usage_analytics']['Row']
export type UsageAnalyticsInsert = Database['public']['Tables']['usage_analytics']['Insert']
export type UsageAnalyticsUpdate = Database['public']['Tables']['usage_analytics']['Update']

export type ExportHistoryRow = Database['public']['Tables']['export_history']['Row']
export type ExportHistoryInsert = Database['public']['Tables']['export_history']['Insert']
export type ExportHistoryUpdate = Database['public']['Tables']['export_history']['Update'] 