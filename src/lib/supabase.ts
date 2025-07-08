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

// Persona utility functions
export const personaUtils = {
  // Check if user has an existing persona
  async hasPersona(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('personas')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
    
    if (error) {
      console.error('Error checking for persona:', error)
      return false
    }
    
    return data && data.length > 0
  },

  // Get user's persona
  async getPersona(userId: string): Promise<PersonaRow | null> {
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching persona:', error)
      return null
    }
    
    return data
  },

  // Delete user's persona
  async deletePersona(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error deleting persona:', error)
      return false
    }
    
    return true
  }
}

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