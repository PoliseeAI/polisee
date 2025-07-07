'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/lib/auth'

interface MainLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  showBreadcrumbs?: boolean
  showFooter?: boolean
  className?: string
}

export function MainLayout({ 
  children, 
  showSidebar = true,
  showBreadcrumbs = true,
  showFooter = true,
  className 
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const pathname = usePathname()
  const { user, loading } = useAuthContext()

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/analyze', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Determine if we should show sidebar based on route
  const shouldShowSidebar = showSidebar && (
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/analyze') ||
    pathname.startsWith('/settings')
  )

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

  // Full layout for authenticated users and public routes
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        {shouldShowSidebar && (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex lg:flex-shrink-0">
              <Sidebar />
            </div>
            
            {/* Mobile Sidebar */}
            <div className="lg:hidden">
              <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)} 
              />
            </div>
            
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
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
    </div>
  )
} 