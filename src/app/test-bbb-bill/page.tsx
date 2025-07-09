'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillById } from '@/lib/bills'
import { getBillPDFUrl, getBillSourceReferences, getBillSections } from '@/lib/pdf-storage'

export default function TestBBBBill() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runTests = async () => {
      const results = []
      
      try {
        // Test 1: Load BBB bill data
        const bill = await getBillById('hr1-119')
        results.push({
          test: 'Load BBB Bill Data',
          passed: !!bill && bill.title === 'One Big Beautiful Bill Act',
          details: bill ? `Found: ${bill.title}` : 'Bill not found'
        })

        // Test 2: Generate PDF from text
        const pdfUrl = await getBillPDFUrl('hr1-119')
        results.push({
          test: 'Generate PDF from Text',
          passed: !!pdfUrl && pdfUrl.includes('data:application/pdf'),
          details: pdfUrl ? 'PDF generated successfully' : 'PDF generation failed'
        })

        // Test 3: Load source references
        const sourceRefs = await getBillSourceReferences('hr1-119')
        results.push({
          test: 'Load Source References',
          passed: sourceRefs.length > 0,
          details: `Found ${sourceRefs.length} source references`
        })

        // Test 4: Load bill sections
        const sections = await getBillSections('hr1-119')
        results.push({
          test: 'Load Bill Sections',
          passed: sections.length > 0,
          details: `Found ${sections.length} bill sections`
        })

        // Test 5: Check specific source reference content
        const snapRef = sourceRefs.find(ref => ref.sectionId === 'SEC.10001')
        results.push({
          test: 'Verify SNAP Reference Content',
          passed: !!snapRef && snapRef.text.includes('Thrifty Food Plan'),
          details: snapRef ? 'SNAP reference found with correct content' : 'SNAP reference not found'
        })

        // Test 6: Check tax provisions
        const taxRef = sourceRefs.find(ref => ref.sectionId === 'SEC.112001')
        results.push({
          test: 'Verify Tax Provisions',
          passed: !!taxRef && taxRef.text.includes('electric vehicle tax credit'),
          details: taxRef ? 'Tax provision reference found' : 'Tax provision reference not found'
        })

      } catch (error) {
        results.push({
          test: 'Error Handling',
          passed: false,
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }

      setTestResults(results)
      setLoading(false)
    }

    runTests()
  }, [])

  const passedTests = testResults.filter(result => result.passed).length
  const totalTests = testResults.length

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BBB Bill Test Results</h1>
            <p className="text-gray-600">Testing the One Big Beautiful Bill Act implementation</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={passedTests === totalTests ? "default" : "destructive"}>
              {passedTests}/{totalTests} Passed
            </Badge>
            <Button asChild>
              <Link href="/bills">
                View Bills
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {loading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Running tests...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {passedTests === totalTests ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Test Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{result.test}</p>
                        <p className="text-sm text-gray-600">{result.details}</p>
                      </div>
                    </div>
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.passed ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                If all tests pass, you can now test the complete workflow:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Test the Complete Flow</h4>
                  <div className="space-y-1 text-sm">
                    <p>1. Go to Bills page</p>
                    <p>2. Find "One Big Beautiful Bill Act"</p>
                    <p>3. Click "Get Analysis"</p>
                    <p>4. View personalized impacts</p>
                    <p>5. Click "View in PDF" on source references</p>
                    <p>6. Test PDF viewer and navigation</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Quick Links</h4>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/bills">Bills Page</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/bills/hr1-119">BBB Bill Details</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/bills/hr1-119/analysis">BBB Analysis</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/persona/create">Create Persona</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 