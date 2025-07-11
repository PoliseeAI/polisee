export interface BillFilters {
  // Text search filters
  searchTerm?: string
  searchType?: 'title' | 'fullText' | 'billNumber' | 'all'
  
  // Date range filters
  introducedDateFrom?: string
  introducedDateTo?: string
  lastActionDateFrom?: string
  lastActionDateTo?: string
  
  // Bill type and status
  billTypes?: string[] // ['HR', 'S', 'HJRES', 'SJRES', etc.]
  congress?: number[]
  chamber?: ('House' | 'Senate')[]
  status?: string[] // Based on latest action keywords
  
  // Sponsor filters
  sponsorParty?: string[] // ['D', 'R', 'I']
  sponsorState?: string[]
  sponsorName?: string
  
  // Policy and subject filters
  policyAreas?: string[]
  subjects?: string[]
  
  // Pagination and sorting
  sortBy?: 'introducedDate' | 'lastActionDate' | 'title' | 'relevance'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterGroup {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'daterange' | 'text' | 'number'
  options?: FilterOption[]
}

// Bill status categories based on common action patterns
export const BILL_STATUS_OPTIONS: FilterOption[] = [
  { value: 'introduced', label: 'Introduced' },
  { value: 'committee', label: 'In Committee' },
  { value: 'passed_house', label: 'Passed House' },
  { value: 'passed_senate', label: 'Passed Senate' },
  { value: 'passed_both', label: 'Passed Both Chambers' },
  { value: 'enacted', label: 'Enacted/Signed' },
  { value: 'vetoed', label: 'Vetoed' },
]

export const BILL_TYPE_OPTIONS: FilterOption[] = [
  { value: 'HR', label: 'House Bill (H.R.)' },
  { value: 'S', label: 'Senate Bill (S.)' },
  { value: 'HJRES', label: 'House Joint Resolution' },
  { value: 'SJRES', label: 'Senate Joint Resolution' },
  { value: 'HCONRES', label: 'House Concurrent Resolution' },
  { value: 'SCONRES', label: 'Senate Concurrent Resolution' },
  { value: 'HRES', label: 'House Resolution' },
  { value: 'SRES', label: 'Senate Resolution' },
]

export const PARTY_OPTIONS: FilterOption[] = [
  { value: 'D', label: 'Democrat' },
  { value: 'R', label: 'Republican' },
  { value: 'I', label: 'Independent' },
]

// US State abbreviations
export const STATE_OPTIONS: FilterOption[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
] 