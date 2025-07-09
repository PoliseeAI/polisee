'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, User, FileText, Settings, Home, LogOut, ChevronDown, Download, Users, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/lib/auth'
import { AuthModal } from '@/components/auth/AuthModal'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Analyze', href: '/analyze', icon: FileText },
  { name: 'Feed', href: '/feed', icon: MessageCircle },
  { name: 'Representatives', href: '/representatives', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()
  const { user, loading, signOut } = useAuthContext()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-xl font-bold">Polisee</span>
        </Link>

        {/* Desktop Navigation - Only show when user is logged in */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === '/analyze' && pathname.startsWith('/persona'))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            <Link 
              href="/scraper" 
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Scraper</span>
            </Link>
          </nav>
        )}

        {/* User Actions */}
        <div className="flex items-center space-x-2">
          {loading ? (
            <div className="hidden md:flex items-center space-x-2">
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded" />
            </div>
          ) : user ? (
            <div className="hidden md:flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="max-w-[100px] truncate">
                      {user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <AuthModal>
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </AuthModal>
              <AuthModal defaultMode="signup">
                <Button size="sm">
                  Get Started
                </Button>
              </AuthModal>
            </div>
          )}
          
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
            {/* Navigation Links - Only show when user is logged in */}
            {user && navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === '/analyze' && pathname.startsWith('/persona'))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Scraper link for mobile - Only show when user is logged in */}
            {user && (
              <Link
                href="/scraper"
                className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Download className="h-5 w-5" />
                <span>Scraper</span>
              </Link>
            )}
            
            <div className={cn("pt-4 pb-2", user && "border-t")}>
              <div className="px-3 space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    <div className="animate-pulse bg-gray-200 h-10 w-full rounded" />
                    <div className="animate-pulse bg-gray-200 h-10 w-full rounded" />
                  </div>
                ) : user ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-md">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {user.email?.split('@')[0]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-red-600"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AuthModal>
                      <Button variant="outline" className="w-full justify-start">
                        Sign In
                      </Button>
                    </AuthModal>
                    <AuthModal defaultMode="signup">
                      <Button className="w-full justify-start">
                        Get Started
                      </Button>
                    </AuthModal>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
} 