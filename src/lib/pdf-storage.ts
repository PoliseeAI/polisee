import { supabase } from './supabase'
import { SourceReference } from '@/components/ui/source-citation'
import { BillSection } from '@/components/ui/pdf-viewer'
import { getTextAsPDFDataUrl } from '@/utils/text-to-pdf'
import { sourceReferenceService } from './source-references'
import { dataMigrationService } from './data-migration'

export interface BillPDF {
  id: string
  billId: string
  filename: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadStatus: 'pending' | 'uploaded' | 'processing' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
  publicUrl?: string
}

export interface PDFProcessingResult {
  success: boolean
  error?: string
  chunks?: any[]
  nodes?: any[]
}

class PDFStorageService {
  private bucketName = 'bill-pdfs'

  // Function to generate PDF from text file for One Big Beautiful Bill Act
  async generateBBBillPDF(): Promise<string> {
    try {
      // Load the text file
      const response = await fetch('/bbbsummary.txt')
      const text = await response.text()
      
      // Convert to PDF
      const pdfDataUrl = getTextAsPDFDataUrl(text, {
        fontSize: 11,
        lineHeight: 1.5,
        margins: { top: 25, bottom: 25, left: 20, right: 20 },
        pageSize: 'a4'
      })
      
      return pdfDataUrl
    } catch (error) {
      console.error('Error generating BBB PDF:', error)
      return ''
    }
  }

  // Mock data for testing until we create the bill_pdfs table
  private mockPDFs: { [billId: string]: BillPDF } = {
    'hr1-119': {
      id: '7',
      billId: 'hr1-119',
      filename: 'HR_1_One_Big_Beautiful_Bill_Act.pdf',
      filePath: 'bills/hr1-119/HR_1_One_Big_Beautiful_Bill_Act.pdf',
      fileSize: 1234567,
      mimeType: 'application/pdf',
      uploadStatus: 'completed',
      createdAt: '2025-01-03T00:00:00Z',
      updatedAt: '2025-01-03T00:00:00Z',
      publicUrl: 'GENERATED_FROM_TEXT' // Special flag to indicate this should be generated
    },
    'hr2025-118': {
      id: '1',
      billId: 'hr2025-118',
      filename: 'HR_2025_Education_Technology_Act.pdf',
      filePath: 'bills/hr2025-118/HR_2025_Education_Technology_Act.pdf',
      fileSize: 2456789,
      mimeType: 'application/pdf',
      uploadStatus: 'completed',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z',
      publicUrl: '/sample-bill.pdf' // This would be a real PDF in production
    },
    'hr2100-118': {
      id: '2',
      billId: 'hr2100-118',
      filename: 'HR_2100_Small_Business_Tax_Relief.pdf',
      filePath: 'bills/hr2100-118/HR_2100_Small_Business_Tax_Relief.pdf',
      fileSize: 1856234,
      mimeType: 'application/pdf',
      uploadStatus: 'completed',
      createdAt: '2025-01-20T00:00:00Z',
      updatedAt: '2025-01-20T00:00:00Z',
      publicUrl: '/sample-bill.pdf'
    }
  }

  async uploadBillPDF(billId: string, file: File): Promise<BillPDF | null> {
    try {
      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${billId}_${timestamp}.pdf`
      const filePath = `bills/${billId}/${filename}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath)

      // For now, return mock data since bill_pdfs table doesn't exist yet
      const billPDF: BillPDF = {
        id: timestamp.toString(),
        billId,
        filename: file.name,
        filePath: data.path,
        fileSize: file.size,
        mimeType: file.type,
        uploadStatus: 'uploaded',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publicUrl: publicUrlData.publicUrl
      }

      // Store in mock data
      this.mockPDFs[billId] = billPDF

      return billPDF
    } catch (error) {
      console.error('Error uploading PDF:', error)
      return null
    }
  }

  async getBillPDF(billId: string): Promise<BillPDF | null> {
    try {
      // Return from mock data for now
      return this.mockPDFs[billId] || null
    } catch (error) {
      console.error('Error fetching PDF:', error)
      return null
    }
  }

  async getBillPDFUrl(billId: string): Promise<string | null> {
    try {
      const billPDF = await this.getBillPDF(billId)
      if (!billPDF) return null

      // Special handling for BBB bill - generate PDF from text
      if (billPDF.publicUrl === 'GENERATED_FROM_TEXT') {
        return await this.generateBBBillPDF()
      }

      return billPDF.publicUrl || null
    } catch (error) {
      console.error('Error getting PDF URL:', error)
      return null
    }
  }

  async deleteBillPDF(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath])

      if (error) {
        throw error
      }

      // Remove from mock data
      const billId = Object.keys(this.mockPDFs).find(
        id => this.mockPDFs[id].filePath === filePath
      )
      if (billId) {
        delete this.mockPDFs[billId]
      }

      return true
    } catch (error) {
      console.error('Error deleting PDF:', error)
      return false
    }
  }

  async updateProcessingStatus(
    billId: string, 
    status: BillPDF['uploadStatus'],
    processingResult?: PDFProcessingResult
  ): Promise<boolean> {
    try {
      // Update mock data
      if (this.mockPDFs[billId]) {
        this.mockPDFs[billId].uploadStatus = status
        this.mockPDFs[billId].updatedAt = new Date().toISOString()
      }

      return true
    } catch (error) {
      console.error('Error updating processing status:', error)
      return false
    }
  }

  async listBillPDFs(): Promise<BillPDF[]> {
    try {
      // Return mock data
      return Object.values(this.mockPDFs)
    } catch (error) {
      console.error('Error listing PDFs:', error)
      return []
    }
  }

  // Generate mock bill sections for testing
  generateMockBillSections(billId: string): BillSection[] {
    // BBB Bill sections based on the actual content
    if (billId === 'hr1-119') {
      return [
        {
          id: 'TITLE.I',
          title: 'TITLE I--COMMITTEE ON AGRICULTURE',
          pageNumber: 1,
          level: 1,
          coordinates: { x: 10, y: 15, width: 80, height: 5 }
        },
        {
          id: 'SUBTITLE.A',
          title: 'Subtitle A--Nutrition',
          pageNumber: 1,
          level: 2,
          coordinates: { x: 15, y: 25, width: 75, height: 4 }
        },
        {
          id: 'SEC.10001',
          title: 'SNAP Thrifty Food Plan Restrictions',
          pageNumber: 2,
          level: 3,
          coordinates: { x: 20, y: 10, width: 70, height: 4 }
        },
        {
          id: 'SEC.10002',
          title: 'SNAP Work Requirements Expansion',
          pageNumber: 2,
          level: 3,
          coordinates: { x: 20, y: 20, width: 70, height: 4 }
        },
        {
          id: 'TITLE.II',
          title: 'TITLE II--COMMITTEE ON ARMED SERVICES',
          pageNumber: 3,
          level: 1,
          coordinates: { x: 10, y: 15, width: 80, height: 5 }
        },
        {
          id: 'SEC.20001',
          title: 'DEI Program Prohibition',
          pageNumber: 3,
          level: 2,
          coordinates: { x: 15, y: 25, width: 75, height: 4 }
        },
        {
          id: 'TITLE.III',
          title: 'TITLE III--COMMITTEE ON EDUCATION AND THE WORKFORCE',
          pageNumber: 4,
          level: 1,
          coordinates: { x: 10, y: 15, width: 80, height: 5 }
        },
        {
          id: 'TITLE.XII',
          title: 'TITLE XII--COMMITTEE ON WAYS AND MEANS',
          pageNumber: 5,
          level: 1,
          coordinates: { x: 10, y: 15, width: 80, height: 5 }
        },
        {
          id: 'SUBTITLE.A.TAX',
          title: 'Subtitle A--Extension of Expiring Tax Provisions',
          pageNumber: 5,
          level: 2,
          coordinates: { x: 15, y: 25, width: 75, height: 4 }
        },
        {
          id: 'SEC.111001',
          title: 'Research and Development Tax Credit Extension',
          pageNumber: 6,
          level: 3,
          coordinates: { x: 20, y: 10, width: 70, height: 4 }
        },
        {
          id: 'SUBTITLE.E',
          title: 'Subtitle E--Energy Tax Provisions',
          pageNumber: 7,
          level: 2,
          coordinates: { x: 15, y: 15, width: 75, height: 4 }
        },
        {
          id: 'SEC.112001',
          title: 'Electric Vehicle Tax Credit Termination',
          pageNumber: 7,
          level: 3,
          coordinates: { x: 20, y: 25, width: 70, height: 4 }
        },
        {
          id: 'SEC.112018',
          title: 'SALT Deduction Cap Increase',
          pageNumber: 8,
          level: 3,
          coordinates: { x: 20, y: 35, width: 70, height: 4 }
        },
        {
          id: 'SEC.113001',
          title: 'Debt Limit Increase',
          pageNumber: 9,
          level: 2,
          coordinates: { x: 15, y: 15, width: 75, height: 4 }
        }
      ]
    }

    // Default sections for other bills
    const mockSections: BillSection[] = [
      {
        id: 'SEC.1',
        title: 'Short Title',
        pageNumber: 1,
        level: 1,
        coordinates: { x: 10, y: 15, width: 80, height: 5 }
      },
      {
        id: 'SEC.2',
        title: 'Table of Contents',
        pageNumber: 1,
        level: 1,
        coordinates: { x: 10, y: 25, width: 80, height: 5 }
      },
      {
        id: 'SEC.101',
        title: 'Definitions',
        pageNumber: 2,
        level: 1,
        coordinates: { x: 10, y: 10, width: 80, height: 5 }
      },
      {
        id: 'SEC.101.a',
        title: 'Educational Technology',
        pageNumber: 2,
        level: 2,
        coordinates: { x: 15, y: 20, width: 75, height: 4 }
      },
      {
        id: 'SEC.101.b',
        title: 'Eligible Institution',
        pageNumber: 2,
        level: 2,
        coordinates: { x: 15, y: 30, width: 75, height: 4 }
      },
      {
        id: 'SEC.201',
        title: 'Authorization of Appropriations',
        pageNumber: 3,
        level: 1,
        coordinates: { x: 10, y: 10, width: 80, height: 5 }
      },
      {
        id: 'SEC.202',
        title: 'Grant Program Establishment',
        pageNumber: 3,
        level: 1,
        coordinates: { x: 10, y: 35, width: 80, height: 5 }
      },
      {
        id: 'SEC.202.a',
        title: 'Eligible Activities',
        pageNumber: 4,
        level: 2,
        coordinates: { x: 15, y: 10, width: 75, height: 4 }
      },
      {
        id: 'SEC.202.b',
        title: 'Application Requirements',
        pageNumber: 4,
        level: 2,
        coordinates: { x: 15, y: 25, width: 75, height: 4 }
      },
      {
        id: 'SEC.301',
        title: 'Reporting Requirements',
        pageNumber: 5,
        level: 1,
        coordinates: { x: 10, y: 10, width: 80, height: 5 }
      },
      {
        id: 'SEC.401',
        title: 'Effective Date',
        pageNumber: 5,
        level: 1,
        coordinates: { x: 10, y: 70, width: 80, height: 5 }
      }
    ]

    return mockSections
  }

  // Generate source references from database (with fallback to mock data)
  async generateSourceReferences(billId: string, pdfUrl: string): Promise<SourceReference[]> {
    try {
      // Try to get source references from database
      const dbReferences = await sourceReferenceService.getBillSourceReferences(billId)
      
      if (dbReferences.length > 0) {
        // Set PDF URL for each reference
        return dbReferences.map(ref => ({
          ...ref,
          pdfUrl
        }))
      }
      
      // If no database references found, check if we need to migrate BBB bill data
      if (billId === 'hr1-119') {
        const migrationStatus = await dataMigrationService.getMigrationStatus()
        if (migrationStatus.status === 'not_migrated') {
          console.log('BBB bill not found in database, running migration...')
          await dataMigrationService.migrateBBBBill()
          // Try again after migration
          const newDbReferences = await sourceReferenceService.getBillSourceReferences(billId)
          if (newDbReferences.length > 0) {
            return newDbReferences.map(ref => ({
              ...ref,
              pdfUrl
            }))
          }
        }
      }
      
      // Fallback to mock data if database is empty
      console.log(`No database references found for ${billId}, using mock data`)
      return this.generateMockSourceReferences(billId, pdfUrl)
    } catch (error) {
      console.error('Error generating source references:', error)
      return this.generateMockSourceReferences(billId, pdfUrl)
    }
  }

  // Keep mock data as fallback
  private generateMockSourceReferences(billId: string, pdfUrl: string): SourceReference[] {
    const mockSourcesByBill: { [key: string]: SourceReference[] } = {
      'hr1-119': [
        {
          billId,
          sectionId: 'SEC.10001',
          pageNumber: 2,
          text: 'This section prohibits USDA from increasing the cost of the Thrifty Food Plan (TFP) based on a reevaluation or update of the contents of the TFP.',
          contextBefore: 'Subtitle A--Nutrition',
          contextAfter: 'Further, any annual adjustment to the cost of the plan must be based on the Consumer Price Index for All Urban Consumers.',
          coordinates: { x: 15, y: 25, width: 70, height: 8 },
          sectionTitle: 'SNAP Thrifty Food Plan Restrictions',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.10002',
          pageNumber: 2,
          text: 'This section expands the applicability of work requirements for SNAP recipients who are able-bodied adults without dependents (ABAWDs).',
          contextBefore: 'SNAP Work Requirements Expansion',
          contextAfter: 'The section applies the work requirements for ABAWDs to adults who are not over 65 years old, whereas these requirements currently apply to adults who are not over 55 years old.',
          coordinates: { x: 15, y: 35, width: 70, height: 10 },
          sectionTitle: 'SNAP Work Requirements Expansion',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.10006',
          pageNumber: 2,
          text: 'Beginning in FY2028, any state that has a payment error rate that is less than 6% must contribute a 5% match for the cost of SNAP program allotments.',
          contextBefore: 'State-matching fund requirements for SNAP',
          contextAfter: 'A state with a payment error rate that is at least 6% but less than 8% must contribute 15%.',
          coordinates: { x: 15, y: 45, width: 70, height: 10 },
          sectionTitle: 'SNAP State Matching Requirements',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.20001',
          pageNumber: 3,
          text: 'This section prohibits DOD from using any funds to support or maintain any Diversity, Equity, and Inclusion (DEI) programs, policies, or activities.',
          contextBefore: 'TITLE II--COMMITTEE ON ARMED SERVICES',
          contextAfter: 'The section defines DEI programs as those that promote differential treatment of individuals based on race, color, religion, sex, national origin, age, or disability.',
          coordinates: { x: 15, y: 25, width: 70, height: 10 },
          sectionTitle: 'DEI Program Prohibition',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.30001',
          pageNumber: 4,
          text: 'This section prohibits the Department of Education from using any funds to support or maintain any Diversity, Equity, and Inclusion (DEI) programs, policies, or activities in educational institutions.',
          contextBefore: 'TITLE III--COMMITTEE ON EDUCATION AND THE WORKFORCE',
          contextAfter: 'This prohibition extends to all federally funded educational programs.',
          coordinates: { x: 15, y: 25, width: 70, height: 10 },
          sectionTitle: 'Education DEI Prohibition',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.111001',
          pageNumber: 6,
          text: 'This section extends the research and development tax credit through 2034.',
          contextBefore: 'Subtitle A--Extension of Expiring Tax Provisions',
          contextAfter: 'This extension provides crucial support for innovation and technological advancement.',
          coordinates: { x: 20, y: 15, width: 65, height: 8 },
          sectionTitle: 'Research and Development Tax Credit Extension',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.111101',
          pageNumber: 6,
          text: 'This section makes permanent the individual tax rate reductions from the Tax Cuts and Jobs Act.',
          contextBefore: 'Subtitle B--Tax Cuts and Jobs Act Provisions',
          contextAfter: 'This permanence provides long-term tax relief for American families.',
          coordinates: { x: 20, y: 25, width: 65, height: 8 },
          sectionTitle: 'Individual Tax Rate Reductions',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.111103',
          pageNumber: 6,
          text: 'This section makes permanent the increased child tax credit from the Tax Cuts and Jobs Act.',
          contextBefore: 'Child Tax Credit Permanence',
          contextAfter: 'This provides ongoing support for families with children.',
          coordinates: { x: 20, y: 35, width: 65, height: 8 },
          sectionTitle: 'Child Tax Credit Permanence',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.112001',
          pageNumber: 7,
          text: 'This section terminates the electric vehicle tax credit. Under current law, taxpayers may claim a tax credit of up to $7,500 for the purchase of a new electric vehicle before 2033.',
          contextBefore: 'Part 1--Termination of Credits',
          contextAfter: 'This termination affects federal incentives for electric vehicle adoption.',
          coordinates: { x: 20, y: 25, width: 65, height: 10 },
          sectionTitle: 'Electric Vehicle Tax Credit Termination',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.112002',
          pageNumber: 7,
          text: 'This section terminates the used electric vehicle tax credit. Under current law, taxpayers may claim a tax credit of up to $4,000 for the purchase of a used electric vehicle before 2033.',
          contextBefore: 'Used Electric Vehicle Credit Termination',
          contextAfter: 'This affects the secondary market for electric vehicles.',
          coordinates: { x: 20, y: 35, width: 65, height: 10 },
          sectionTitle: 'Used Electric Vehicle Credit Termination',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.112018',
          pageNumber: 8,
          text: 'This section increases the limitation on the federal tax deduction for state and local taxes (commonly known as the SALT deduction cap) to $40,400.',
          contextBefore: 'SALT Deduction Cap Modification',
          contextAfter: 'The SALT deduction cap is reduced for taxpayers with an adjusted gross income over $505,000.',
          coordinates: { x: 20, y: 25, width: 65, height: 10 },
          sectionTitle: 'SALT Deduction Cap Increase',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.112103',
          pageNumber: 8,
          text: 'This section limits Medicare benefits to U.S. citizens, nationals, lawfully admitted permanent residents, and certain other qualified individuals.',
          contextBefore: 'Medicare Eligibility Restrictions',
          contextAfter: 'The Social Security Administration must identify individuals who do not meet these requirements.',
          coordinates: { x: 20, y: 35, width: 65, height: 10 },
          sectionTitle: 'Medicare Eligibility Restrictions',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.112104',
          pageNumber: 8,
          text: 'This section establishes a 3.5% excise tax on transfers of payments from one country to another (also known as remittance transfers).',
          contextBefore: 'Remittance Tax Implementation',
          contextAfter: 'Some exceptions apply to this tax on international money transfers.',
          coordinates: { x: 20, y: 45, width: 65, height: 10 },
          sectionTitle: 'Remittance Tax Implementation',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.113001',
          pageNumber: 9,
          text: 'This section increases the statutory debt limit by $4 trillion. The debt limit is the amount of money that the Department of the Treasury may borrow to fund federal operations.',
          contextBefore: 'Subtitle D--Increase in Debt Limit',
          contextAfter: 'This increase is necessary to prevent potential default on federal obligations.',
          coordinates: { x: 15, y: 15, width: 70, height: 10 },
          sectionTitle: 'Debt Limit Increase',
          billTitle: 'One Big Beautiful Bill Act',
          pdfUrl
        }
      ],
      'hr2025-118': [
      {
        billId,
        sectionId: 'SEC.101',
        pageNumber: 1,
        text: 'This Act may be cited as the "Improving Education Through Technology Enhancement Act of 2025".',
        contextBefore: 'Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled, that',
        contextAfter: 'and shall take effect on the date of the enactment of this Act.',
          coordinates: { x: 10, y: 20, width: 80, height: 5 },
        sectionTitle: 'Short Title',
        billTitle: 'Improving Education Through Technology Enhancement Act of 2025',
        pdfUrl
      },
      {
        billId,
        sectionId: 'SEC.201',
        pageNumber: 3,
        text: 'There is authorized to be appropriated $5,000,000,000 for fiscal year 2025 to carry out the provisions of this Act.',
        contextBefore: 'Authorization of Appropriations.',
        contextAfter: 'Such sums shall remain available until expended.',
          coordinates: { x: 15, y: 35, width: 70, height: 8 },
        sectionTitle: 'Authorization of Appropriations',
          billTitle: 'Improving Education Through Technology Enhancement Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.202',
          pageNumber: 3,
          text: 'The Secretary shall establish a competitive grant program to provide grants to eligible local educational agencies to enable such agencies to improve student achievement through the use of technology.',
          contextBefore: 'Grant Program Establishment.',
          contextAfter: 'Grants under this section shall be used for activities described in subsection (b).',
          coordinates: { x: 10, y: 45, width: 80, height: 10 },
          sectionTitle: 'Grant Program Establishment',
          billTitle: 'Improving Education Through Technology Enhancement Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.203',
          pageNumber: 4,
          text: 'The Secretary shall give priority to applications from local educational agencies that serve rural areas, as defined by the Secretary.',
          contextBefore: 'Priority for Rural Areas.',
          contextAfter: 'Such priority shall be given to ensure equitable access to technology resources.',
          coordinates: { x: 10, y: 25, width: 80, height: 8 },
          sectionTitle: 'Priority for Rural Areas',
        billTitle: 'Improving Education Through Technology Enhancement Act of 2025',
        pdfUrl
      }
      ],
      'hr2100-118': [
        {
          billId,
          sectionId: 'SEC.101',
          pageNumber: 1,
          text: 'This Act may be cited as the "Small Business Tax Relief and Growth Act of 2025".',
          contextBefore: 'Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled, that',
          contextAfter: 'and shall take effect on January 1, 2026.',
          coordinates: { x: 10, y: 20, width: 80, height: 5 },
          sectionTitle: 'Short Title',
          billTitle: 'Small Business Tax Relief and Growth Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.201',
          pageNumber: 2,
          text: 'The deduction under section 199A of the Internal Revenue Code of 1986 is extended through December 31, 2030.',
          contextBefore: 'Extension of Section 199A Deduction.',
          contextAfter: 'This extension shall apply to taxable years beginning after December 31, 2025.',
          coordinates: { x: 10, y: 30, width: 80, height: 8 },
          sectionTitle: 'Extension of Section 199A Deduction',
          billTitle: 'Small Business Tax Relief and Growth Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.202',
          pageNumber: 2,
          text: 'The amount in paragraph (1) of section 195(b) of such Code is increased from $5,000 to $25,000.',
          contextBefore: 'Increase in Startup Deduction.',
          contextAfter: 'This increase shall apply to amounts paid or incurred after December 31, 2025.',
          coordinates: { x: 10, y: 50, width: 80, height: 8 },
          sectionTitle: 'Increase in Startup Deduction',
          billTitle: 'Small Business Tax Relief and Growth Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.301',
          pageNumber: 3,
          text: 'There is authorized to be appropriated $2,000,000,000 for the Small Business Administration loan guarantee program.',
          contextBefore: 'SBA Loan Guarantee Program.',
          contextAfter: 'Such amounts shall be available for fiscal years 2026 through 2030.',
          coordinates: { x: 10, y: 35, width: 80, height: 8 },
          sectionTitle: 'SBA Loan Guarantee Program',
          billTitle: 'Small Business Tax Relief and Growth Act of 2025',
          pdfUrl
        }
      ],
      'hr2200-118': [
        {
          billId,
          sectionId: 'SEC.101',
          pageNumber: 1,
          text: 'This Act may be cited as the "Medicare Prescription Drug Price Reform Act of 2025".',
          contextBefore: 'Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled, that',
          contextAfter: 'and shall take effect on January 1, 2026.',
          coordinates: { x: 10, y: 20, width: 80, height: 5 },
          sectionTitle: 'Short Title',
          billTitle: 'Medicare Prescription Drug Price Reform Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.201',
          pageNumber: 2,
          text: 'The annual out-of-pocket spending on prescription drugs under part D of title XVIII of the Social Security Act shall not exceed $2,000 for any beneficiary.',
          contextBefore: 'Out-of-Pocket Cap.',
          contextAfter: 'This cap shall be adjusted annually for inflation.',
          coordinates: { x: 10, y: 30, width: 80, height: 10 },
          sectionTitle: 'Out-of-Pocket Cap',
          billTitle: 'Medicare Prescription Drug Price Reform Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.202',
          pageNumber: 3,
          text: 'The Secretary shall negotiate prices for prescription drugs covered under part D, with authority to negotiate prices for up to 200 drugs annually.',
          contextBefore: 'Drug Price Negotiation.',
          contextAfter: 'Priority shall be given to drugs with the highest Medicare expenditures.',
          coordinates: { x: 10, y: 25, width: 80, height: 10 },
          sectionTitle: 'Drug Price Negotiation',
          billTitle: 'Medicare Prescription Drug Price Reform Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.203',
          pageNumber: 3,
          text: 'Coverage under part D shall be expanded to include comprehensive dental, vision, and hearing services.',
          contextBefore: 'Expanded Coverage.',
          contextAfter: 'Such coverage shall be subject to appropriate cost-sharing requirements.',
          coordinates: { x: 10, y: 45, width: 80, height: 8 },
          sectionTitle: 'Expanded Coverage',
          billTitle: 'Medicare Prescription Drug Price Reform Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.204',
          pageNumber: 4,
          text: 'The eligibility age for Medicare shall be lowered to 60 years for individuals who meet specified income and employment criteria.',
          contextBefore: 'Lowered Eligibility Age.',
          contextAfter: 'The Secretary shall establish regulations for qualifying criteria within 180 days.',
          coordinates: { x: 10, y: 20, width: 80, height: 10 },
          sectionTitle: 'Lowered Eligibility Age',
          billTitle: 'Medicare Prescription Drug Price Reform Act of 2025',
          pdfUrl
        }
      ],
      'hr2500-118': [
        {
          billId,
          sectionId: 'SEC.101',
          pageNumber: 1,
          text: 'This Act may be cited as the "Young Adult Economic Security Act of 2025".',
          contextBefore: 'Be it enacted by the Senate and House of Representatives of the United States of America in Congress assembled, that',
          contextAfter: 'and shall take effect on July 1, 2025.',
          coordinates: { x: 10, y: 20, width: 80, height: 5 },
          sectionTitle: 'Short Title',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.201',
          pageNumber: 2,
          text: 'The minimum wage under section 6(a)(1) of the Fair Labor Standards Act of 1938 is increased to $18 per hour.',
          contextBefore: 'Minimum Wage Increase.',
          contextAfter: 'This increase shall be effective 90 days after the date of enactment.',
          coordinates: { x: 10, y: 25, width: 80, height: 8 },
          sectionTitle: 'Minimum Wage Increase',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.301',
          pageNumber: 3,
          text: 'The Secretary of Education shall cancel $15,000 of outstanding Federal student loan debt annually for borrowers earning less than $50,000.',
          contextBefore: 'Student Loan Forgiveness.',
          contextAfter: 'Such forgiveness shall continue for up to 10 years per eligible borrower.',
          coordinates: { x: 10, y: 30, width: 80, height: 10 },
          sectionTitle: 'Student Loan Forgiveness',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.302',
          pageNumber: 3,
          text: 'Community college tuition shall be provided at no cost to students under the age of 25.',
          contextBefore: 'Free Community College.',
          contextAfter: 'The Secretary shall establish a grant program to reimburse institutions.',
          coordinates: { x: 10, y: 50, width: 80, height: 8 },
          sectionTitle: 'Free Community College',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.401',
          pageNumber: 4,
          text: 'Medicaid coverage shall be extended to all individuals under the age of 26, regardless of income or family status.',
          contextBefore: 'Extended Medicaid Coverage.',
          contextAfter: 'States shall receive enhanced federal matching funds for such coverage.',
          coordinates: { x: 10, y: 25, width: 80, height: 10 },
          sectionTitle: 'Extended Medicaid Coverage',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.501',
          pageNumber: 5,
          text: 'First-time homebuyers under the age of 35 shall be eligible for down payment assistance up to $25,000.',
          contextBefore: 'First-Time Homebuyer Assistance.',
          contextAfter: 'Such assistance shall be provided through grants, not loans.',
          coordinates: { x: 10, y: 35, width: 80, height: 8 },
          sectionTitle: 'First-Time Homebuyer Assistance',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.502',
          pageNumber: 5,
          text: 'There is authorized to be appropriated $50,000,000,000 for public transportation infrastructure in metropolitan areas.',
          contextBefore: 'Public Transportation Investment.',
          contextAfter: 'Priority shall be given to projects that create jobs for young adults.',
          coordinates: { x: 10, y: 55, width: 80, height: 8 },
          sectionTitle: 'Public Transportation Investment',
          billTitle: 'Young Adult Economic Security Act of 2025',
          pdfUrl
        },
        {
          billId,
          sectionId: 'SEC.601',
          pageNumber: 6,
          text: 'Individuals under the age of 25 without dependents shall be eligible for expanded SNAP benefits.',
          contextBefore: 'Expanded SNAP Benefits.',
          contextAfter: 'Such benefits shall include additional nutrition education programs.',
          coordinates: { x: 10, y: 20, width: 80, height: 8 },
          sectionTitle: 'Expanded SNAP Benefits',
          billTitle: 'Young Adult Economic Security Act of 2025',
        pdfUrl
      }
    ]
    }

    return mockSourcesByBill[billId] || []
  }
}

export const pdfStorageService = new PDFStorageService()

// Helper function to get PDF URL for a bill
export async function getBillPDFUrl(billId: string): Promise<string | null> {
  return await pdfStorageService.getBillPDFUrl(billId)
}

// Helper function to get source references for a bill
export async function getBillSourceReferences(billId: string): Promise<SourceReference[]> {
  const pdfUrl = await getBillPDFUrl(billId)
  if (!pdfUrl) return []

  // Use the new database-driven source references
  return await pdfStorageService.generateSourceReferences(billId, pdfUrl)
}

// Helper function to get bill sections for navigation
export async function getBillSections(billId: string): Promise<BillSection[]> {
  // For now, return mock data
  // In a real implementation, this would query the RAG database for bill structure
  return pdfStorageService.generateMockBillSections(billId)
} 