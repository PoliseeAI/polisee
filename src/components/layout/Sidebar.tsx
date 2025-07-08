'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  FileText, 
  User, 
  Settings, 
  ChevronDown,
  ChevronRight,
  BarChart3,
  HelpCircle,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/lib/auth'
import { AuthModal } from '@/components/auth/AuthModal'

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
  children?: NavigationItem[]
  badge?: string
}

const navigation: NavigationItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { 
    name: 'Analyze', 
    href: '/analyze', 
    icon: FileText,
    children: [
      { name: 'Create Persona', href: '/persona/create', icon: User },
      { name: 'View Bills', href: '/bills', icon: FileText },
      { name: 'Analysis Results', href: '/analyze/results', icon: BarChart3 },
    ]
  },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = React.useState<string[]>([])
  const { user, loading, signOut } = useAuthContext()

  const handleSignOut = async () => {
    await signOut()
  }

  // Auto-expand parent items based on current path
  React.useEffect(() => {
    const expandedPaths: string[] = []
    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          pathname.startsWith(child.href)
        )
        if (hasActiveChild || pathname === item.href) {
          expandedPaths.push(item.href)
        }
      }
    })
    setExpandedItems(expandedPaths)
  }, [pathname])

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    )
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.href)
    const hasActiveChild = hasChildren && item.children?.some(child => 
      pathname.startsWith(child.href)
    )

    return (
      <div key={item.href}>
        <div className="relative">
          <Link
            href={item.href}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
              level > 0 && 'ml-4 pl-6',
              isActive || hasActiveChild
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
            onClick={onClose}
          >
            <div className="flex items-center">
              <Icon className="h-4 w-4 mr-3" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.preventDefault()
                  toggleExpanded(item.href)
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </Link>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      <div className="flex h-full flex-col bg-white border-r">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-xl font-bold">Polisee</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map(item => renderNavigationItem(item))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t">
          {loading ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full" />
                <div>
                  <div className="animate-pulse bg-gray-200 h-4 w-16 rounded mb-1" />
                  <div className="animate-pulse bg-gray-200 h-3 w-12 rounded" />
                </div>
              </div>
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded" />
            </div>
          ) : user ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-gray-500">
                    Signed in
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-red-600"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Guest User</p>
                  <p className="text-xs text-gray-500">Not signed in</p>
                </div>
              </div>
              <AuthModal>
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </AuthModal>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 