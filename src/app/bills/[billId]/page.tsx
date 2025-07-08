'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Calendar, User, Users, Tag, AlertCircle, Loader2 } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillById, BillWithDetails, formatBillId, getBillStatusColor, getPolicyAreaColor } from '@/lib/bills'

export default function BillDetails() {
  const params = useParams()
  const router = useRouter()
  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBill = async () => {
      try {
        setLoading(true)
        if (params.billId) {
          const fetchedBill = await getBillById(params.billId as string)
          setBill(fetchedBill)
          if (!fetchedBill) {
            setError('Bill not found')
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
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
              <div className="flex items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Bill Not Found</h3>
                  <p className="text-red-600">The requested bill could not be found.</p>
                </div>
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
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {formatBillId(bill)}
            </Badge>
            <Badge 
              className={getPolicyAreaColor(bill.policy_area || '')}
              variant="secondary"
            >
              {bill.policy_area}
            </Badge>
          </div>
        </div>

        {/* Bill Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {bill.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Introduced: {formatDate(bill.introduced_date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{bill.sponsor_name} ({bill.sponsor_party}-{bill.sponsor_state})</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Bill Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Current Status</p>
                <Badge 
                  className={getBillStatusColor(bill)}
                  variant="secondary"
                >
                  In Committee
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Latest Action</p>
                <p className="text-sm text-gray-600">{formatDate(bill.latest_action_date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Origin Chamber</p>
                <p className="text-sm text-gray-600">{bill.origin_chamber}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Latest Action Details</p>
              <p className="text-sm text-gray-600">{bill.latest_action}</p>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {bill.bill_summaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

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
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Development Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Development Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-blue-700">
                <strong>Currently showing:</strong> Sample bill details for testing
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">✅ Implemented</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Complete bill information display</li>
                    <li>• Bill status and timeline</li>
                    <li>• Sponsor and subject details</li>
                    <li>• Full summary text</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">🔄 Coming Next</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Personalized impact analysis</li>
                    <li>• Bill full text viewer</li>
                    <li>• Sentiment feedback system</li>
                    <li>• Related bills suggestions</li>
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