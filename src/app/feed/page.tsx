'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, MessageCircle, Users, ThumbsUp, ThumbsDown, Sparkles, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth'

interface FeedMessage {
  id: string
  billId: string
  billTitle: string
  sentiment: 'support' | 'oppose'
  subject: string
  message: string
  representative: {
    name: string
    party: string
    state: string
    title: string
  }
  signatures: string[]
  createdAt: string
  isSignedByUser: boolean
}

export default function FeedPage() {
  const [messages, setMessages] = useState<FeedMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'support' | 'oppose'>('all')
  const [showSigningModal, setShowSigningModal] = useState<FeedMessage | null>(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Simulate loading messages from API
    const loadMessages = async () => {
      setLoading(true)
      
      // In a real app, this would fetch from an API
      // For now, we'll simulate with mock data
      const mockMessages: FeedMessage[] = [
        {
          id: 'msg-1',
          billId: 'hr2500-118',
          billTitle: 'Young Adult Economic Security Act',
          sentiment: 'support',
          subject: 'Strong Support for Young Adult Economic Security Act',
          message: 'Dear Senator Smith,\n\nI am writing to express my strong support for the Young Adult Economic Security Act (HR2500-118).\n\nAs a young adult in Denver, Colorado, this legislation would provide crucial support for people like me who are struggling with student debt, housing costs, and limited job opportunities. The provisions for student loan forgiveness, affordable housing assistance, and job training programs would make a real difference in my life and the lives of thousands of young adults in our state.\n\nI urge you to support this important legislation when it comes to a vote.\n\nSincerely,\n[Your Name]',
          representative: {
            name: 'John Smith',
            party: 'D',
            state: 'CO',
            title: 'Sen.'
          },
          signatures: ['Alice Johnson', 'Bob Wilson', 'Carol Davis'],
          createdAt: '2024-01-15T10:30:00Z',
          isSignedByUser: false
        },
        {
          id: 'msg-2',
          billId: 'hr2200-118',
          billTitle: 'Medicare Enhancement Act',
          sentiment: 'oppose',
          subject: 'Concerns About Medicare Enhancement Act',
          message: 'Dear Representative Johnson,\n\nI am writing to express my concerns about the Medicare Enhancement Act (HR2200-118).\n\nWhile I support improving Medicare, I believe this particular bill may have unintended consequences for current beneficiaries. The proposed changes to prescription drug coverage could affect my ability to afford my medications, and I worry about the long-term sustainability of the program.\n\nI urge you to consider these concerns and work toward a more balanced approach to Medicare reform.\n\nSincerely,\n[Your Name]',
          representative: {
            name: 'Jane Johnson',
            party: 'R',
            state: 'CO',
            title: 'Rep.'
          },
          signatures: ['David Brown', 'Emily White'],
          createdAt: '2024-01-14T15:45:00Z',
          isSignedByUser: false
        }
      ]
      
      setMessages(mockMessages)
      setLoading(false)
    }

    loadMessages()
  }, [])

  const handleSignMessage = (message: FeedMessage) => {
    setShowSigningModal(message)
  }

  const submitSignature = async () => {
    if (!showSigningModal || !userName.trim()) {
      alert('Please enter your name to sign the message')
      return
    }

    try {
      const response = await fetch('/api/sign-representative-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: showSigningModal.id,
          userName: userName.trim(),
          userEmail: userEmail.trim()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to sign message')
      }

      const data = await response.json()
      
      if (data.success) {
        // Update the message with signature
        setMessages(prev => 
          prev.map(msg => 
            msg.id === showSigningModal.id 
              ? { 
                  ...msg, 
                  signatures: [...msg.signatures, userName.trim()],
                  isSignedByUser: true
                }
              : msg
          )
        )
        
        setShowSigningModal(null)
        setUserName('')
        setUserEmail('')
        
        alert('✅ Message signed successfully!')
      }
    } catch (error) {
      console.error('Error signing message:', error)
      alert('Error signing message. Please try again.')
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true
    return msg.sentiment === filter
  })

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'D': return 'bg-blue-100 text-blue-800'
      case 'R': return 'bg-red-100 text-red-800'
      case 'I': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPartyName = (party: string) => {
    switch (party) {
      case 'D': return 'Democratic'
      case 'R': return 'Republican'
      case 'I': return 'Independent'
      default: return party
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading community messages...</span>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community Feed</h1>
              <p className="text-gray-600 mt-2">
                Review and sign AI-generated messages to representatives from your community
              </p>
            </div>
            <Link href="/bills">
              <Button variant="outline" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Analyze Bills
              </Button>
            </Link>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All Messages ({messages.length})
            </Button>
            <Button
              variant={filter === 'support' ? 'default' : 'outline'}
              onClick={() => setFilter('support')}
              size="sm"
              className="flex items-center gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
              Support ({messages.filter(m => m.sentiment === 'support').length})
            </Button>
            <Button
              variant={filter === 'oppose' ? 'default' : 'outline'}
              onClick={() => setFilter('oppose')}
              size="sm"
              className="flex items-center gap-1"
            >
              <ThumbsDown className="h-4 w-4" />
              Oppose ({messages.filter(m => m.sentiment === 'oppose').length})
            </Button>
          </div>

          {/* Messages List */}
          {filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No messages found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Be the first to create a message by analyzing a bill and providing feedback.
                  </p>
                  <Link href="/bills">
                    <Button>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Bills
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <Card key={message.id} className={`border-l-4 ${
                  message.sentiment === 'support' ? 'border-l-green-500' : 'border-l-red-500'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {message.representative.title} {message.representative.name}
                          </CardTitle>
                          <Badge className={getPartyColor(message.representative.party)}>
                            {getPartyName(message.representative.party)}
                          </Badge>
                          <Badge className={message.sentiment === 'support' ? 
                            'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {message.sentiment === 'support' ? 'Support' : 'Oppose'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {message.representative.state}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(message.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Link href={`/bills/${message.billId}/analysis`}>
                          <h4 className="font-medium text-blue-600 hover:text-blue-800">
                            {message.billTitle}
                          </h4>
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Subject:</strong> {message.subject}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {message.message.length > 300 
                            ? `${message.message.substring(0, 300)}...`
                            : message.message
                          }
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {message.signatures.length} signature(s)
                          </span>
                        </div>
                        
                        <div className="flex gap-2">
                          {!message.isSignedByUser && (
                            <Button
                              onClick={() => handleSignMessage(message)}
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <User className="h-4 w-4" />
                              Sign Message
                            </Button>
                          )}
                          
                          {message.isSignedByUser && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Signed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Signing Modal */}
        {showSigningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Sign This Message</CardTitle>
                <p className="text-sm text-gray-600">
                  Add your signature to this message to {showSigningModal.representative.title} {showSigningModal.representative.name}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter your email address"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowSigningModal(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitSignature}
                      disabled={!userName.trim()}
                    >
                      Sign Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  )
} 