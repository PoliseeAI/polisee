'use client'

import { AuthProvider as AuthContextProvider } from '@/lib/auth'
import { Toaster } from '@/components/ui/sonner'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthContextProvider>
      {children}
      <Toaster />
    </AuthContextProvider>
  )
} 