import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables for admin client')
}

// Server-side admin client - DO NOT use on client side
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper function to check if we're on the server
export const isServer = typeof window === 'undefined'

// Safe admin client access - only works on server
export function getSupabaseAdmin() {
  if (!isServer) {
    throw new Error('Admin client should only be used on the server side')
  }
  return supabaseAdmin
} 