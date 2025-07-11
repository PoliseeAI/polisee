'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar, User, AlertCircle, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillsWithFilters, getBillFilterOptions, BillWithDetails, formatBillId, getBillStatusColor, getPolicyAreaColor } from '@/lib/bills'
import { BillFiltersComponent } from '@/components/bills/BillFilters'
import { BillFilters } from '@/types/bills-filter'

export default function Bills() {
  const [bills, setBills] = useState<BillWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState({
    policyAreas: [] as string[],
    subjects: [] as string[],
    congresses: [] as number[]
  })
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // Initialize filters
  const [filters, setFilters] = useState<BillFilters>({
    sortBy: 'introducedDate',
    sortOrder: 'desc'
  })

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      const options = await getBillFilterOptions()
      setFilterOptions(options)
    }
    loadFilterOptions()
  }, [])

  // Fetch bills when filters change
  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true)
        const fetchedBills = await getBillsWithFilters(filters)
        setBills(fetchedBills)
      } catch (err) {
        setError('Failed to fetch bills')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBills()
  }, [filters])

  const handleFiltersChange = (newFilters: BillFilters) => {
    setFilters(newFilters)
  }

  const clearFilters = () => {
    setFilters({
      sortBy: 'introducedDate',
      sortOrder: 'desc'
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString()
  }

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'sortBy' || key === 'sortOrder') return false
    return value !== undefined && value !== '' && 
           (!Array.isArray(value) || value.length > 0)
  })

  return (
    <AuthGuard>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile filter button */}
        <div className="lg:hidden">
          <Button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            variant="outline"
            className="w-full mb-4"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters Sidebar */}
        <aside className={`lg:w-80 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
          <BillFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            availablePolicyAreas={filterOptions.policyAreas}
            availableSubjects={filterOptions.subjects}
            availableCongresses={filterOptions.congresses}
            onClearFilters={clearFilters}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Legislative Bills</h1>
                <p className="text-gray-600">Browse and analyze bills from Congress</p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {loading ? 'Loading...' : `${bills.length} bills found`}
              </Badge>
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

            {!loading && !error && bills.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bills found</h3>
                    <p className="text-gray-600 mb-4">
                      {hasActiveFilters 
                        ? 'No bills match your current filters. Try adjusting your search criteria.' 
                        : 'No bills available at this time.'
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

            {!loading && !error && bills.length > 0 && (
              <div className="grid gap-6">
                {bills.map((bill) => (
                  <Card key={bill.bill_id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="font-mono">
                              {formatBillId(bill)}
                            </Badge>
                            {bill.policy_area && (
                              <Badge 
                                className={`${getPolicyAreaColor(bill.policy_area)}`}
                                variant="secondary"
                              >
                                {bill.policy_area}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {bill.congress}th Congress
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
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
} 