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
  const [selectedPolicyArea, setSelectedPolicyArea] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true)
        const fetchedBills = await getBills()
        console.log('Fetched bills:', fetchedBills)
        console.log('First bill policy area:', fetchedBills[0]?.policy_area)
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

  const filteredBills = bills.filter(bill => {
    // Text search filter
    const matchesSearch = !searchTerm || 
      bill.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.policy_area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.sponsor_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Policy area filter
    const matchesPolicyArea = !selectedPolicyArea || 
      (selectedPolicyArea === 'Uncategorized' && !bill.policy_area) ||
      (bill.policy_area && bill.policy_area === selectedPolicyArea)
    
    // Subject filter
    const matchesSubject = !selectedSubject || 
      bill.bill_subjects.some(subject => subject.subject_name === selectedSubject)
    
    return matchesSearch && matchesPolicyArea && matchesSubject
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    
    // Parse the date string correctly to avoid timezone issues
    // The database stores dates as YYYY-MM-DD format
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    
    return date.toLocaleDateString()
  }

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const handlePolicyAreaClick = (policyArea: string) => {
    setSelectedPolicyArea(selectedPolicyArea === policyArea ? null : policyArea)
  }

  const handleSubjectClick = (subject: string) => {
    setSelectedSubject(selectedSubject === subject ? null : subject)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedPolicyArea(null)
    setSelectedSubject(null)
  }

  const hasActiveFilters = searchTerm || selectedPolicyArea || selectedSubject

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
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-800"
              >
                <Filter className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bills found</h3>
                <p className="text-gray-600 mb-4">
                  {hasActiveFilters 
                    ? 'No bills match your current filters. Try adjusting your search or clearing filters.' 
                    : 'No bills found matching your search.'
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && filteredBills.length > 0 && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600">
                  Showing {filteredBills.length} of {bills.length} bills
                </p>
                {hasActiveFilters && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Filters:</span>
                    {selectedPolicyArea && (
                      <Badge 
                        variant="secondary" 
                        className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                        onClick={() => setSelectedPolicyArea(null)}
                      >
                        {selectedPolicyArea} ×
                      </Badge>
                    )}
                    {selectedSubject && (
                      <Badge 
                        variant="secondary" 
                        className="bg-purple-100 text-purple-800 cursor-pointer hover:bg-purple-200"
                        onClick={() => setSelectedSubject(null)}
                      >
                        {selectedSubject} ×
                      </Badge>
                    )}
                  </div>
                )}
              </div>
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
                          {bill.policy_area ? (
                            <Badge 
                              className={`${getPolicyAreaColor(bill.policy_area)} cursor-pointer hover:opacity-80 transition-opacity ${
                                selectedPolicyArea === bill.policy_area ? 'ring-2 ring-blue-500' : ''
                              }`}
                              variant="secondary"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (bill.policy_area) handlePolicyAreaClick(bill.policy_area)
                              }}
                            >
                              {bill.policy_area}
                            </Badge>
                          ) : (
                            <Badge 
                              className="bg-gray-100 text-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                              variant="secondary"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handlePolicyAreaClick('Uncategorized')
                              }}
                            >
                              Uncategorized
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">
                          {bill.title}
                        </CardTitle>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        <Badge 
                          className={getBillStatusColor(bill)}
                          variant="secondary"
                          title={bill.latest_action || 'Status Unknown'}
                        >
                          {truncateText(bill.latest_action, 30) || 'Status Unknown'}
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
                                className={`text-xs cursor-pointer hover:bg-gray-100 transition-colors ${
                                  selectedSubject === subject.subject_name ? 'ring-2 ring-purple-500 bg-purple-50' : ''
                                }`}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleSubjectClick(subject.subject_name)
                                }}
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

                      <div className="space-y-2 pt-4">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Latest Action:</span> {bill.latest_action || 'No action recorded'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Action Date: {formatDate(bill.latest_action_date)}
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
      </div>
    </AuthGuard>
  )
} 