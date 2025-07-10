'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, MessageCircle, Users, ThumbsUp, ThumbsDown, Sparkles, Calendar, MapPin, 
  Search, TrendingUp, Eye, EyeOff, Filter, Clock, AlertTriangle, FileText
} from 'lucide-react'
import Link from 'next/link'
import { AuthGuard } from '@/components/auth'
import { useAuthContext } from '@/lib/auth'
import { personaUtils, supabase, PersonaRow } from '@/lib/supabase'

interface BillSearchResult {
  summary_point: string
  bill_id: number
}

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
  signatureCount: number
  targetSignatures?: number
  campaignStatus?: string
  createdAt: string
  isSignedByUser: boolean
}

interface PopularBill {
  bill_id: string
  title: string
  engagement_score: number
  analysis_count: number
  feedback_count: number
  latest_action: string
}

interface UnderRadarBill {
  bill_id: string
  title: string
  fiscal_impact: string
  policy_areas: string[]
  analysis_count: number
  importance_score: number
}

// Helper function to create comprehensive persona string
function createComprehensivePersonaString(persona: PersonaRow): string {
  const parts = [
    // Basic demographics
    `I am a ${persona.age}-year-old ${persona.occupation} living in ${persona.location}`,
    
    // Income and dependents
    `with an income in the ${persona.income_bracket} bracket`,
    persona.dependents > 0 ? `and ${persona.dependents} dependents` : 'with no dependents',
    
    // Education
    persona.has_higher_education ? 'with higher education' : 'without higher education',
    
    // Health and benefits
    `I ${persona.has_health_insurance ? 'have' : 'do not have'} health insurance`,
    persona.has_medicare ? 'I receive Medicare benefits' : 'I do not receive Medicare',
    persona.has_social_security ? 'I receive Social Security benefits' : 'I do not receive Social Security',
    
    // Business information
    persona.business_type ? `I operate a ${persona.business_type} business` : 'I do not operate a business',
    persona.employee_count ? `with ${persona.employee_count} employees` : null,
    
    // School district
    persona.school_district ? `in the ${persona.school_district} school district` : null
  ]
  
  // Filter out null values and join with appropriate punctuation
  return parts.filter(Boolean).join(', ') + '.'
}

export default function EnhancedFeedPage() {
  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BillSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  // AI Letters State
  const [aiLetters, setAiLetters] = useState<FeedMessage[]>([])
  const [lettersLoading, setLettersLoading] = useState(false)
  const [letterFilter, setLetterFilter] = useState<'all' | 'support' | 'oppose'>('all')
  
  // Popular Bills State
  const [popularBills, setPopularBills] = useState<PopularBill[]>([])
  const [popularLoading, setPopularLoading] = useState(false)
  
  // Under Radar State
  const [underRadarBills, setUnderRadarBills] = useState<UnderRadarBill[]>([])
  const [radarLoading, setRadarLoading] = useState(false)
  
  // User and Persona State
  const { user } = useAuthContext()
  const [userPersona, setUserPersona] = useState<PersonaRow | null>(null)
  
  // Signature Modal State
  const [showSigningModal, setShowSigningModal] = useState<FeedMessage | null>(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Expanded messages state
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())

  // State for user votes
  const [userVotes, setUserVotes] = useState<any[]>([])

  // Load user persona for personalized search
  useEffect(() => {
    const loadUserPersona = async () => {
      if (user) {
        const persona = await personaUtils.getPersona(user.id)
        setUserPersona(persona)
      }
    }
    loadUserPersona()
  }, [user])

  // Updated Bill Search Function - Option 2: Combine persona + query
  const searchBills = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    try {
      // Create comprehensive persona string if user has one
      let combinedPersona = searchQuery.trim()
      
      if (userPersona) {
        const fullPersonaString = createComprehensivePersonaString(userPersona)
        combinedPersona = `${fullPersonaString} I am interested in: ${searchQuery.trim()}`
        console.log('Combined persona + query:', combinedPersona)
      } else {
        console.log('Using search query only (no stored persona):', combinedPersona)
      }

      const response = await fetch('/api/search-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          persona: combinedPersona,
          query: searchQuery.trim(),
          hasStoredPersona: !!userPersona
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Search API error:', errorData)
        throw new Error(errorData.error || `Search failed with status ${response.status}`)
      }
      
      const results = await response.json()
      console.log('Search results:', results)
      setSearchResults(results || [])
    } catch (error) {
      console.error('Error searching bills:', error)
      setSearchResults([])
      // Show user-friendly error message
      alert(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSearchLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchAiLetters()
    loadPopularBills()
    loadUnderRadarBills()
    if (user) {
      fetchUserVotes()
    }
  }, [user])

  // Fetch user's current votes
  const fetchUserVotes = async () => {
    if (!user) return

    try {
      const { data: votes, error } = await supabase
        .from('user_bill_votes')
        .select('bill_id, sentiment')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching user votes:', error)
      } else {
        setUserVotes(votes || [])
      }
    } catch (error) {
      console.error('Error fetching user votes:', error)
    }
  }

  // Load AI-generated letters with real signature data
  const fetchAiLetters = async () => {
    try {
      setLettersLoading(true)
      
      // Ensure we have a session before making the request
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get auth headers if user is logged in
      const authHeaders: any = {}
      if (user && session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`
        console.log('Sending auth headers for user:', user.id)
      } else {
        console.log('No user or session available:', { user: !!user, session: !!session })
      }

      const response = await fetch('/api/feed/letters', {
        method: 'GET',
        headers: authHeaders
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI letters')
      }
      
      const data = await response.json()
      
      // Map hasUserSigned to isSignedByUser for UI compatibility
      const lettersWithCorrectSignedProperty = (data.letters || []).map((letter: any) => ({
        ...letter,
        isSignedByUser: letter.hasUserSigned || false
      }))
      
      setAiLetters(lettersWithCorrectSignedProperty)
    } catch (error) {
      console.error('Error fetching AI letters:', error)
      setAiLetters([])
    } finally {
      setLettersLoading(false)
    }
  }

  // Load popular bills based on engagement analytics
  const loadPopularBills = async () => {
    setPopularLoading(true)
    try {
      const response = await fetch('/api/feed/popular-bills')
      if (response.ok) {
        const data = await response.json()
        setPopularBills(data.bills || [])
      }
    } catch (error) {
      console.error('Error loading popular bills:', error)
      // Fallback sample data
      setPopularBills([
        {
          bill_id: 'hr1500-118',
          title: 'Climate Action and Jobs Act',
          engagement_score: 95,
          analysis_count: 247,
          feedback_count: 89,
          latest_action: 'Passed House committee'
        }
      ])
    } finally {
      setPopularLoading(false)
    }
  }

  // Load under-the-radar bills
  const loadUnderRadarBills = async () => {
    setRadarLoading(true)
    try {
      const response = await fetch('/api/feed/under-radar-bills')
      if (response.ok) {
        const data = await response.json()
        setUnderRadarBills(data.bills || [])
      }
    } catch (error) {
      console.error('Error loading under radar bills:', error)
      // Fallback sample data
      setUnderRadarBills([
        {
          bill_id: 'hr3200-118',
          title: 'Data Privacy Enhancement Act',
          fiscal_impact: '$2.3B impact on tech industry',
          policy_areas: ['Privacy', 'Technology', 'Business'],
          analysis_count: 3,
          importance_score: 88
        }
      ])
    } finally {
      setRadarLoading(false)
    }
  }

  // Handle message signing
  const handleSignMessage = (message: FeedMessage) => {
    setShowSigningModal(message)
  }

  const submitSignature = async () => {
    if (!showSigningModal || !userName.trim()) {
      alert('Please enter your name to sign the message')
      return
    }

    try {
      // Get auth token if available
      const authHeaders: any = { 'Content-Type': 'application/json' }
      if (user) {
        // Get session token from Supabase auth
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          authHeaders['Authorization'] = `Bearer ${session.access_token}`
        }
      }

      // Use proper API endpoint for signing messages
      const response = await fetch('/api/sign-representative-message', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          messageId: showSigningModal.id,
          userId: user?.id || 'temp_user_' + Math.random().toString(36).substr(2, 9),
          userName: userName.trim(),
          userEmail: userEmail.trim(),
          location: 'Denver, CO' // Could be dynamic based on user location
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sign message')
      }

      const data = await response.json()
      
      if (data.success) {
        // Close the modal and reset form first
        setShowSigningModal(null)
        setUserName('')
        setUserEmail('')
        
        // Refresh the letters data to get the latest state
        await fetchAiLetters()
        
        // Show success message
        let alertMessage = '✅ Message signed successfully!'
        if (data.targetReached) {
          alertMessage = '🎯 Letter signed successfully! The target has been reached and the letter has been sent to benny.yang@gauntletai.com!'
        }
        
        alert(alertMessage)
      }
    } catch (error) {
      console.error('Error signing message:', error)
      alert(`Error signing message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Toggle message expansion
  const toggleMessageExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  // Helper function to get filtered messages based on user votes
  const getFilteredMessagesByUserVotes = (messages: FeedMessage[]) => {
    return messages.filter(msg => {
      // Filter based on user's current votes (only show messages that match user's vote)
      if (user && userVotes.length > 0) {
        const userVote = userVotes.find(vote => vote.bill_id === msg.billId)
        if (!userVote) {
          // If user hasn't voted on this bill, don't show any messages for it
          return false
        }
        // Only show messages that match user's current vote sentiment
        return msg.sentiment === userVote.sentiment
      }

      // If no user or no votes, show all messages (for anonymous users)
      return true
    })
  }

  // Get messages filtered by user votes first
  const messagesFilteredByVotes = getFilteredMessagesByUserVotes(aiLetters)

  const filteredLetters = messagesFilteredByVotes.filter(msg => {
    // Apply the UI filter (All/Support/Oppose)
    if (letterFilter !== 'all' && msg.sentiment !== letterFilter) {
      return false
    }
    return true
  })

  // Split letters into active and sent
  const activeLetters = filteredLetters.filter(letter => letter.signatureCount < (letter.targetSignatures || 1))
  const sentLetters = filteredLetters.filter(letter => letter.signatureCount >= (letter.targetSignatures || 1))

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'D': return 'bg-blue-100 text-blue-800'
      case 'R': return 'bg-red-100 text-red-800'
      case 'I': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto p-6">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Legislative Feed</h1>
              <p className="text-gray-600 mt-2">
                Discover bills, join advocacy campaigns, and stay informed about legislative activity
              </p>
            </div>
            <Link href="/bills">
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Browse All Bills
              </Button>
            </Link>
          </div>

          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="search">
                <Search className="h-4 w-4 mr-2" />
                Search Bills
              </TabsTrigger>
              <TabsTrigger value="letters">
                <MessageCircle className="h-4 w-4 mr-2" />
                AI Letters ({messagesFilteredByVotes.length})
              </TabsTrigger>
              <TabsTrigger value="popular">
                <TrendingUp className="h-4 w-4 mr-2" />
                Popular
              </TabsTrigger>
              <TabsTrigger value="radar">
                <Eye className="h-4 w-4 mr-2" />
                Under Radar
              </TabsTrigger>
            </TabsList>

            {/* Bill Search Tab */}
            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Bills by Persona or Issue</CardTitle>
                  <p className="text-sm text-gray-600">
                    Describe yourself or an issue you care about to find relevant legislation
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      placeholder={userPersona 
                        ? `E.g., "${userPersona.occupation} in ${userPersona.location} concerned about healthcare"` 
                        : "E.g., 'teacher in Colorado concerned about education funding'"
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchBills()}
                      className="flex-1"
                    />
                    <Button onClick={searchBills} disabled={searchLoading}>
                      {searchLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Search Results ({searchResults.length})</h3>
                  {searchResults.map((result, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-800 mb-2">{result.summary_point}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Badge variant="outline">Bill ID: {result.bill_id}</Badge>
                            </div>
                          </div>
                          <Button size="sm" asChild>
                            <Link href={`/bills/${result.bill_id}/analysis`}>
                              Get Analysis
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* AI Letters Tab */}
            <TabsContent value="letters" className="space-y-6">
              {/* Filter Buttons */}
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={letterFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setLetterFilter('all')}
                    size="sm"
                  >
                    All Letters ({messagesFilteredByVotes.length})
                  </Button>
                  <Button
                    variant={letterFilter === 'support' ? 'default' : 'outline'}
                    onClick={() => setLetterFilter('support')}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Support ({messagesFilteredByVotes.filter(m => m.sentiment === 'support').length})
                  </Button>
                  <Button
                    variant={letterFilter === 'oppose' ? 'default' : 'outline'}
                    onClick={() => setLetterFilter('oppose')}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Oppose ({messagesFilteredByVotes.filter(m => m.sentiment === 'oppose').length})
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {/* Test Email Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/test-email-real')
                        const result = await response.json()
                        if (result.success) {
                          alert('🎉 Test email sent successfully! Check your inbox at benny.yang@gauntletai.com')
                        } else {
                          alert(`❌ Email failed: ${result.error}`)
                        }
                      } catch (error) {
                        alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Test Email
                  </Button>

                  {/* Reset Signatures Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/reset-signatures', {
                          method: 'POST'
                        })
                        const result = await response.json()
                        if (result.success) {
                          alert('🔄 Signatures reset! You can now sign letters again.')
                          // Refresh the page to update the UI
                          window.location.reload()
                        } else {
                          alert(`❌ Reset failed: ${result.error}`)
                        }
                      } catch (error) {
                        alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      }
                    }}
                    className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                  >
                    <Clock className="h-4 w-4" />
                    Reset Signatures
                  </Button>
                </div>
              </div>

              {/* Letters List */}
              {lettersLoading ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                      <span className="ml-2 text-gray-600">Loading AI-generated letters...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : filteredLetters.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No letters found
                      </h3>
                      <p className="text-gray-600 mb-4">
                        AI-generated letters appear here when enough people support or oppose a bill.
                      </p>
                      <Link href="/bills">
                        <Button>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analyze Bills to Create Letters
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Active Letters Section */}
                  {activeLetters.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">Active Letters</h3>
                        <Badge variant="outline" className="text-sm">
                          {activeLetters.length} need signatures
                        </Badge>
                      </div>
                      {activeLetters.map((letter) => (
                              <Card key={letter.id} className={`border-l-4 ${
                                letter.sentiment === 'support' ? 'border-l-green-500' : 'border-l-red-500'
                              }`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">
                                          {letter.representative.title} {letter.representative.name}
                                        </CardTitle>
                                        <Badge className={getPartyColor(letter.representative.party)}>
                                          {letter.representative.party === 'D' ? 'Democratic' : letter.representative.party === 'R' ? 'Republican' : 'Independent'}
                                        </Badge>
                                        <Badge className={letter.sentiment === 'support' ? 
                                          'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                          {letter.sentiment === 'support' ? 'Support' : 'Oppose'}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-4 w-4" />
                                          {letter.representative.state}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Users className="h-4 w-4" />
                                          {letter.signatureCount} signatures
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4" />
                                          {new Date(letter.createdAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div>
                                      <Link href={`/bills/${letter.billId}/analysis`}>
                                        <h4 className="font-medium text-blue-600 hover:text-blue-800">
                                          {letter.billTitle}
                                        </h4>
                                      </Link>
                                      <p className="text-sm text-gray-600 mt-1">
                                        <strong>Subject:</strong> {letter.subject}
                                      </p>
                                    </div>
                                    
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {expandedMessages.has(letter.id) ? (
                                          // Show full message
                                          <>
                                            {letter.message}
                                            {letter.message.length > 300 && (
                                              <button
                                                onClick={() => toggleMessageExpansion(letter.id)}
                                                className="block mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                              >
                                                Read Less
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          // Show truncated message
                                          <>
                                            {letter.message.length > 300 
                                              ? letter.message.substring(0, 300) + '...'
                                              : letter.message
                                            }
                                            {letter.message.length > 300 && (
                                              <button
                                                onClick={() => toggleMessageExpansion(letter.id)}
                                                className="block mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                              >
                                                Read More
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">
                                          {letter.signatureCount} of {letter.targetSignatures || 1} signatures
                                        </span>
                                        {letter.signatureCount >= (letter.targetSignatures || 1) && (
                                          <Badge variant="secondary" className="text-xs">
                                            Ready to send
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        {!letter.isSignedByUser && (
                                          <Button
                                            onClick={() => handleSignMessage(letter)}
                                            size="sm"
                                            className="flex items-center gap-1"
                                          >
                                            <User className="h-4 w-4" />
                                            Sign Letter
                                          </Button>
                                        )}
                                        
                                        {letter.isSignedByUser && (
                                          <Badge variant="secondary" className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            Already Signed
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
                        
                        {/* Sent Letters */}
                        {sentLetters.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">Sent Letters</h3>
                              <Badge variant="secondary" className="text-sm">
                                {sentLetters.length} sent to representatives
                              </Badge>
                            </div>
                            {sentLetters.map((letter) => (
                              <Card key={letter.id} className={`border-l-4 border-l-gray-400 opacity-75`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">
                                          {letter.representative.title} {letter.representative.name}
                                        </CardTitle>
                                        <Badge className={getPartyColor(letter.representative.party)}>
                                          {letter.representative.party === 'D' ? 'Democratic' : letter.representative.party === 'R' ? 'Republican' : 'Independent'}
                                        </Badge>
                                        <Badge className={letter.sentiment === 'support' ? 
                                          'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                          {letter.sentiment === 'support' ? 'Support' : 'Oppose'}
                                        </Badge>
                                        <Badge className="bg-gray-100 text-gray-800">
                                          ✓ Sent
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-1">
                                          <MapPin className="h-4 w-4" />
                                          {letter.representative.state}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Users className="h-4 w-4" />
                                          {letter.signatureCount} signatures
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4" />
                                          {new Date(letter.createdAt).toLocaleDateString()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div>
                                      <Link href={`/bills/${letter.billId}/analysis`}>
                                        <h4 className="font-medium text-blue-600 hover:text-blue-800">
                                          {letter.billTitle}
                                        </h4>
                                      </Link>
                                      <p className="text-sm text-gray-600 mt-1">
                                        <strong>Subject:</strong> {letter.subject}
                                      </p>
                                    </div>
                                    
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {expandedMessages.has(letter.id) ? (
                                          // Show full message
                                          <>
                                            {letter.message}
                                            {letter.message.length > 300 && (
                                              <button
                                                onClick={() => toggleMessageExpansion(letter.id)}
                                                className="block mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                              >
                                                Read Less
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          // Show truncated message
                                          <>
                                            {letter.message.length > 300 
                                              ? letter.message.substring(0, 300) + '...'
                                              : letter.message
                                            }
                                            {letter.message.length > 300 && (
                                              <button
                                                onClick={() => toggleMessageExpansion(letter.id)}
                                                className="block mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                              >
                                                Read More
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">
                                          {letter.signatureCount} of {letter.targetSignatures || 1} signatures
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                          ✓ Sent to benny.yang@gauntletai.com
                                        </Badge>
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        {letter.isSignedByUser && (
                                          <Badge variant="secondary" className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            You Signed
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
              )}
            </TabsContent>

            {/* Popular Bills Tab */}
            <TabsContent value="popular" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trending Bills
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Bills generating the most analysis requests and community engagement
                  </p>
                </CardHeader>
                <CardContent>
                  {popularLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      <span className="ml-2 text-gray-600">Loading popular bills...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {popularBills.map((bill, index) => (
                        <div key={bill.bill_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <Link href={`/bills/${bill.bill_id}/analysis`}>
                                <h4 className="font-medium text-blue-600 hover:text-blue-800">
                                  {bill.title}
                                </h4>
                              </Link>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span>{bill.analysis_count} analyses</span>
                                <span>{bill.feedback_count} feedback</span>
                                <span>Score: {bill.engagement_score}</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline">{bill.latest_action}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Under Radar Tab */}
            <TabsContent value="radar" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Under-the-Radar Bills
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Important legislation with significant impact but low public attention
                  </p>
                </CardHeader>
                <CardContent>
                  {radarLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      <span className="ml-2 text-gray-600">Analyzing overlooked bills...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {underRadarBills.map((bill) => (
                        <Card key={bill.bill_id} className="border-l-4 border-l-orange-500">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <Link href={`/bills/${bill.bill_id}/analysis`}>
                                  <h4 className="font-medium text-blue-600 hover:text-blue-800 mb-2">
                                    {bill.title}
                                  </h4>
                                </Link>
                                <div className="space-y-2">
                                  <p className="text-sm text-gray-700">
                                    <strong>Fiscal Impact:</strong> {bill.fiscal_impact}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {bill.policy_areas.map((area) => (
                                      <Badge key={area} variant="secondary" className="text-xs">
                                        {area}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <span>Only {bill.analysis_count} analyses</span>
                                    <span>Importance: {bill.importance_score}/100</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Badge className="bg-orange-100 text-orange-800">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Under Radar
                                </Badge>
                                <Link href={`/bills/${bill.bill_id}/analysis`}>
                                  <Button size="sm" variant="outline">
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Analyze
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Signing Modal */}
        {showSigningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Sign This Letter</CardTitle>
                <p className="text-sm text-gray-600">
                  Add your signature to this letter to {showSigningModal.representative.title} {showSigningModal.representative.name}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Your Name *
                    </label>
                    <Input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Email Address (Optional)
                    </label>
                    <Input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
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
                      Sign Letter
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