'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, AlertTriangle, Loader2, FileText, BookOpen } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillById, BillWithDetails, formatBillId } from '@/lib/bills'
import { personaUtils, PersonaRow } from '@/lib/supabase'
import { useAuthContext } from '@/lib/auth'
import { SourceReference } from '@/components/ui/source-citation'
import { AnalysisLinkedPDFViewer } from '@/components/ui/enhanced-pdf-viewer'
import { getBillPDFUrl, getBillSourceReferences, getBillSections } from '@/lib/pdf-storage'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnhancedImpactCard, PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { generatePersonalizedImpacts } from '@/lib/analysis-engine'
import RepresentativeContact from '@/components/feedback/RepresentativeContact'
import { SentimentFeedback } from '@/components/feedback/SentimentFeedback'


export default function BillAnalysis() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [persona, setPersona] = useState<PersonaRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personalImpacts, setPersonalImpacts] = useState<PersonalImpact[]>([])
  const [impactsLoading, setImpactsLoading] = useState(false)
  const [billPdfUrl, setBillPdfUrl] = useState<string | null>(null)
  const [allSourceReferences, setAllSourceReferences] = useState<SourceReference[]>([])
  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [selectedSourceRef, setSelectedSourceRef] = useState<SourceReference | null>(null)
  const [billSections, setBillSections] = useState<Array<{ id: string; title: string; pageNumber: number; level: number }>>([])  

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch bill data
        if (params.billId) {
          const fetchedBill = await getBillById(params.billId as string)
          setBill(fetchedBill)
          
          if (!fetchedBill) {
            setError('Bill not found')
            return
          }

          // Fetch PDF URL and source references
          const pdfUrl = await getBillPDFUrl(params.billId as string)
          setBillPdfUrl(pdfUrl)

          if (pdfUrl) {
            const sourceRefs = await getBillSourceReferences(params.billId as string)
            setAllSourceReferences(sourceRefs)
            
            // Fetch bill sections for navigation
            const sections = await getBillSections(params.billId as string)
            setBillSections(sections)
          }
        }

        // Fetch user's persona (user is guaranteed to exist due to AuthGuard)
        const userPersona = await personaUtils.getPersona(user!.id)
        setPersona(userPersona)

        if (!userPersona) {
          setError('No persona found. Please create a persona first.')
          return
        }

      } catch (err) {
        setError('Failed to load analysis')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    // Only run if user exists (AuthGuard ensures this)
    if (user) {
      fetchData()
    }
  }, [params.billId, user])

  // Separate effect to generate impacts when all data is loaded
  useEffect(() => {
    const loadImpacts = async () => {
      if (params.billId && persona) {
        setImpactsLoading(true)
        try {
          const impacts = await generatePersonalizedImpacts(
            params.billId as string, 
            persona, 
            allSourceReferences
          )
      setPersonalImpacts(impacts)
        } catch (error) {
          console.error('Error generating impacts:', error)
          setPersonalImpacts([])
        } finally {
          setImpactsLoading(false)
        }
      }
    }
    
    loadImpacts()
  }, [params.billId, persona, allSourceReferences])



  const handleViewInPdf = (sourceRef: SourceReference) => {
    setSelectedSourceRef(sourceRef)
    setShowPdfDialog(true)
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Analyzing bill impact...</span>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Bill Analysis</h1>
          </div>
          
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">{error}</h3>
                {error.includes('persona') && (
                  <Button asChild className="mt-4">
                    <Link href="/persona/create">
                      Create Your Persona
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  if (!bill || !persona) {
    return null
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Personalized Analysis</h1>
            <p className="text-gray-600">How this bill affects you specifically</p>
          </div>
        </div>

        {/* Bill Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{bill.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="font-mono">
                    {formatBillId(bill)}
                  </Badge>
                  {bill.policy_area ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {bill.policy_area}
                  </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Uncategorized
                    </Badge>
                  )}
                  {billPdfUrl && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <FileText className="h-3 w-3 mr-1" />
                      PDF Available
                    </Badge>
                  )}
                  {impactsLoading && (
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Analyzing Impact
                    </Badge>
                  )}
                </div>
              </div>
              {billPdfUrl && (
                <Button
                  variant="outline"
                  onClick={() => setShowPdfDialog(true)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Full Text
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Your Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Location</p>
                <p className="text-gray-600">{persona.location}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Occupation</p>
                <p className="text-gray-600">{persona.occupation}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Age</p>
                <p className="text-gray-600">{persona.age}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Dependents</p>
                <p className="text-gray-600">{persona.dependents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Impact Analysis */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">How This Bill Affects You</h2>
          
          {impactsLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Bill Impact</h3>
                  <p className="text-gray-600 mb-4">
                    AI is analyzing this bill text and your personal profile to generate customized impact assessments...
                  </p>
                  <div className="text-sm text-gray-500">
                    This may take 10-30 seconds depending on bill length
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : personalImpacts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Direct Impact Identified</h3>
                  <p className="text-gray-600">
                    Based on your persona, this bill doesn&apos;t appear to have significant direct impacts on your situation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {personalImpacts.map((impact, index) => (
                <EnhancedImpactCard
                  key={index}
                  impact={impact}
                  index={index}
                  billId={bill.bill_id}
                  onViewInPdf={handleViewInPdf}
                />
              ))}
            </div>
          )}
        </div>

        {/* Overall Bill Sentiment - Consolidated Voting Section */}
        {personalImpacts.length > 0 && !impactsLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Your Overall Position on This Bill</CardTitle>
              <p className="text-gray-600">
                Based on the impacts above, how do you feel about this bill overall?
              </p>
            </CardHeader>
            <CardContent>
                             <div className="pt-4">
                 <SentimentFeedback
                   userId={user?.id || ''}
                   billId={bill.bill_id}
                   showVoteCounts={true}
                   onFeedbackSubmit={(sentiment, comment) => {
                     console.log(`Overall feedback for bill ${bill.bill_id}:`, sentiment, comment)
                   }}
                   onFeedbackChange={(sentiment) => {
                     console.log(`Overall feedback for bill ${bill.bill_id}:`, sentiment)
                   }}
                 />
               </div>
            </CardContent>
          </Card>
        )}

        {/* Representative Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Your Representatives</CardTitle>
            <p className="text-gray-600">
              Find your representatives and send personalized AI-generated messages expressing your position on this legislation.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  We'll find your representatives for your location: <span className="font-medium">{persona.location}</span>
                </p>
              </div>
              
              {/* Single Representative Contact with both options */}
              <RepresentativeContact
                sentiment="support"
                billId={bill.bill_id || ''}
                billTitle={bill.title || 'Unknown Bill'}
                personaData={{
                  location: persona.location,
                  age: persona.age,
                  occupation: persona.occupation,
                  income_bracket: persona.income_bracket,
                  dependents: persona.dependents,
                  business_type: persona.business_type || undefined
                }}
                onMessageSent={(rep, message) => {
                  console.log(`Message sent to ${rep.first_name} ${rep.last_name}:`, message)
                }}
              />
              
              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Messages are AI-generated based on your persona and can be reviewed before sending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Take Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Want to provide feedback on this analysis or share your thoughts on how this bill affects you?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link href={`/bills/${bill.bill_id}`}>
                    View Full Bill Details
                  </Link>
                </Button>
                {billPdfUrl && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowPdfDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Read Original Text
                  </Button>
                )}
                <Button disabled>
                  Provide Feedback (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Viewer Dialog */}
        {billPdfUrl && (
          <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {bill.title}
                  {selectedSourceRef && (
                    <Badge variant="outline">
                      Viewing: {selectedSourceRef.sectionTitle || selectedSourceRef.sectionId}
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="h-[80vh] overflow-hidden">
                <AnalysisLinkedPDFViewer
                  fileUrl={billPdfUrl}
                  sourceReferences={allSourceReferences}
                  sections={billSections}
                  selectedReference={selectedSourceRef || undefined}
                  onReferenceSelect={(reference) => {
                    setSelectedSourceRef(reference)
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AuthGuard>
  )
} 