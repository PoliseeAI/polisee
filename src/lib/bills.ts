// Bills service with mock data for testing
// Supabase integration is commented out and will be enabled once database types are updated

// Commented out Supabase integration (keep for future use)
// import { supabase } from '@/lib/supabase'
// import { Database } from '@/types/database'
// 
// type Bill = Database['public']['Tables']['bills']['Row']
// type BillSummary = Database['public']['Tables']['bill_summaries']['Row']
// type BillSubject = Database['public']['Tables']['bill_subjects']['Row']

// Temporary types for bills tables
export interface Bill {
  id: number
  bill_id: string
  congress: number
  type: string
  number: number
  title: string | null
  introduced_date: string | null
  latest_action_date: string | null
  latest_action: string | null
  sponsor_id: string | null
  sponsor_name: string | null
  sponsor_party: string | null
  sponsor_state: string | null
  is_active: boolean | null
  policy_area: string | null
  cboc_estimate_url: string | null
  constitutional_authority_text: string | null
  origin_chamber: string | null
  update_date: string | null
  created_at: string | null
  raw_data: any | null
}

export interface BillSummary {
  id: number
  bill_id: string
  version_code: string | null
  action_date: string | null
  action_desc: string | null
  update_date: string | null
  summary_text: string | null
  created_at: string | null
}

export interface BillSubject {
  id: number
  bill_id: string
  subject_name: string
  created_at: string | null
}

export interface BillWithDetails extends Bill {
  bill_summaries: BillSummary[]
  bill_subjects: BillSubject[]
}

// Mock sample bills data
const mockBills: BillWithDetails[] = [
  {
    id: 1,
    bill_id: 'hr2025-118',
    congress: 118,
    type: 'HR',
    number: 2025,
    title: 'Improving Education Through Technology Enhancement Act of 2025',
    introduced_date: '2025-01-15',
    latest_action_date: '2025-01-20',
    latest_action: 'Referred to House Committee on Education and the Workforce',
    sponsor_id: 'S000001',
    sponsor_name: 'Rep. Sarah Johnson',
    sponsor_party: 'D',
    sponsor_state: 'CA',
    is_active: true,
    policy_area: 'Education',
    cboc_estimate_url: null,
    constitutional_authority_text: null,
    origin_chamber: 'House',
    update_date: null,
    created_at: '2025-01-15T00:00:00Z',
    raw_data: null,
    bill_summaries: [{
      id: 1,
      bill_id: 'hr2025-118',
      version_code: 'IH',
      action_date: '2025-01-15',
      action_desc: 'Introduced in House',
      update_date: null,
      summary_text: 'This bill establishes a comprehensive program to modernize educational technology in K-12 schools across the United States. Key provisions include: (1) $5 billion in federal funding for school technology infrastructure upgrades, (2) mandatory digital literacy curriculum for all grade levels, (3) teacher training programs for technology integration, (4) expanded access to high-speed internet in rural school districts, and (5) cybersecurity requirements for educational technology systems. The bill also creates tax incentives for technology companies that donate equipment to schools and establishes a national database for sharing best practices in educational technology implementation.',
      created_at: '2025-01-15T00:00:00Z'
    }],
    bill_subjects: [
      { id: 1, bill_id: 'hr2025-118', subject_name: 'Education', created_at: '2025-01-15T00:00:00Z' },
      { id: 2, bill_id: 'hr2025-118', subject_name: 'Elementary and secondary education', created_at: '2025-01-15T00:00:00Z' },
      { id: 3, bill_id: 'hr2025-118', subject_name: 'Educational technology and distance education', created_at: '2025-01-15T00:00:00Z' }
    ]
  },
  {
    id: 2,
    bill_id: 'hr2100-118',
    congress: 118,
    type: 'HR',
    number: 2100,
    title: 'Small Business Tax Relief and Innovation Act of 2025',
    introduced_date: '2025-01-18',
    latest_action_date: '2025-01-22',
    latest_action: 'Referred to House Committee on Small Business',
    sponsor_id: 'S000002',
    sponsor_name: 'Rep. Michael Chen',
    sponsor_party: 'R',
    sponsor_state: 'TX',
    is_active: true,
    policy_area: 'Taxation',
    cboc_estimate_url: null,
    constitutional_authority_text: null,
    origin_chamber: 'House',
    update_date: null,
    created_at: '2025-01-18T00:00:00Z',
    raw_data: null,
    bill_summaries: [{
      id: 2,
      bill_id: 'hr2100-118',
      version_code: 'IH',
      action_date: '2025-01-18',
      action_desc: 'Introduced in House',
      update_date: null,
      summary_text: 'This legislation provides comprehensive tax relief and support for small businesses with fewer than 100 employees. Major components include: (1) Extension of Section 199A deduction for pass-through entities through 2030, (2) increase in startup deduction limits from $5,000 to $25,000, (3) simplified tax filing procedures for businesses with gross receipts under $1 million, (4) expansion of R&D tax credits for small businesses, (5) creation of small business innovation zones with reduced regulatory burden, and (6) establishment of a $2 billion loan guarantee program for minority-owned businesses.',
      created_at: '2025-01-18T00:00:00Z'
    }],
    bill_subjects: [
      { id: 4, bill_id: 'hr2100-118', subject_name: 'Taxation', created_at: '2025-01-18T00:00:00Z' },
      { id: 5, bill_id: 'hr2100-118', subject_name: 'Small business', created_at: '2025-01-18T00:00:00Z' },
      { id: 6, bill_id: 'hr2100-118', subject_name: 'Business investment and capital', created_at: '2025-01-18T00:00:00Z' }
    ]
  },
  {
    id: 3,
    bill_id: 'hr2200-118',
    congress: 118,
    type: 'HR',
    number: 2200,
    title: 'Medicare Prescription Drug Price Reduction Act of 2025',
    introduced_date: '2025-01-20',
    latest_action_date: '2025-01-25',
    latest_action: 'Referred to House Committee on Energy and Commerce',
    sponsor_id: 'S000003',
    sponsor_name: 'Rep. Linda Martinez',
    sponsor_party: 'D',
    sponsor_state: 'FL',
    is_active: true,
    policy_area: 'Health',
    cboc_estimate_url: null,
    constitutional_authority_text: null,
    origin_chamber: 'House',
    update_date: null,
    created_at: '2025-01-20T00:00:00Z',
    raw_data: null,
    bill_summaries: [{
      id: 3,
      bill_id: 'hr2200-118',
      version_code: 'IH',
      action_date: '2025-01-20',
      action_desc: 'Introduced in House',
      update_date: null,
      summary_text: 'This bill addresses prescription drug costs for Medicare beneficiaries through several mechanisms: (1) Allows Medicare to negotiate prices for up to 200 prescription drugs annually, (2) caps annual out-of-pocket prescription costs at $2,000 for Medicare Part D beneficiaries, (3) requires drug manufacturers to provide rebates when price increases exceed inflation, (4) expands access to generic drugs by limiting patent abuse, (5) creates a public option for prescription drug coverage, and (6) establishes transparency requirements for drug pricing.',
      created_at: '2025-01-20T00:00:00Z'
    }],
    bill_subjects: [
      { id: 7, bill_id: 'hr2200-118', subject_name: 'Health', created_at: '2025-01-20T00:00:00Z' },
      { id: 8, bill_id: 'hr2200-118', subject_name: 'Medicare', created_at: '2025-01-20T00:00:00Z' },
      { id: 9, bill_id: 'hr2200-118', subject_name: 'Prescription drugs', created_at: '2025-01-20T00:00:00Z' }
    ]
  },
  {
    id: 4,
    bill_id: 'hr2300-118',
    congress: 118,
    type: 'HR',
    number: 2300,
    title: 'Rural Broadband Infrastructure Investment Act of 2025',
    introduced_date: '2025-01-22',
    latest_action_date: '2025-01-27',
    latest_action: 'Referred to House Committee on Transportation and Infrastructure',
    sponsor_id: 'S000004',
    sponsor_name: 'Rep. David Wilson',
    sponsor_party: 'R',
    sponsor_state: 'MT',
    is_active: true,
    policy_area: 'Science, Technology, Communications',
    cboc_estimate_url: null,
    constitutional_authority_text: null,
    origin_chamber: 'House',
    update_date: null,
    created_at: '2025-01-22T00:00:00Z',
    raw_data: null,
    bill_summaries: [{
      id: 4,
      bill_id: 'hr2300-118',
      version_code: 'IH',
      action_date: '2025-01-22',
      action_desc: 'Introduced in House',
      update_date: null,
      summary_text: 'This legislation invests $15 billion in rural broadband infrastructure to address the digital divide in underserved communities. The bill includes: (1) grants for broadband infrastructure in areas with speeds below 25 Mbps, (2) low-interest loans for broadband cooperatives and municipal networks, (3) streamlined permitting for broadband projects on federal lands, (4) workforce development programs for broadband technicians, (5) subsidies for low-income households to access high-speed internet, and (6) requirements for broadband providers to offer affordable service plans.',
      created_at: '2025-01-22T00:00:00Z'
    }],
    bill_subjects: [
      { id: 10, bill_id: 'hr2300-118', subject_name: 'Science, Technology, Communications', created_at: '2025-01-22T00:00:00Z' },
      { id: 11, bill_id: 'hr2300-118', subject_name: 'Internet and video services', created_at: '2025-01-22T00:00:00Z' },
      { id: 12, bill_id: 'hr2300-118', subject_name: 'Rural conditions and development', created_at: '2025-01-22T00:00:00Z' }
    ]
  },
  {
    id: 5,
    bill_id: 'hr2400-118',
    congress: 118,
    type: 'HR',
    number: 2400,
    title: 'Clean Energy Jobs and Climate Resilience Act of 2025',
    introduced_date: '2025-01-25',
    latest_action_date: '2025-01-30',
    latest_action: 'Referred to House Committee on Natural Resources',
    sponsor_id: 'S000005',
    sponsor_name: 'Rep. Emma Thompson',
    sponsor_party: 'D',
    sponsor_state: 'WA',
    is_active: true,
    policy_area: 'Environmental Protection',
    cboc_estimate_url: null,
    constitutional_authority_text: null,
    origin_chamber: 'House',
    update_date: null,
    created_at: '2025-01-25T00:00:00Z',
    raw_data: null,
    bill_summaries: [{
      id: 5,
      bill_id: 'hr2400-118',
      version_code: 'IH',
      action_date: '2025-01-25',
      action_desc: 'Introduced in House',
      update_date: null,
      summary_text: 'This comprehensive climate legislation aims to achieve net-zero emissions by 2050 through clean energy investments and job creation. Key provisions include: (1) $100 billion in clean energy infrastructure grants, (2) extension and expansion of renewable energy tax credits, (3) creation of a civilian climate corps employing 300,000 workers, (4) investment in electric vehicle charging infrastructure, (5) energy efficiency standards for federal buildings, (6) support for communities transitioning from fossil fuel industries, and (7) environmental justice provisions ensuring 40% of benefits flow to disadvantaged communities.',
      created_at: '2025-01-25T00:00:00Z'
    }],
    bill_subjects: [
      { id: 13, bill_id: 'hr2400-118', subject_name: 'Environmental Protection', created_at: '2025-01-25T00:00:00Z' },
      { id: 14, bill_id: 'hr2400-118', subject_name: 'Climate change and greenhouse gases', created_at: '2025-01-25T00:00:00Z' },
      { id: 15, bill_id: 'hr2400-118', subject_name: 'Alternative and renewable resources', created_at: '2025-01-25T00:00:00Z' }
    ]
  },
  {
    id: 6,
    bill_id: 'hr2500-118',
    congress: 118,
    type: 'HR',
    number: 2500,
    title: 'Young Adult Economic Security Act of 2025',
    introduced_date: '2025-01-28',
    latest_action_date: '2025-02-02',
    latest_action: 'Referred to House Committee on Financial Services',
    sponsor_id: 'S000006',
    sponsor_name: 'Rep. Alexandria Martinez',
    sponsor_party: 'D',
    sponsor_state: 'CO',
    is_active: true,
    policy_area: 'Social Welfare',
    cboc_estimate_url: null,
    constitutional_authority_text: null,
    origin_chamber: 'House',
    update_date: null,
    created_at: '2025-01-28T00:00:00Z',
    raw_data: null,
    bill_summaries: [{
      id: 6,
      bill_id: 'hr2500-118',
      version_code: 'IH',
      action_date: '2025-01-28',
      action_desc: 'Introduced in House',
      update_date: null,
      summary_text: 'This comprehensive legislation addresses the economic challenges facing young adults aged 18-30. Key provisions include: (1) $15,000 annual student loan forgiveness for individuals earning under $50,000, (2) first-time homebuyer assistance program with up to $25,000 in down payment assistance, (3) expansion of Medicaid to cover all individuals under 26 regardless of state, (4) federal minimum wage increase to $18/hour, (5) $50 billion investment in public transportation in major cities, (6) expanded SNAP benefits for young adults without dependents, and (7) free community college tuition for students under 25. The bill also establishes young adult job training programs and provides mental health services specifically designed for this demographic.',
      created_at: '2025-01-28T00:00:00Z'
    }],
    bill_subjects: [
      { id: 16, bill_id: 'hr2500-118', subject_name: 'Social Welfare', created_at: '2025-01-28T00:00:00Z' },
      { id: 17, bill_id: 'hr2500-118', subject_name: 'Education', created_at: '2025-01-28T00:00:00Z' },
      { id: 18, bill_id: 'hr2500-118', subject_name: 'Housing and community development', created_at: '2025-01-28T00:00:00Z' },
      { id: 19, bill_id: 'hr2500-118', subject_name: 'Health', created_at: '2025-01-28T00:00:00Z' },
      { id: 20, bill_id: 'hr2500-118', subject_name: 'Labor and employment', created_at: '2025-01-28T00:00:00Z' },
      { id: 21, bill_id: 'hr2500-118', subject_name: 'Transportation and public works', created_at: '2025-01-28T00:00:00Z' }
    ]
  }
]

// Mock implementation for testing
export async function getBills(): Promise<BillWithDetails[]> {
  // Mock delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 500))
  return mockBills
}

export async function getBillById(billId: string): Promise<BillWithDetails | null> {
  // Mock delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockBills.find(bill => bill.bill_id === billId) || null
}

// Commented out Supabase implementation (keep for future use)
// export async function getBills(): Promise<BillWithDetails[]> {
//   const { data: bills, error } = await supabase
//     .from('bills')
//     .select(`
//       *,
//       bill_summaries(*),
//       bill_subjects(*)
//     `)
//     .eq('is_active', true)
//     .order('introduced_date', { ascending: false })
//   
//   if (error) {
//     console.error('Error fetching bills:', error)
//     throw error
//   }
//   
//   return bills || []
// }

// export async function getBillById(billId: string): Promise<BillWithDetails | null> {
//   const { data: bill, error } = await supabase
//     .from('bills')
//     .select(`
//       *,
//       bill_summaries(*),
//       bill_subjects(*)
//     `)
//     .eq('bill_id', billId)
//     .single()
//   
//   if (error) {
//     console.error('Error fetching bill:', error)
//     return null
//   }
//   
//   return bill
// }

export function formatBillTitle(bill: Bill): string {
  return `${bill.type} ${bill.number} - ${bill.title}`
}

export function formatBillId(bill: Bill): string {
  return `${bill.type.toUpperCase()} ${bill.number}`
}

export function getBillStatusColor(bill: Bill): string {
  if (bill.latest_action?.includes('Passed')) return 'bg-green-100 text-green-800'
  if (bill.latest_action?.includes('Committee')) return 'bg-yellow-100 text-yellow-800'
  if (bill.latest_action?.includes('Introduced')) return 'bg-blue-100 text-blue-800'
  return 'bg-gray-100 text-gray-800'
}

export function getPolicyAreaColor(policyArea: string): string {
  switch (policyArea) {
    case 'Education':
      return 'bg-blue-100 text-blue-800'
    case 'Taxation':
      return 'bg-green-100 text-green-800'
    case 'Health':
      return 'bg-red-100 text-red-800'
    case 'Science, Technology, Communications':
      return 'bg-purple-100 text-purple-800'
    case 'Environmental Protection':
      return 'bg-emerald-100 text-emerald-800'
    case 'Social Welfare':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
} 