'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { Breadcrumbs } from './Breadcrumbs'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/lib/auth'

interface MainLayoutProps {
  children: React.ReactNode
  showBreadcrumbs?: boolean
  showFooter?: boolean
  className?: string
}

export function MainLayout({ 
  children, 
  showBreadcrumbs = true,
  showFooter = true,
  className 
}: MainLayoutProps) {
  const pathname = usePathname()
  const { user, loading } = useAuthContext()

  // Use header consistently throughout the app
  const shouldShowHeader = true

  // Define protected routes that require authentication
  const protectedRoutes = ['/analyze', '/settings', '/persona']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // For protected routes, check if user is authenticated
  const shouldShowLayout = !isProtectedRoute || user || loading

  // For unauthenticated users on protected routes, render minimal layout
  if (isProtectedRoute && !user && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  // Consistent header layout throughout the app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      {shouldShowHeader && <Header />}
      
      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        <main className={cn('flex-1', className)}>
          {/* Breadcrumbs */}
          {showBreadcrumbs && pathname !== '/' && (
            <div className="bg-white border-b">
              <div className="container mx-auto py-4">
                <Breadcrumbs />
              </div>
            </div>
          )}
          
          {/* Page Content */}
          {pathname === '/' ? (
            // Full-width homepage
            <div>
              {children}
            </div>
          ) : (
            // Container-wrapped pages
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          )}
        </main>

        {/* Footer */}
        {showFooter && <Footer />}
      </div>
    </div>
  )
} 