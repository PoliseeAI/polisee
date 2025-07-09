import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-orange-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Page Not Found
              </h1>
              <p className="text-gray-600">
                Sorry, the page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/bills">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Bills
                </Link>
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                If you believe this is an error, please contact support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 