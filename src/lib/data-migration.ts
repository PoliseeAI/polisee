import { supabase } from './supabase'
import { Tables } from '@/types/database'

// Sample BBB bill data for migration
const BBB_BILL_DATA = {
  bill_id: 'hr1-119',
  congress: 119,
  type: 'HR',
  number: 1,
  title: 'One Big Beautiful Bill Act',
  introduced_date: '2025-01-03',
  latest_action_date: '2025-01-10',
  latest_action: 'Referred to House Committee on Budget',
  sponsor_id: 'S000007',
  sponsor_name: 'Rep. John Speaker',
  sponsor_party: 'R',
  sponsor_state: 'TX',
  is_active: true,
  policy_area: 'Economics and Public Finance',
  origin_chamber: 'House',
}

// Sample bill nodes structure
const BBB_BILL_NODES = [
  {
    level: 'TITLE',
    heading: 'One Big Beautiful Bill Act',
    full_path: 'One Big Beautiful Bill Act',
    node_text: 'This Act may be cited as the "One Big Beautiful Bill Act".'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10001. SNAP WORK REQUIREMENTS',
    full_path: 'TITLE I > SEC. 10001',
    node_text: 'This section prohibits USDA from increasing the cost of the Thrifty Food Plan (TFP) based on a reevaluation or update of the contents of the TFP. Further, any annual adjustment to the cost of the plan must be based on the Consumer Price Index for All Urban Consumers.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10002. FISCAL RESPONSIBILITY',
    full_path: 'TITLE I > SEC. 10002',
    node_text: 'Federal debt limit increased by $4 trillion. This represents a massive increase in national debt that will burden future generations with unprecedented fiscal obligations.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10003. TAX RELIEF',
    full_path: 'TITLE I > SEC. 10003',
    node_text: 'Individual income tax rates reduced across all brackets. Standard deduction increased. Child tax credit made permanent. Research and development tax credit extended for businesses.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10004. ENERGY PROVISIONS',
    full_path: 'TITLE I > SEC. 10004',
    node_text: 'Terminates various clean energy tax credits including solar, wind, and electric vehicle credits. Increases domestic oil and gas production incentives.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10005. HEALTHCARE MODIFICATIONS',
    full_path: 'TITLE I > SEC. 10005',
    node_text: 'Medicare eligibility age increased from 65 to 67. Medicaid work requirements expanded. Health insurance marketplace subsidies reduced for higher-income individuals.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10006. EDUCATION FUNDING',
    full_path: 'TITLE I > SEC. 10006',
    node_text: 'Federal student loan interest rates increased. Pell Grant maximum reduced. Educational technology funding eliminated. School choice programs expanded.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10007. HOUSING ASSISTANCE',
    full_path: 'TITLE I > SEC. 10007',
    node_text: 'First-time homebuyer tax credit eliminated. Mortgage interest deduction cap reduced. Public housing funding decreased. Housing voucher program restructured.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10008. BUSINESS REGULATIONS',
    full_path: 'TITLE I > SEC. 10008',
    node_text: 'Small business tax rates reduced. Regulatory compliance costs decreased. Environmental regulations relaxed for manufacturing. Export incentives increased.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10009. INFRASTRUCTURE INVESTMENT',
    full_path: 'TITLE I > SEC. 10009',
    node_text: 'Highway maintenance funding increased. Bridge repair programs expanded. Public transit funding reduced. Airport infrastructure modernization accelerated.'
  },
  {
    level: 'SECTION',
    heading: 'SEC. 10010. SOCIAL PROGRAMS',
    full_path: 'TITLE I > SEC. 10010',
    node_text: 'Social Security benefits calculation modified. Unemployment insurance duration reduced. Disability determination process streamlined. Senior nutrition programs restructured.'
  }
]

// Generate chunks from nodes
const generateChunks = (nodes: any[], billId: string) => {
  const chunks: any[] = []
  
  nodes.forEach((node, nodeIndex) => {
    // Split node text into smaller chunks if needed
    const sentences = node.node_text.split('. ')
    const chunkSize = Math.max(1, Math.ceil(sentences.length / 2))
    
    for (let i = 0; i < sentences.length; i += chunkSize) {
      const chunkSentences = sentences.slice(i, i + chunkSize)
      const chunkText = chunkSentences.join('. ')
      
      if (chunkText.trim()) {
        chunks.push({
          bill_id: billId,
          chunk_text: chunkText,
          metadata: {
            pageNumber: Math.floor(nodeIndex / 2) + 1,
            sectionId: `SEC.${10001 + nodeIndex}`,
            sectionTitle: node.heading,
            contextBefore: nodeIndex > 0 ? nodes[nodeIndex - 1].heading : '',
            contextAfter: nodeIndex < nodes.length - 1 ? nodes[nodeIndex + 1].heading : '',
            coordinates: {
              x: 15 + (nodeIndex % 2) * 40,
              y: 25 + Math.floor(nodeIndex / 2) * 15,
              width: 35,
              height: 10
            },
            level: node.level,
            fullPath: node.full_path
          }
        })
      }
    }
  })
  
  return chunks
}

class DataMigrationService {
  /**
   * Migrate BBB bill data to database
   */
  async migrateBBBBill(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Starting BBB bill migration...')

      // 1. Insert/update bill record
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .upsert([BBB_BILL_DATA], { onConflict: 'bill_id' })
        .select()

      if (billError) {
        console.error('Error inserting bill:', billError)
        return { success: false, message: `Failed to insert bill: ${billError.message}` }
      }

      console.log('✅ Bill record inserted/updated')

      // 2. Insert bill nodes
      const nodesWithBillId = BBB_BILL_NODES.map(node => ({
        ...node,
        bill_id: BBB_BILL_DATA.bill_id
      }))

      // Clear existing nodes for this bill
      await supabase
        .from('bill_nodes')
        .delete()
        .eq('bill_id', BBB_BILL_DATA.bill_id)

      const { data: nodeData, error: nodeError } = await supabase
        .from('bill_nodes')
        .insert(nodesWithBillId)
        .select()

      if (nodeError) {
        console.error('Error inserting nodes:', nodeError)
        return { success: false, message: `Failed to insert nodes: ${nodeError.message}` }
      }

      console.log('✅ Bill nodes inserted:', nodeData?.length || 0)

      // 3. Insert bill chunks
      const chunks: any[] = generateChunks(BBB_BILL_NODES, BBB_BILL_DATA.bill_id)
      
      // We need to link chunks to their nodes
      const chunksWithNodeIds = chunks.map((chunk, index) => ({
        ...chunk,
        node_id: nodeData?.[Math.floor(index / 2)]?.id || 1 // Link to appropriate node
      }))

      // Clear existing chunks for this bill
      await supabase
        .from('bill_chunks')
        .delete()
        .eq('bill_id', BBB_BILL_DATA.bill_id)

      const { data: chunkData, error: chunkError } = await supabase
        .from('bill_chunks')
        .insert(chunksWithNodeIds)
        .select()

      if (chunkError) {
        console.error('Error inserting chunks:', chunkError)
        return { success: false, message: `Failed to insert chunks: ${chunkError.message}` }
      }

      console.log('✅ Bill chunks inserted:', chunkData?.length || 0)

      // 4. Insert bill summary
      const { error: summaryError } = await supabase
        .from('bill_summaries')
        .upsert([{
          bill_id: BBB_BILL_DATA.bill_id,
          version_code: 'IH',
          action_date: BBB_BILL_DATA.introduced_date,
          action_desc: 'Introduced in House',
          summary_text: 'This bill implements significant fiscal and policy changes including SNAP work requirements, tax relief, energy provisions, healthcare modifications, education funding changes, housing assistance updates, business regulation reforms, infrastructure investment, and social program modifications. The bill also increases the federal debt limit by $4 trillion.'
        }], { onConflict: 'bill_id' })

      if (summaryError) {
        console.error('Error inserting summary:', summaryError)
        return { success: false, message: `Failed to insert summary: ${summaryError.message}` }
      }

      console.log('✅ Bill summary inserted')

      // 5. Insert bill subjects
      const subjects = [
        'Economics and Public Finance',
        'Social Welfare',
        'Taxation',
        'Energy',
        'Health',
        'Education',
        'Housing and Community Development',
        'Government Operations and Politics'
      ]

      const subjectRecords = subjects.map(subject => ({
        bill_id: BBB_BILL_DATA.bill_id,
        subject_name: subject
      }))

      // Clear existing subjects
      await supabase
        .from('bill_subjects')
        .delete()
        .eq('bill_id', BBB_BILL_DATA.bill_id)

      const { error: subjectError } = await supabase
        .from('bill_subjects')
        .insert(subjectRecords)

      if (subjectError) {
        console.error('Error inserting subjects:', subjectError)
        return { success: false, message: `Failed to insert subjects: ${subjectError.message}` }
      }

      console.log('✅ Bill subjects inserted')

      return { 
        success: true, 
        message: `Successfully migrated BBB bill with ${nodeData?.length || 0} nodes and ${chunkData?.length || 0} chunks` 
      }

    } catch (error) {
      console.error('Migration error:', error)
      return { 
        success: false, 
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Check if BBB bill data exists in database
   */
  async checkBBBBillExists(): Promise<boolean> {
    try {
      const { data: bill, error } = await supabase
        .from('bills')
        .select('bill_id')
        .eq('bill_id', BBB_BILL_DATA.bill_id)
        .single()

      return !error && !!bill
    } catch (error) {
      console.error('Error checking BBB bill existence:', error)
      return false
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      const billExists = await this.checkBBBBillExists()
      
      if (!billExists) {
        return {
          status: 'not_migrated',
          message: 'BBB bill not found in database'
        }
      }

      // Check if we have nodes and chunks
      const { data: nodes } = await supabase
        .from('bill_nodes')
        .select('id')
        .eq('bill_id', BBB_BILL_DATA.bill_id)

      const { data: chunks } = await supabase
        .from('bill_chunks')
        .select('id')
        .eq('bill_id', BBB_BILL_DATA.bill_id)

      return {
        status: 'migrated',
        message: `BBB bill exists with ${nodes?.length || 0} nodes and ${chunks?.length || 0} chunks`,
        details: {
          nodes: nodes?.length || 0,
          chunks: chunks?.length || 0
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Error checking migration status: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const dataMigrationService = new DataMigrationService()
export default dataMigrationService 