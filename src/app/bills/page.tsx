'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, User, AlertCircle, Search, Filter, Loader2 } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBills, BillWithDetails, formatBillId, getBillStatusColor, getPolicyAreaColor } from '@/lib/bills'

export default function Bills() {
  const [bills, setBills] = useState<BillWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true)
        const fetchedBills = await getBills()
        setBills(fetchedBills)
      } catch (err) {
        setError('Failed to fetch bills')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBills()
  }, [])

  const filteredBills = bills.filter(bill => 
    bill.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.policy_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.sponsor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Available Bills</h1>
            <p className="text-gray-600">Browse legislative bills and their summaries</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search bills..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading bills...</span>
          </div>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredBills.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No bills found matching your search.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredBills.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredBills.length} of {bills.length} bills
              </p>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Sample Data
              </Badge>
            </div>

            <div className="grid gap-6">
              {filteredBills.map((bill) => (
                <Card key={bill.bill_id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
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
                        <CardTitle className="text-lg leading-tight">
                          {bill.title}
                        </CardTitle>
                      </div>
                                             <div className="flex flex-col sm:items-end gap-2">
                         <Badge 
                           className={getBillStatusColor(bill)}
                           variant="secondary"
                         >
                           In Committee
                         </Badge>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(bill.introduced_date)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          {bill.sponsor_name} ({bill.sponsor_party}-{bill.sponsor_state})
                        </span>
                      </div>

                      {bill.bill_summaries.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {truncateText(bill.bill_summaries[0].summary_text, 300)}
                          </p>
                        </div>
                      )}

                      {bill.bill_subjects.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Subjects</h4>
                          <div className="flex flex-wrap gap-2">
                            {bill.bill_subjects.slice(0, 3).map((subject) => (
                              <Badge 
                                key={subject.id} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {subject.subject_name}
                              </Badge>
                            ))}
                            {bill.bill_subjects.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{bill.bill_subjects.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                                             <div className="flex items-center justify-between pt-4">
                         <div className="text-sm text-gray-500">
                           Latest Action: {formatDate(bill.latest_action_date)}
                         </div>
                         <div className="flex gap-2">
                           <Button variant="outline" size="sm" asChild>
                             <Link href={`/bills/${bill.bill_id}`}>
                               View Details
                             </Link>
                           </Button>
                           <Button size="sm" asChild>
                             <Link href={`/bills/${bill.bill_id}/analysis`}>
                               Get Analysis
                             </Link>
                           </Button>
                         </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Development Info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Development Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-blue-700">
                <strong>Currently showing:</strong> Sample bill data for testing and development
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">✅ Implemented</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Bill listing and search</li>
                    <li>• Bill summaries and subjects</li>
                    <li>• Policy area categorization</li>
                    <li>• Sponsor information</li>
                    <li>• Mock data for testing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">🔄 Coming Next</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Real Supabase data integration</li>
                    <li>• Personalized impact analysis</li>
                    <li>• Bill details page</li>
                    <li>• Sentiment feedback system</li>
                    <li>• Advanced filtering options</li>
                  </ul>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/persona/create">
                      Create Persona for Analysis
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/analyze">
                      Back to Analyze
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 