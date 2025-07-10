import { PolicyDocument, ChatMessage } from '@/app/propose/page'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export interface PolicyAgentContext {
  message: string
  document: PolicyDocument
  conversationHistory: ChatMessage[]
}

export interface PolicyAgentResponse {
  message: string
  documentUpdate?: PolicyDocument
  toolsUsed: string[]
}

export interface PolicyAgentTool {
  name: string
  description: string
  execute: (context: any) => Promise<any>
}

// Tool to search the web for policy-related information
const webSearchTool: PolicyAgentTool = {
  name: 'web_search',
  description: 'Search the web for policy information, existing legislation, and research',
  execute: async (query: string) => {
    try {
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_term: query })
      })
      
      if (!response.ok) {
        throw new Error('Web search failed')
      }
      
      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Web search error:', error)
      return []
    }
  }
}

// Tool to analyze existing bills for reference
const analyzeBillsTool: PolicyAgentTool = {
  name: 'analyze_bills',
  description: 'Analyze existing bills related to the policy topic',
  execute: async (topic: string) => {
    try {
      const response = await fetch('/api/search-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topic })
      })
      
      if (!response.ok) {
        throw new Error('Bill analysis failed')
      }
      
      const data = await response.json()
      return data.results || []
    } catch (error) {
      console.error('Bill analysis error:', error)
      return []
    }
  }
}

// Tool to update the policy document
const updateDocumentTool: PolicyAgentTool = {
  name: 'update_document',
  description: 'Update the policy document with new content or sections',
  execute: async ({ document, updates }: { document: PolicyDocument, updates: Partial<PolicyDocument> }) => {
    const updatedDocument: PolicyDocument = {
      ...document,
      ...updates,
      lastUpdated: new Date()
    }
    
    return updatedDocument
  }
}

// Tool to update specific sections in the markdown document
const updateSectionTool: PolicyAgentTool = {
  name: 'update_section',
  description: 'Update or add a section in the policy document',
  execute: async ({ document, sectionTitle, sectionContent }: { document: PolicyDocument, sectionTitle: string, sectionContent: string }) => {
    let updatedContent = document.content
    
    // Check if section exists and update it
    const sectionRegex = new RegExp(`(## ${sectionTitle}\\n)([^#]*?)(?=##|$)`, 'gm')
    if (sectionRegex.test(updatedContent)) {
      // Update existing section
      updatedContent = updatedContent.replace(sectionRegex, `$1${sectionContent}\n\n`)
    } else {
      // Add new section at the end
      updatedContent = updatedContent.trim() + `\n\n## ${sectionTitle}\n${sectionContent}`
    }
    
    const updatedDocument: PolicyDocument = {
      ...document,
      content: updatedContent,
      lastUpdated: new Date()
    }
    
    return updatedDocument
  }
}

export class PolicyFormationAgent {
  private tools: PolicyAgentTool[] = [
    webSearchTool,
    analyzeBillsTool,
    updateDocumentTool,
    updateSectionTool
  ]

  async processRequest(context: PolicyAgentContext): Promise<PolicyAgentResponse> {
    const { message, document, conversationHistory } = context
    const toolsUsed: string[] = []
    let documentUpdate: PolicyDocument | undefined

    try {
      // Parse the user's intent using AI
      const intent = await this.analyzeIntent(message, conversationHistory)
      
      // Gather context from various sources
      let researchContext = ''
      let billContext = ''
      
      if (intent.needsResearch) {
        toolsUsed.push('web_search')
        const searchResults = await webSearchTool.execute(intent.searchQuery)
        researchContext = searchResults.slice(0, 3).join('\n')
      }
      
      if (intent.needsBillAnalysis) {
        toolsUsed.push('analyze_bills')
        const billResults = await analyzeBillsTool.execute(intent.topic)
        billContext = billResults.slice(0, 3).join('\n')
      }
      
      // Generate AI response with all gathered context
      const aiResponse = await this.generateResponse(
        message,
        conversationHistory,
        document,
        intent,
        toolsUsed,
        researchContext,
        billContext
      )
      
      // Update document if needed
      if (aiResponse.documentChanges) {
        if (aiResponse.newSection) {
          documentUpdate = await updateSectionTool.execute({
            document,
            sectionTitle: aiResponse.newSection.title,
            sectionContent: aiResponse.newSection.content
          })
          toolsUsed.push('update_section')
        } else if (aiResponse.updates) {
          documentUpdate = await updateDocumentTool.execute({
            document,
            updates: aiResponse.updates
          })
          toolsUsed.push('update_document')
        }
      }
      
      return {
        message: aiResponse.message,
        documentUpdate,
        toolsUsed
      }
    } catch (error) {
      console.error('Policy agent error:', error)
      return {
        message: 'I encountered an error while processing your request. Please try again.',
        toolsUsed
      }
    }
  }

  private async analyzeIntent(message: string, history: ChatMessage[]): Promise<any> {
    if (!OPENAI_API_KEY) {
      // Fallback to simple intent detection
      const lowerMessage = message.toLowerCase()
      return {
        needsResearch: lowerMessage.includes('research') || lowerMessage.includes('find') || lowerMessage.includes('search'),
        needsBillAnalysis: lowerMessage.includes('existing') || lowerMessage.includes('similar') || lowerMessage.includes('bills'),
        searchQuery: message,
        topic: this.extractTopic(message),
        action: this.determineAction(message)
      }
    }

    try {
      const prompt = `Analyze this policy-related request and determine the user's intent.
      
User message: "${message}"

Recent conversation:
${history.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Return a JSON object with:
- needsResearch: boolean (true if user wants web research)
- needsBillAnalysis: boolean (true if user wants to analyze existing bills)
- searchQuery: string (query for web search if needed)
- topic: string (main policy topic)
- action: string (one of: create, add, research, analyze, chat)
- shouldUpdateDocument: boolean (true if document should be modified)`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a policy analysis assistant. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
      })

      if (!response.ok) {
        throw new Error('OpenAI API error')
      }

      const result = await response.json()
      return JSON.parse(result.choices[0]?.message?.content || '{}')
    } catch (error) {
      console.error('Intent analysis error:', error)
      // Fallback to simple analysis
      return this.analyzeIntent(message, [])
    }
  }

  private extractTopic(message: string): string {
    // Extract the main topic from the message
    // This is a simplified version - in production would use NLP
    const topics = ['healthcare', 'education', 'environment', 'economy', 'infrastructure', 'technology']
    const found = topics.find(topic => message.toLowerCase().includes(topic))
    return found || 'general policy'
  }

  private determineAction(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes('create') || lower.includes('draft')) return 'create'
    if (lower.includes('add') || lower.includes('include')) return 'add'
    if (lower.includes('research') || lower.includes('find')) return 'research'
    if (lower.includes('analyze') || lower.includes('review')) return 'analyze'
    return 'chat'
  }

  private async generateResponse(
    message: string,
    history: ChatMessage[],
    document: PolicyDocument,
    intent: any,
    toolsUsed: string[],
    researchContext: string = '',
    billContext: string = ''
  ): Promise<any> {
    if (!OPENAI_API_KEY) {
      // Fallback response without AI
      const response: {
        message: string
        documentChanges: boolean
        newSection: { title: string; content: string } | null
        updates: Partial<PolicyDocument> | null
      } = {
        message: `I understand you want to ${intent.action} regarding ${intent.topic}. Let me help you with that.`,
        documentChanges: false,
        newSection: null,
        updates: null
      }
      
      if (intent.action === 'create' || intent.action === 'add') {
        response.documentChanges = true
        response.newSection = {
          title: `Policy on ${intent.topic}`,
          content: `This section addresses ${intent.topic} policy considerations...`
        }
        response.message += ` I've created a new section in your document for ${intent.topic}.`
      }
      
      return response
    }

    try {
      const systemPrompt = `You are an expert policy advisor helping to create comprehensive policy proposals. 
You have access to web research and existing bill analysis. 
When creating policy content, be specific, actionable, and cite relevant precedents or research.
Always structure policy proposals with clear objectives, implementation details, and expected outcomes.`

      const userPrompt = `User request: "${message}"

Current document:
Title: ${document.title}
Content preview: ${document.content ? document.content.substring(0, 500) + '...' : 'Empty document with template'}

Intent analysis:
- Action: ${intent.action}
- Topic: ${intent.topic}
- Should update document: ${intent.shouldUpdateDocument}

${researchContext ? `Web research results:\n${researchContext}\n` : ''}
${billContext ? `Related bills analysis:\n${billContext}\n` : ''}

Based on this context, provide:
1. A helpful response message to the user
2. If document should be updated, provide either:
   - A new section to add or update (with title and content)
   - Updates to the overall document (title or complete content replacement)

Note: The document uses Markdown format with ## for section headers.

Return as JSON with structure:
{
  "message": "response to user",
  "documentChanges": boolean,
  "newSection": { "title": "Section Title", "content": "Section content in markdown..." } or null,
  "updates": { "title": "New Title", "content": "Complete document content..." } or null
}`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        }),
      })

      if (!response.ok) {
        throw new Error('OpenAI API error')
      }

      const result = await response.json()
      return JSON.parse(result.choices[0]?.message?.content || '{}')
    } catch (error) {
      console.error('Response generation error:', error)
      // Fallback to simple response
      return this.generateResponse(message, history, document, intent, toolsUsed, '', '')
    }
  }
} 