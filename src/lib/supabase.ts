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

export type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row']
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

// User preferences utility functions
export const userPreferencesUtils = {
  // Get user preferences with defaults
  async getUserPreferences(userId: string): Promise<UserPreferencesRow | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        // Don't log errors for expected scenarios like user not found or table not existing
        if (error.code === 'PGRST116' || error.message.includes('relation "user_preferences" does not exist')) {
          // User doesn't have preferences yet or table doesn't exist - this is expected
          return null
        }
        console.error('Error fetching user preferences:', error)
        return null
      }
      
      return data
    } catch (error) {
      // Handle any other unexpected errors
      console.error('Unexpected error fetching user preferences:', error)
      return null
    }
  },

  // Create or update user preferences
  async upsertUserPreferences(userId: string, preferences: Partial<UserPreferencesInsert>): Promise<UserPreferencesRow | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting user preferences:', error)
      return null
    }
    
    return data
  },

  // Get default preferences for a new user
  getDefaultPreferences(): Partial<UserPreferencesInsert> {
    return {
      notify_analysis_complete: true,
      notify_weekly_digest: false,
      notify_new_features: true,
      data_retention_enabled: true,
      analytics_enabled: false,
      first_name: '',
      last_name: '',
      bio: ''
    }
  },

  // Update notification preferences
  async updateNotificationPreferences(userId: string, notifications: {
    notify_analysis_complete?: boolean
    notify_weekly_digest?: boolean
    notify_new_features?: boolean
  }): Promise<boolean> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...notifications
      }, {
        onConflict: 'user_id'
      })
    
    if (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
    
    return true
  },

  // Update privacy preferences
  async updatePrivacyPreferences(userId: string, privacy: {
    data_retention_enabled?: boolean
    analytics_enabled?: boolean
  }): Promise<boolean> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...privacy
      }, {
        onConflict: 'user_id'
      })
    
    if (error) {
      console.error('Error updating privacy preferences:', error)
      return false
    }
    
    return true
  },

  // Update profile information
  async updateProfileInfo(userId: string, profile: {
    first_name?: string
    last_name?: string
    bio?: string
  }): Promise<boolean> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...profile
      }, {
        onConflict: 'user_id'
      })
    
    if (error) {
      console.error('Error updating profile information:', error)
      return false
    }
    
    return true
  },

  // Delete user preferences
  async deleteUserPreferences(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)
    
    if (error) {
      console.error('Error deleting user preferences:', error)
      return false
    }
    
    return true
  }
} 