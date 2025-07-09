'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, User, Tag, AlertCircle, Loader2, BookOpen, Bot } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillById, BillWithDetails, formatBillId, getBillStatusColor, getPolicyAreaColor } from '@/lib/bills'
import { getBillPDFUrl } from '@/lib/pdf-storage'
import { PDFViewer } from '@/components/ui/pdf-viewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AIBillSummary {
  what_it_does: string
  key_changes: string[]
  who_it_affects: string[]
  fiscal_impact: string
  timeline: string
}

export default function BillDetails() {
  const params = useParams()
  const router = useRouter()
  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [billPdfUrl, setBillPdfUrl] = useState<string | null>(null)
  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [aiSummary, setAiSummary] = useState<AIBillSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true)
        if (params.billId) {
          const fetchedBill = await getBillById(params.billId as string)
          setBill(fetchedBill)
          if (!fetchedBill) {
            setError('Bill not found')
          } else {
            // Fetch PDF URL
            const pdfUrl = await getBillPDFUrl(params.billId as string)
            setBillPdfUrl(pdfUrl)
          }
        }
      } catch (err) {
        setError('Failed to fetch bill details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBill()
  }, [params.billId])

  const fetchAISummary = useCallback(async () => {
    if (!bill?.bill_id || summaryLoading) return
    
    try {
      setSummaryLoading(true)
      setSummaryError(null)
      
      // First, check if we have a cached summary
      const cachedResponse = await fetch(`/api/ai-summary/${bill.bill_id}`)
      
      if (cachedResponse.ok) {
        const cachedData = await cachedResponse.json()
        if (cachedData.summary) {
          setAiSummary(cachedData.summary)
          return
        }
      }
      
      // If no cached summary and we have bill text, generate a new one
      if (bill.text) {
        const response = await fetch('/api/summarize-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            billId: bill.bill_id,
            billText: bill.text,
            billTitle: bill.title,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to generate summary')
        }

        const data = await response.json()
        setAiSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching AI summary:', error)
      setSummaryError('Failed to load AI summary. Please try again.')
    } finally {
      setSummaryLoading(false)
    }
  }, [bill?.bill_id, bill?.text, bill?.title])

  // Automatically fetch AI summary when bill is loaded
  useEffect(() => {
    if (bill && !bill.bill_summaries.length) {
      fetchAISummary()
    }
  }, [bill, fetchAISummary])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    // Parse the date string correctly to avoid timezone issues
    // The database stores dates as YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading bill details...</span>
        </div>
      </AuthGuard>
    )
  }

  if (error || !bill) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Bill Details</h1>
          </div>
          
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">{error || 'Bill not found'}</h3>
                <Button asChild className="mt-4">
                  <Link href="/bills">
                    Back to Bills
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bill Details</h1>
            <p className="text-gray-600">Complete information about this legislation</p>
          </div>
        </div>

        {/* Bill Overview */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl mb-3">{bill.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {formatBillId(bill)}
                  </Badge>
                  {bill.policy_area ? (
                    <Badge 
                      className={getPolicyAreaColor(bill.policy_area)}
                      variant="secondary"
                    >
                      {bill.policy_area}
                    </Badge>
                  ) : (
                    <Badge 
                      className="bg-gray-100 text-gray-600"
                      variant="secondary"
                    >
                      Uncategorized
                    </Badge>
                  )}
                  <Badge 
                    className={getBillStatusColor(bill)}
                    variant="secondary"
                    title={bill.latest_action || 'Status Unknown'}
                  >
                    {bill.latest_action && bill.latest_action.length > 30 
                      ? bill.latest_action.substring(0, 30) + '...'
                      : bill.latest_action || 'Status Unknown'}
                  </Badge>
                  {billPdfUrl && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <FileText className="h-3 w-3 mr-1" />
                      Full Text Available
                    </Badge>
                  )}
                </div>
              </div>
              {billPdfUrl && (
                <Button
                  onClick={() => setShowPdfDialog(true)}
                  className="flex-shrink-0"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Read Full Text
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Bill Information */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Key Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Key Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-gray-700">Introduced</p>
                  <p className="text-gray-600">{formatDate(bill.introduced_date)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Last Action</p>
                  <p className="text-gray-600">{formatDate(bill.latest_action_date)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Congress</p>
                  <p className="text-gray-600">{bill.congress}th Congress</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Chamber</p>
                  <p className="text-gray-600">{bill.origin_chamber}</p>
                </div>
              </div>
              {bill.latest_action && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">Latest Action</p>
                  <p className="text-sm text-gray-600">{bill.latest_action}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sponsor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Sponsor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-gray-900">{bill.sponsor_name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {bill.sponsor_party}
                  </Badge>
                  <Badge variant="outline">
                    {bill.sponsor_state}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bill Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>What This Bill Does</CardTitle>
              {!bill.bill_summaries.length && bill.text && !aiSummary && !summaryLoading && (
                <Button onClick={fetchAISummary} variant="outline" size="sm">
                  <Bot className="h-4 w-4 mr-2" />
                  Generate AI Summary
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {bill.bill_summaries.length > 0 ? (
              <div className="space-y-4">
                {bill.bill_summaries.map((summary) => (
                  <div key={summary.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {summary.action_desc}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDate(summary.action_date)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {summary.summary_text}
                    </p>
                  </div>
                ))}
              </div>
            ) : summaryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                <span className="text-gray-600">Generating AI summary...</span>
              </div>
            ) : aiSummary ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                      AI Generated Summary
                    </Badge>
                  </div>
                  <h4 className="font-medium text-blue-900 mb-2">Overview</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {aiSummary.what_it_does}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Key Changes</h4>
                  <ul className="space-y-2">
                    {aiSummary.key_changes.map((change, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Who It Affects</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiSummary.who_it_affects.map((group, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Fiscal Impact</h4>
                    <p className="text-sm text-green-800">
                      {aiSummary.fiscal_impact}
                    </p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-900 mb-2">Timeline</h4>
                    <p className="text-sm text-orange-800">
                      {aiSummary.timeline}
                    </p>
                  </div>
                </div>
              </div>
            ) : summaryError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Error Generating Summary</h4>
                    <p className="text-sm text-red-700">{summaryError}</p>
                  </div>
                  <Button onClick={fetchAISummary} variant="outline" size="sm">
                    <Bot className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Bill Title Analysis</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Based on the bill title: "{bill.title}"
                  </p>
                </div>
                
                {bill.policy_area && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Policy Focus</h4>
                    <p className="text-sm text-gray-700">
                      This bill addresses issues related to <strong>{bill.policy_area}</strong>.
                    </p>
                  </div>
                )}

                {bill.bill_subjects.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Key Topics</h4>
                    <p className="text-sm text-gray-700 mb-2">This bill covers:</p>
                    <div className="flex flex-wrap gap-1">
                      {bill.bill_subjects.slice(0, 5).map((subject) => (
                        <Badge 
                          key={subject.id} 
                          variant="outline"
                          className="text-xs"
                        >
                          {subject.subject_name}
                        </Badge>
                      ))}
                      {bill.bill_subjects.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{bill.bill_subjects.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">Enhanced Summary Available</h4>
                  <p className="text-sm text-yellow-700">
                    Generate an AI-powered summary that analyzes the full bill text and provides detailed insights.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        {bill.bill_subjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Tag className="h-5 w-5 mr-2" />
                Bill Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {bill.bill_subjects.map((subject) => (
                  <Badge 
                    key={subject.id} 
                    variant="outline"
                    className="text-sm"
                  >
                    {subject.subject_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Get Personalized Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Want to see how this bill affects you personally? Create a persona and get AI-powered analysis tailored to your specific situation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href={`/bills/${bill.bill_id}/analysis`}>
                    Get Personalized Analysis
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/persona/create">
                    Update Your Persona
                  </Link>
                </Button>
                {billPdfUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowPdfDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Read Full Text
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>



        {/* PDF Viewer Dialog */}
        {billPdfUrl && (
          <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {bill.title}
                </DialogTitle>
              </DialogHeader>
              <div className="h-[80vh] overflow-hidden">
                <PDFViewer
                  fileUrl={billPdfUrl}
                  highlights={[]}
                  initialPage={1}
                  initialZoom={1.0}
                  onHighlightClick={(highlight) => {
                    console.log('Highlight clicked:', highlight)
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AuthGuard>
  )
} 