import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, User, FileText, ArrowRight } from 'lucide-react'
import { AuthGuard } from '@/components/auth'

export default function Analyze() {
  return (
    <AuthGuard>
      <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Analyze Legislation</h1>
        <p className="text-gray-600 mt-2">
          Upload a bill and create a persona to get personalized impact analysis
        </p>
      </div>

      {/* Process Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Step 1: Upload Bill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Upload a PDF of the legislation you want to analyze
            </p>
            <Button className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Bill
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Step 2: Create Persona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Tell us about yourself to get personalized impact analysis
            </p>
            <Button className="w-full" variant="outline">
              <User className="h-4 w-4 mr-2" />
              Create Persona
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Step 3: Get Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Receive your personalized impact report with key insights
            </p>
            <Button className="w-full" variant="outline" disabled>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Ready to analyze your first bill? Follow these steps:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium">Choose your bill</p>
                  <p className="text-sm text-gray-600">PDF format, max 10MB</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-600">2</span>
                </div>
                <div>
                  <p className="font-medium">Set up your persona</p>
                  <p className="text-sm text-gray-600">Takes 5-10 minutes</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">3</span>
                </div>
                <div>
                  <p className="font-medium">Get your analysis</p>
                  <p className="text-sm text-gray-600">Usually ready in 30 seconds</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-orange-600">4</span>
                </div>
                <div>
                  <p className="font-medium">Export & share</p>
                  <p className="text-sm text-gray-600">PDF, CSV, or web link</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center pt-4">
              <Button size="lg">
                Start Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Demo */}
      <Card>
        <CardHeader>
          <CardTitle>🧭 Navigation Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">✅ Current Page Features</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Sidebar shows "Analyze" section expanded</li>
                <li>• Breadcrumb shows: Home → Analyze</li>
                <li>• Active navigation highlighting</li>
                <li>• Responsive design</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🔄 Try These</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Click on "Upload Bill" in sidebar</li>
                <li>• Visit Dashboard to see different layout</li>
                <li>• Try mobile menu (resize window)</li>
                <li>• Check breadcrumbs update</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </AuthGuard>
  )
} 