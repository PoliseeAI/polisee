'use client'

import { useState } from 'react'
import { AuthGuard } from '@/components/auth'
import { PolicyDocumentEditor } from '@/components/policy/PolicyDocumentEditor'
import { PolicyChatInterface } from '@/components/policy/PolicyChatInterface'
import { PolicyAgentStatus } from '@/components/policy/PolicyAgentStatus'
import { Card } from '@/components/ui/card'
import { Lightbulb } from 'lucide-react'

export interface PolicyDocument {
  title: string
  content: string
  lastUpdated: Date
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AgentStatus {
  isWorking: boolean
  currentAction: string
  progress?: number
}

export default function ProposePage() {
  const [document, setDocument] = useState<PolicyDocument>({
    title: 'New Policy Proposal',
    content: '',
    lastUpdated: new Date()
  })
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Policy Formation Agent. I\'ve loaded a policy template for you to get started. You can ask me to:\n\n• Fill in specific sections (e.g., "Write an executive summary for a healthcare policy")\n• Research existing policies (e.g., "What are other states doing about affordable housing?")\n• Add new sections (e.g., "Add a section about funding sources")\n• Revise content (e.g., "Make the implementation timeline more detailed")\n\nWhat policy would you like to work on today?',
      timestamp: new Date()
    }
  ])
  
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    isWorking: false,
    currentAction: ''
  })

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    // Set agent as working with initial status
    setAgentStatus({ isWorking: true, currentAction: 'Processing your request...' })

    try {
      // Simulate status updates (in production, this could be WebSocket or SSE)
      const statusUpdates = [
        { delay: 500, action: 'Analyzing your request...' },
        { delay: 1500, action: 'Searching for relevant information...' },
        { delay: 2500, action: 'Analyzing existing policies...' },
        { delay: 3500, action: 'Generating policy content...' },
        { delay: 4500, action: 'Finalizing response...' }
      ]

      // Start status updates
      const timeouts: NodeJS.Timeout[] = []
      statusUpdates.forEach(({ delay, action }) => {
        const timeout = setTimeout(() => {
          setAgentStatus(prev => ({ ...prev, currentAction: action }))
        }, delay)
        timeouts.push(timeout)
      })

      // Call the agent API
      const response = await fetch('/api/policy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          document: document,
          conversationHistory: messages
        })
      })

      // Clear any remaining timeouts
      timeouts.forEach(t => clearTimeout(t))

      if (!response.ok) {
        throw new Error('Failed to get response from agent')
      }

      const data = await response.json()

      // Update document if agent made changes
      if (data.documentUpdate) {
        setDocument({
          ...data.documentUpdate,
          lastUpdated: new Date(data.documentUpdate.lastUpdated)
        })
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Error communicating with agent:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setAgentStatus({ isWorking: false, currentAction: '' })
    }
  }

  const handleDocumentUpdate = (newDocument: PolicyDocument) => {
    setDocument(newDocument)
  }

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Policy Proposal Creator</h1>
            </div>
            <p className="text-gray-600 hidden sm:block">Create comprehensive policy proposals with AI assistance</p>
          </div>
        </div>

        {/* Main Content - This will grow to fill available space */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-7xl mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* Document Editor */}
              <Card className="overflow-hidden flex flex-col">
                <PolicyDocumentEditor 
                  document={document} 
                  onUpdate={handleDocumentUpdate}
                  isReadOnly={agentStatus.isWorking}
                />
              </Card>

              {/* Chat Interface */}
              <div className="flex flex-col gap-4 overflow-hidden">
                {/* Agent Status */}
                {agentStatus.isWorking && (
                  <PolicyAgentStatus 
                    status={agentStatus}
                  />
                )}

                {/* Chat - This will take remaining space */}
                <Card className="flex-1 overflow-hidden flex flex-col">
                  <PolicyChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isAgentWorking={agentStatus.isWorking}
                  />
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 