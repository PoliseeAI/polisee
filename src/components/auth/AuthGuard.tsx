'use client'

import { useAuthContext } from '@/lib/auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthModal } from './AuthModal'
import { Lock, User, ArrowRight } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      // Store the current path for redirect after login
      localStorage.setItem('returnUrl', pathname)
      setShowFallback(true)
    } else if (user) {
      setShowFallback(false)
    }
  }, [user, loading, pathname])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Show fallback if user is not authenticated
  if (!user && showFallback) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Protected Area:</strong> This page requires authentication to ensure your data privacy and security.
                </p>
              </div>
              
              <div className="space-y-3">
                <AuthModal>
                  <Button className="w-full" size="lg">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </AuthModal>
                
                <AuthModal defaultMode="signup">
                  <Button variant="outline" className="w-full" size="lg">
                    Create Account
                  </Button>
                </AuthModal>
              </div>

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/')}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ← Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // User is authenticated, show the protected content
  return <>{children}</>
} 