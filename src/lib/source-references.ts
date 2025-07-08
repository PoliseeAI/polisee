import { supabase } from './supabase'
import { Tables } from '@/types/database'

// Database types
export type BillChunk = Tables<'bill_chunks'>
export type BillNode = Tables<'bill_nodes'>
export type Bill = Tables<'bills'>

// Source reference interface that matches the current UI expectations
export interface SourceReference {
  billId: string
  sectionId: string
  pageNumber: number
  text: string
  contextBefore: string
  contextAfter: string
  coordinates: {
    x: number
    y: number
    width: number
    height: number
  }
  sectionTitle: string
  billTitle: string
  pdfUrl: string
}

// Enhanced interface for database-driven references
export interface DatabaseSourceReference {
  id: number
  billId: string
  nodeId: number
  chunkText: string
  metadata: {
    pageNumber?: number
    sectionId?: string
    sectionTitle?: string
    contextBefore?: string
    contextAfter?: string
    coordinates?: {
      x: number
      y: number
      width: number
      height: number
    }
    level?: string
    fullPath?: string
  }
  node: {
    id: number
    heading: string | null
    level: string
    fullPath: string | null
    nodeText: string | null
  }
  similarity?: number
}

class SourceReferenceService {
  /**
   * Get source references for a specific bill
   */
  async getBillSourceReferences(billId: string): Promise<SourceReference[]> {
    try {
      // Query bill chunks with their related nodes
      const { data: chunks, error } = await supabase
        .from('bill_chunks')
        .select(`
          *,
          node_id,
          bill_nodes (
            id,
            heading,
            level,
            full_path,
            node_text
          )
        `)
        .eq('bill_id', billId)
        .limit(50) // Limit to prevent too many results

      if (error) {
        console.error('Error fetching source references:', error)
        return []
      }

      if (!chunks || chunks.length === 0) {
        return []
      }

      // Get bill title
      const { data: bill } = await supabase
        .from('bills')
        .select('title')
        .eq('bill_id', billId)
        .single()

      const billTitle = bill?.title || 'Unknown Bill'

      // Transform database results to SourceReference format
      return chunks.map((chunk, index) => {
        const metadata = chunk.metadata as any || {}
        const node = chunk.bill_nodes as any

        return {
          billId: chunk.bill_id,
          sectionId: metadata.sectionId || `node_${chunk.node_id}`,
          pageNumber: metadata.pageNumber || Math.floor(index / 3) + 1, // Estimate page
          text: chunk.chunk_text || '',
          contextBefore: metadata.contextBefore || '',
          contextAfter: metadata.contextAfter || '',
          coordinates: metadata.coordinates || {
            x: 10 + (index % 3) * 30,
            y: 15 + Math.floor(index / 3) * 20,
            width: 25,
            height: 15
          },
          sectionTitle: node?.heading || `Section ${index + 1}`,
          billTitle,
          pdfUrl: '' // Will be set by the calling function
        }
      })
    } catch (error) {
      console.error('Error in getBillSourceReferences:', error)
      return []
    }
  }

  /**
   * Search for source references based on keywords
   */
  async searchSourceReferences(
    billId: string, 
    keywords: string[], 
    limit: number = 10
  ): Promise<SourceReference[]> {
    try {
      // Create search query for chunk text
      const searchQuery = keywords.join(' | ')
      
      const { data: chunks, error } = await supabase
        .from('bill_chunks')
        .select(`
          *,
          node_id,
          bill_nodes (
            id,
            heading,
            level,
            full_path,
            node_text
          )
        `)
        .eq('bill_id', billId)
        .textSearch('chunk_text', searchQuery)
        .limit(limit)

      if (error) {
        console.error('Error searching source references:', error)
        return this.getBillSourceReferences(billId) // Fallback to all references
      }

      if (!chunks || chunks.length === 0) {
        return []
      }

      // Get bill title
      const { data: bill } = await supabase
        .from('bills')
        .select('title')
        .eq('bill_id', billId)
        .single()

      const billTitle = bill?.title || 'Unknown Bill'

      // Transform results
      return chunks.map((chunk, index) => {
        const metadata = chunk.metadata as any || {}
        const node = chunk.bill_nodes as any

        return {
          billId: chunk.bill_id,
          sectionId: metadata.sectionId || `node_${chunk.node_id}`,
          pageNumber: metadata.pageNumber || Math.floor(index / 3) + 1,
          text: chunk.chunk_text || '',
          contextBefore: metadata.contextBefore || '',
          contextAfter: metadata.contextAfter || '',
          coordinates: metadata.coordinates || {
            x: 10 + (index % 3) * 30,
            y: 15 + Math.floor(index / 3) * 20,
            width: 25,
            height: 15
          },
          sectionTitle: node?.heading || `Section ${index + 1}`,
          billTitle,
          pdfUrl: ''
        }
      })
    } catch (error) {
      console.error('Error in searchSourceReferences:', error)
      return []
    }
  }

  /**
   * Get bill sections/nodes for navigation
   */
  async getBillSections(billId: string) {
    try {
      const { data: nodes, error } = await supabase
        .from('bill_nodes')
        .select('*')
        .eq('bill_id', billId)
        .order('id')

      if (error) {
        console.error('Error fetching bill sections:', error)
        return []
      }

      return nodes || []
    } catch (error) {
      console.error('Error in getBillSections:', error)
      return []
    }
  }

  /**
   * Get bill hierarchy for a specific node
   */
  async getBillHierarchy(nodeId: number) {
    try {
      const { data: hierarchy, error } = await supabase
        .rpc('get_bill_hierarchy', { node_id_param: nodeId })

      if (error) {
        console.error('Error fetching bill hierarchy:', error)
        return []
      }

      return hierarchy || []
    } catch (error) {
      console.error('Error in getBillHierarchy:', error)
      return []
    }
  }

  /**
   * Semantic search using embeddings (future implementation)
   */
  async semanticSearch(
    billId: string,
    query: string,
    threshold: number = 0.8,
    limit: number = 10
  ): Promise<DatabaseSourceReference[]> {
    // This would require generating embeddings for the query
    // For now, return text search results
    console.log('Semantic search not yet implemented, falling back to text search')
    const textResults = await this.searchSourceReferences(billId, [query], limit)
    
    return textResults.map(ref => ({
      id: 0, // Would be actual chunk ID
      billId: ref.billId,
      nodeId: 0, // Would be actual node ID
      chunkText: ref.text,
      metadata: {
        pageNumber: ref.pageNumber,
        sectionId: ref.sectionId,
        sectionTitle: ref.sectionTitle,
        contextBefore: ref.contextBefore,
        contextAfter: ref.contextAfter,
        coordinates: ref.coordinates
      },
      node: {
        id: 0,
        heading: ref.sectionTitle,
        level: 'section',
        fullPath: ref.sectionTitle,
        nodeText: ref.text
      },
      similarity: 0.9
    }))
  }
}

export const sourceReferenceService = new SourceReferenceService()
export default sourceReferenceService 