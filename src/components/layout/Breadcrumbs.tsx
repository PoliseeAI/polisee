'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
  icon?: React.ElementType
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

// Route name mapping for better display names
const routeNames: Record<string, string> = {
  '/': 'Home',
  '/analyze': 'Analyze',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/help': 'Help',
  '/about': 'About',
  '/contact': 'Contact',
  '/pricing': 'Pricing',
  '/features': 'Features',
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Generate breadcrumb items from pathname if not provided
  const breadcrumbItems = React.useMemo(() => {
    if (items) return items

    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/', icon: Home }
    ]

    // Don't show breadcrumbs for the home page
    if (segments.length === 0) return []

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1
      
      // Capitalize and clean segment names
      const label = routeNames[currentPath] || 
                   segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      
      breadcrumbs.push({
        label,
        href: currentPath,
      })
    })

    return breadcrumbs
  }, [pathname, items])

  // Don't render if only home or empty
  if (breadcrumbItems.length <= 1) return null

  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)}>
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const Icon = item.icon

        return (
          <React.Fragment key={item.href}>
            <div className="flex items-center">
              {Icon && <Icon className="h-4 w-4 mr-1" />}
              {isLast ? (
                <span className="font-medium text-gray-900">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </div>
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-gray-400" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
} 