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
import { personaUtils, supabase } from '@/lib/supabase'

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
  const [userPersona, setUserPersona] = useState<any>(null)
  
  // Signature Modal State
  const [showSigningModal, setShowSigningModal] = useState<FeedMessage | null>(null)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

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

  // Load initial data
  useEffect(() => {
    loadAILetters()
    loadPopularBills()
    loadUnderRadarBills()
  }, [])

  // Bill Search Function using your ngrok endpoint
  const searchBills = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    try {
      console.log('Starting search with query:', searchQuery)
      const response = await fetch('/api/search-bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          persona: searchQuery
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

  // Load AI-generated letters with real signature data
  const loadAILetters = async () => {
    setLettersLoading(true)
    try {
      // Query your user_representative_contacts table for letters with multiple signatures
      const response = await fetch('/api/feed/letters')
      if (response.ok) {
        const data = await response.json()
        setAiLetters(data.letters || [])
      }
    } catch (error) {
      console.error('Error loading AI letters:', error)
      // Fallback to sample data for now
      setAiLetters([
        {
          id: 'letter-1',
          billId: 'hr2500-118',
          billTitle: 'Young Adult Economic Security Act',
          sentiment: 'support',
          subject: 'Strong Support for Young Adult Economic Security Act',
          message: 'Dear Senator Smith,\n\nI am writing to express my strong support for the Young Adult Economic Security Act...',
          representative: { name: 'John Smith', party: 'D', state: 'CO', title: 'Sen.' },
          signatures: ['Alice Johnson', 'Bob Wilson', 'Carol Davis', 'David Brown', 'Emily White'],
          signatureCount: 5,
          createdAt: '2024-01-15T10:30:00Z',
          isSignedByUser: false
        }
      ])
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

      const response = await fetch('/api/sign-representative-message', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          messageId: showSigningModal.id,
          userName: userName.trim(),
          userEmail: userEmail.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sign message')
      }

      const data = await response.json()
      
      if (data.success) {
        setAiLetters(prev => 
          prev.map(msg => 
            msg.id === showSigningModal.id 
              ? { 
                  ...msg, 
                  signatures: data.signatures || [...msg.signatures, userName.trim()],
                  signatureCount: data.signatureCount || msg.signatureCount + 1,
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
      alert(`Error signing message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const filteredLetters = aiLetters.filter(msg => {
    if (letterFilter === 'all') return true
    return msg.sentiment === letterFilter
  })

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
                AI Letters ({aiLetters.length})
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
              <div className="flex gap-2">
                <Button
                  variant={letterFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setLetterFilter('all')}
                  size="sm"
                >
                  All Letters ({aiLetters.length})
                </Button>
                <Button
                  variant={letterFilter === 'support' ? 'default' : 'outline'}
                  onClick={() => setLetterFilter('support')}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Support ({aiLetters.filter(m => m.sentiment === 'support').length})
                </Button>
                <Button
                  variant={letterFilter === 'oppose' ? 'default' : 'outline'}
                  onClick={() => setLetterFilter('oppose')}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Oppose ({aiLetters.filter(m => m.sentiment === 'oppose').length})
                </Button>
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
                <div className="space-y-4">
                  {filteredLetters.map((letter) => (
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
                              {letter.message.length > 300 
                                ? `${letter.message.substring(0, 300)}...`
                                : letter.message
                              }
                            </div>
                          </div>
                          
                                                     <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <span className="text-sm text-gray-600">
                                 {letter.signatureCount} of {letter.targetSignatures || 100} signatures
                               </span>
                               {letter.signatureCount >= (letter.targetSignatures || 100) && (
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