import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Search, Calendar } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'

export default function Bills() {
  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Available Bills</h1>
            <p className="text-gray-600">Browse legislative bills uploaded by our team</p>
          </div>
        </div>

        {/* Coming Soon Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Bills Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Bills Library Coming Soon
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We're working on building a comprehensive library of legislative bills. 
                Soon you'll be able to browse, search, and get personalized analysis of all available bills.
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Search className="h-5 w-5 text-gray-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Search & Filter</p>
                      <p className="text-sm text-gray-600">Find bills by topic, date, or impact</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Recent Bills</p>
                      <p className="text-sm text-gray-600">Latest legislative proposals</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Plus className="h-5 w-5 text-gray-600" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Personalized</p>
                      <p className="text-sm text-gray-600">Tailored to your persona</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild>
                    <Link href="/persona/create">
                      Create Persona First
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/analyze">
                      Back to Analyze
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Development Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                The bills library is part of our roadmap and will include:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">📋 Features Coming</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Browse all available bills</li>
                    <li>• Search and filter by category</li>
                    <li>• Personalized impact analysis</li>
                    <li>• Bill status tracking</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">🔄 Current Phase</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Admin bill management system</li>
                    <li>• AI analysis integration</li>
                    <li>• Sentiment feedback system</li>
                    <li>• User interface development</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 