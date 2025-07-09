'use client'

import { PDFViewer } from '@/components/ui/pdf-viewer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthGuard } from '@/components/auth'
import { useEffect, useState } from 'react'
import SimplePDFTest from '@/components/ui/pdf-test-simple'
import TextPDFTest from '@/components/ui/text-pdf-test'

export default function PDFTest() {
  const [mounted, setMounted] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    setMounted(true)
    
    // Collect debug information
    const debug = {
      userAgent: navigator.userAgent,
      webWorkerSupport: typeof Worker !== 'undefined',
      pdfJsWorkerSupport: typeof window !== 'undefined' && 'Worker' in window,
      location: window.location.href,
      timestamp: new Date().toISOString()
    }
    setDebugInfo(JSON.stringify(debug, null, 2))
    
    console.log('PDF Test page debug info:', debug)
  }, [])

  if (!mounted) {
    return (
      <AuthGuard>
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center h-64">
            Loading...
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>PDF Viewer Test & Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Debug Information</h3>
                <details className="text-sm">
                  <summary className="cursor-pointer">Show Debug Info</summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {debugInfo}
                  </pre>
                </details>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">File Accessibility Test</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Sample Bill PDF:</span>
                    <a 
                      href="/sample-bill.pdf" 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      Direct Link Test
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>PDF Worker:</span>
                    <a 
                      href="/pdf.worker.js" 
                      target="_blank" 
                      className="text-blue-600 hover:underline"
                    >
                      Worker File Test
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🆕 Text to PDF Test - BBB Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-blue-600 font-medium">
                📄 Testing PDF viewers with converted text file (bbbsummary.txt)
              </div>
              <div className="text-sm text-gray-600">
                <p>This test converts the "One Big Beautiful Bill Act" summary text file to PDF format and displays it using both PDF viewers.</p>
                <p>The text contains legislative content with clear sections and subsections, perfect for testing PDF functionality.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <TextPDFTest 
          textFile="/bbbsummary.txt" 
          title="One Big Beautiful Bill Act - PDF Viewer Test"
          className="mb-6"
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>✅ PDF Viewer Test Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-green-600 font-medium">
                🎉 All PDF viewers are now working correctly with proper sizing!
              </div>
              <div className="text-sm text-gray-600">
                <p>✅ Version mismatch resolved (PDF.js 4.4.168)</p>
                <p>✅ Canvas compilation errors fixed</p>
                <p>✅ Direct react-pdf imports working</p>
                <p>✅ All PDF viewers use consistent approach</p>
                <p>✅ Overflow issues resolved - viewers fit in containers</p>
                <p>✅ Responsive design with proper height constraints</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Simple PDF Test (Direct react-pdf)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] overflow-hidden">
              <SimplePDFTest />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>✅ Advanced PDF Viewer Test 1: Sample Bill (Small)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="h-[600px] overflow-hidden">
                <PDFViewer
                  fileUrl="/sample-bill.pdf"
                  highlights={[]}
                  initialPage={1}
                  initialZoom={1.0}
                  onHighlightClick={(highlight) => {
                    console.log('Highlight clicked:', highlight)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>✅ Advanced PDF Viewer Test 2: Sample Bill 2 (Larger)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="h-[600px] overflow-hidden">
                <PDFViewer
                  fileUrl="/sample-bill-2.pdf"
                  highlights={[]}
                  initialPage={1}
                  initialZoom={1.0}
                  onHighlightClick={(highlight) => {
                    console.log('Highlight clicked:', highlight)
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>✅ Minimal Configuration Test (No Controls)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="h-[400px] overflow-hidden">
                <PDFViewer
                  fileUrl="/sample-bill.pdf"
                  showControls={false}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 