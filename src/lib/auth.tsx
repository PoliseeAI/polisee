'use client'

import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'
import { useEffect, useState, createContext, useContext, ReactNode } from 'react'

export type AuthUser = User | null

// Auth utilities
export const authUtils = {
  // Sign up with email and password
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Reset password
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  },

  // Update password
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password,
    })
    return { data, error }
  },

  // Update user profile
  async updateProfile(updates: { email?: string; data?: any }) {
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  }
}

// Custom hook for auth state
export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    signUp: authUtils.signUp,
    signIn: authUtils.signIn,
    signOut: authUtils.signOut,
    resetPassword: authUtils.resetPassword,
    updatePassword: authUtils.updatePassword,
    updateProfile: authUtils.updateProfile,
  }
}

// Auth context
interface AuthContextType {
  user: AuthUser
  loading: boolean
  signUp: typeof authUtils.signUp
  signIn: typeof authUtils.signIn
  signOut: typeof authUtils.signOut
  resetPassword: typeof authUtils.resetPassword
  updatePassword: typeof authUtils.updatePassword
  updateProfile: typeof authUtils.updateProfile
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
} 