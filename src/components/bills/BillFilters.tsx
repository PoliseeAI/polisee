'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from 'lucide-react'
import { 
  BillFilters, 
  BILL_STATUS_OPTIONS, 
  BILL_TYPE_OPTIONS, 
  PARTY_OPTIONS, 
  STATE_OPTIONS 
} from '@/types/bills-filter'

interface BillFiltersProps {
  filters: BillFilters
  onFiltersChange: (filters: BillFilters) => void
  availablePolicyAreas: string[]
  availableSubjects: string[]
  availableCongresses: number[]
  onClearFilters: () => void
}

export function BillFiltersComponent({
  filters,
  onFiltersChange,
  availablePolicyAreas,
  availableSubjects,
  availableCongresses,
  onClearFilters
}: BillFiltersProps) {
  const [openSections, setOpenSections] = useState<string[]>(['search'])

  const updateFilter = (key: keyof BillFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (key: keyof BillFilters, value: string) => {
    const currentValues = (filters[key] as string[]) || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    updateFilter(key, newValues.length > 0 ? newValues : undefined)
  }

  const getActiveFilterCount = () => {
    let count = 0
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && 
          (!Array.isArray(value) || value.length > 0) &&
          key !== 'sortBy' && key !== 'sortOrder' && key !== 'page' && key !== 'limit') {
        count++
      }
    })
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card className="sticky top-4 max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-6 flex-shrink-0 border-b">
        <CardTitle className="text-lg">Filters</CardTitle>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{activeFilterCount} active</Badge>
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Clear all
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="overflow-y-auto flex-1 p-4">
        <Accordion 
          type="multiple" 
          value={openSections}
          onValueChange={setOpenSections}
          className="w-full space-y-1"
        >
          {/* Search & Text Filters */}
          <AccordionItem value="search" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 text-sm font-medium">
              Search & Text
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-3">
              <div>
                <Label htmlFor="search-term" className="text-xs">Search Term</Label>
                <Input
                  id="search-term"
                  type="text"
                  placeholder="Search bills..."
                  value={filters.searchTerm || ''}
                  onChange={(e) => updateFilter('searchTerm', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="search-type" className="text-xs">Search In</Label>
                <Select
                  value={filters.searchType || 'all'}
                  onValueChange={(value) => updateFilter('searchType', value)}
                >
                  <SelectTrigger id="search-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="title">Title Only</SelectItem>
                    <SelectItem value="fullText">Full Text</SelectItem>
                    <SelectItem value="billNumber">Bill Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Date Range Filters */}
          <AccordionItem value="dates" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 text-sm font-medium">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Ranges
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-4">
              <div>
                <Label className="text-xs font-medium">Introduced Date</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={filters.introducedDateFrom || ''}
                    onChange={(e) => updateFilter('introducedDateFrom', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.introducedDateTo || ''}
                    onChange={(e) => updateFilter('introducedDateTo', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Last Action Date</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={filters.lastActionDateFrom || ''}
                    onChange={(e) => updateFilter('lastActionDateFrom', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.lastActionDateTo || ''}
                    onChange={(e) => updateFilter('lastActionDateTo', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Bill Type & Status */}
          <AccordionItem value="type-status" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 text-sm font-medium">
              Bill Type & Status
              {(filters.billTypes?.length || filters.status?.length || filters.congress?.length) ? (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {(filters.billTypes?.length || 0) + (filters.status?.length || 0) + (filters.congress?.length || 0)}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Bill Types */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Bill Type</Label>
                  <div className="space-y-2">
                    {BILL_TYPE_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bill-type-${option.value}`}
                          checked={filters.billTypes?.includes(option.value) || false}
                          onCheckedChange={() => toggleArrayFilter('billTypes', option.value)}
                        />
                        <Label
                          htmlFor={`bill-type-${option.value}`}
                          className="text-xs cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Status</Label>
                  <div className="space-y-2">
                    {BILL_STATUS_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={filters.status?.includes(option.value) || false}
                          onCheckedChange={() => toggleArrayFilter('status', option.value)}
                        />
                        <Label
                          htmlFor={`status-${option.value}`}
                          className="text-xs cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Congress */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Congress</Label>
                  <div className="space-y-2">
                    {availableCongresses.map(congress => (
                      <div key={congress} className="flex items-center space-x-2">
                        <Checkbox
                          id={`congress-${congress}`}
                          checked={filters.congress?.includes(congress) || false}
                          onCheckedChange={() => {
                            const current = filters.congress || []
                            const newValue = current.includes(congress)
                              ? current.filter(c => c !== congress)
                              : [...current, congress]
                            updateFilter('congress', newValue.length > 0 ? newValue : undefined)
                          }}
                        />
                        <Label
                          htmlFor={`congress-${congress}`}
                          className="text-xs cursor-pointer"
                        >
                          {congress}th Congress
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chamber */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Chamber</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="chamber-house"
                        checked={filters.chamber?.includes('House') || false}
                        onCheckedChange={() => {
                          const current = filters.chamber || []
                          const newValue = current.includes('House')
                            ? current.filter(c => c !== 'House')
                            : [...current, 'House' as const]
                          updateFilter('chamber', newValue.length > 0 ? newValue : undefined)
                        }}
                      />
                      <Label htmlFor="chamber-house" className="text-xs cursor-pointer">
                        House
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="chamber-senate"
                        checked={filters.chamber?.includes('Senate') || false}
                        onCheckedChange={() => {
                          const current = filters.chamber || []
                          const newValue = current.includes('Senate')
                            ? current.filter(c => c !== 'Senate')
                            : [...current, 'Senate' as const]
                          updateFilter('chamber', newValue.length > 0 ? newValue : undefined)
                        }}
                      />
                      <Label htmlFor="chamber-senate" className="text-xs cursor-pointer">
                        Senate
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sponsor Filters */}
          <AccordionItem value="sponsor" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 text-sm font-medium">
              Sponsor Details
              {(filters.sponsorParty?.length || filters.sponsorState?.length || filters.sponsorName) ? (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {(filters.sponsorParty?.length || 0) + (filters.sponsorState?.length || 0) + (filters.sponsorName ? 1 : 0)}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-4">
              {/* Sponsor Name */}
              <div>
                <Label htmlFor="sponsor-name" className="text-xs">Sponsor Name</Label>
                <Input
                  id="sponsor-name"
                  type="text"
                  placeholder="Search sponsor..."
                  value={filters.sponsorName || ''}
                  onChange={(e) => updateFilter('sponsorName', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Party */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Party</Label>
                <div className="space-y-2">
                  {PARTY_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`party-${option.value}`}
                        checked={filters.sponsorParty?.includes(option.value) || false}
                        onCheckedChange={() => toggleArrayFilter('sponsorParty', option.value)}
                      />
                      <Label
                        htmlFor={`party-${option.value}`}
                        className="text-xs cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* State */}
              <div>
                <Label htmlFor="sponsor-state" className="text-xs">State</Label>
                <Select
                  value={filters.sponsorState?.[0] || 'all'}
                  onValueChange={(value) => updateFilter('sponsorState', value === 'all' ? undefined : [value])}
                >
                  <SelectTrigger id="sponsor-state" className="mt-1">
                    <SelectValue placeholder="Select state..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {STATE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Policy & Subject Filters */}
          <AccordionItem value="policy-subject" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 text-sm font-medium">
              Policy Areas & Subjects
              {(filters.policyAreas?.length || filters.subjects?.length) ? (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {(filters.policyAreas?.length || 0) + (filters.subjects?.length || 0)}
                </Badge>
              ) : null}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* Policy Areas */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Policy Areas</Label>
                  <div className="space-y-2">
                    {availablePolicyAreas.map(area => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={`policy-${area}`}
                          checked={filters.policyAreas?.includes(area) || false}
                          onCheckedChange={() => toggleArrayFilter('policyAreas', area)}
                        />
                        <Label
                          htmlFor={`policy-${area}`}
                          className="text-xs cursor-pointer"
                        >
                          {area}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subjects */}
                {availableSubjects.length > 0 && (
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Subjects</Label>
                    <div className="space-y-2">
                      {availableSubjects.slice(0, 20).map(subject => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject}`}
                            checked={filters.subjects?.includes(subject) || false}
                            onCheckedChange={() => toggleArrayFilter('subjects', subject)}
                          />
                          <Label
                            htmlFor={`subject-${subject}`}
                            className="text-xs cursor-pointer"
                          >
                            {subject}
                          </Label>
                        </div>
                      ))}
                      {availableSubjects.length > 20 && (
                        <p className="text-xs text-gray-500 italic">
                          +{availableSubjects.length - 20} more subjects
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sort Options */}
          <AccordionItem value="sort" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 text-sm font-medium">
              Sort Options
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-3">
              <div>
                <Label htmlFor="sort-by" className="text-xs">Sort By</Label>
                <Select
                  value={filters.sortBy || 'introducedDate'}
                  onValueChange={(value) => updateFilter('sortBy', value)}
                >
                  <SelectTrigger id="sort-by" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="introducedDate">Introduced Date</SelectItem>
                    <SelectItem value="lastActionDate">Last Action Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="relevance">Relevance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sort-order" className="text-xs">Order</Label>
                <Select
                  value={filters.sortOrder || 'desc'}
                  onValueChange={(value) => updateFilter('sortOrder', value)}
                >
                  <SelectTrigger id="sort-order" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
} 