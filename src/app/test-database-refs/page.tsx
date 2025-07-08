'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, Database, FileText, ArrowRight } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillSourceReferences } from '@/lib/pdf-storage'
import { dataMigrationService } from '@/lib/data-migration'
import { sourceReferenceService } from '@/lib/source-references'

export default function TestDatabaseRefs() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)

  const runTests = async () => {
    setLoading(true)
    const results = []
    
    try {
      // Test 1: Check migration status
      console.log('🔍 Checking migration status...')
      const migrationResult = await dataMigrationService.getMigrationStatus()
      setMigrationStatus(migrationResult)
      
      results.push({
        name: 'Migration Status',
        success: migrationResult.status === 'migrated',
        message: migrationResult.message,
        details: migrationResult.details
      })

      // Test 2: Load source references from database
      console.log('📄 Loading source references...')
      const sourceRefs = await sourceReferenceService.getBillSourceReferences('hr1-119')
      
      results.push({
        name: 'Database Source References',
        success: sourceRefs.length > 0,
        message: `Found ${sourceRefs.length} source references`,
        details: sourceRefs.slice(0, 3).map(ref => ({
          sectionTitle: ref.sectionTitle,
          text: ref.text.substring(0, 100) + '...'
        }))
      })

      // Test 3: Test unified getBillSourceReferences function
      console.log('🔗 Testing unified source references...')
      const unifiedRefs = await getBillSourceReferences('hr1-119')
      
      results.push({
        name: 'Unified Source References',
        success: unifiedRefs.length > 0,
        message: `Found ${unifiedRefs.length} unified references`,
        details: unifiedRefs.slice(0, 3).map(ref => ({
          sectionTitle: ref.sectionTitle,
          billTitle: ref.billTitle,
          pdfUrl: ref.pdfUrl ? 'PDF URL available' : 'No PDF URL'
        }))
      })

      // Test 4: Test source reference search
      console.log('🔍 Testing source reference search...')
      const searchResults = await sourceReferenceService.searchSourceReferences('hr1-119', ['SNAP', 'tax'])
      
      results.push({
        name: 'Source Reference Search',
        success: searchResults.length > 0,
        message: `Found ${searchResults.length} search results`,
        details: searchResults.slice(0, 2).map(ref => ({
          sectionTitle: ref.sectionTitle,
          keywords: 'SNAP, tax',
          text: ref.text.substring(0, 80) + '...'
        }))
      })

      // Test 5: Test bill sections
      console.log('📋 Testing bill sections...')
      const sections = await sourceReferenceService.getBillSections('hr1-119')
      
      results.push({
        name: 'Bill Sections',
        success: sections.length > 0,
        message: `Found ${sections.length} bill sections`,
        details: sections.slice(0, 3).map(section => ({
          heading: section.heading,
          level: section.level,
          fullPath: section.full_path
        }))
      })

    } catch (error) {
      console.error('Test error:', error)
      results.push({
        name: 'Test Error',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: null
      })
    }
    
    setTestResults(results)
    setLoading(false)
  }

  const runMigration = async () => {
    setLoading(true)
    try {
      const result = await dataMigrationService.migrateBBBBill()
      if (result.success) {
        setMigrationStatus({ status: 'migrated', message: result.message })
        // Re-run tests after migration
        setTimeout(runTests, 1000)
      } else {
        setMigrationStatus({ status: 'error', message: result.message })
      }
    } catch (error) {
      setMigrationStatus({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Migration failed' 
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    runTests()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'migrated': return 'bg-green-100 text-green-800'
      case 'not_migrated': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Database Source References Test</h1>
            <p className="text-gray-600">
              Testing the database-driven source reference system with real data
            </p>
          </div>

          {/* Migration Status */}
          {migrationStatus && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Migration Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={getStatusColor(migrationStatus.status)}>
                    {migrationStatus.status}
                  </Badge>
                  <span className="text-sm text-gray-600">{migrationStatus.message}</span>
                </div>
                {migrationStatus.details && (
                  <div className="text-sm text-gray-600 mb-4">
                    <p>Nodes: {migrationStatus.details.nodes}</p>
                    <p>Chunks: {migrationStatus.details.chunks}</p>
                  </div>
                )}
                {migrationStatus.status === 'not_migrated' && (
                  <Button onClick={runMigration} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Run Migration
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Test Results
                <Button 
                  onClick={runTests} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Re-run Tests
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <h3 className="font-semibold">{result.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                    {result.details && (
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <pre>{JSON.stringify(result.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-4">
            <Link href="/bills/hr1-119">
              <Button variant="outline">
                View BBB Bill
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/bills/hr1-119/analysis">
              <Button variant="outline">
                View Analysis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 