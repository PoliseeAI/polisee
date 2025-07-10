'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, AlertTriangle, BookOpen, CheckCircle2, Circle, Loader2, FileText } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillById, BillWithDetails, formatBillId } from '@/lib/bills'
import { personaUtils, PersonaRow } from '@/lib/supabase'
import { useAuthContext } from '@/lib/auth'
import { TextSourceViewer } from '@/components/ui/text-source-viewer'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnhancedImpactCard, PersonalImpact } from '@/components/ui/enhanced-impact-card'
import RepresentativeContact from '@/components/feedback/RepresentativeContact'
import { SentimentFeedback } from '@/components/feedback/SentimentFeedback'
import { ClientAnalysisAgent, AgentStatus } from '@/lib/agent/ClientAnalysisAgent'

// A new component to render the agent's status in real-time
const AgentStatusDisplay = ({ status }: { status: AgentStatus | null }) => {
  if (!status) return null;

  const steps = [
    'Initializing',
    'Breaking down bill text',
    'Searching web for context',
    'Analyzing with AI',
    'Formatting final report',
    'Complete',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Agent at Work...</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="ml-4 text-lg font-semibold text-gray-800">{status.message}</p>
        </div>
        <ul className="space-y-3">
          {steps.map((stepName, index) => {
            const stepNumber = index + 1;
            const isCompleted = status.isComplete || status.step > stepNumber;
            const isCurrent = status.step === stepNumber && !status.isComplete;
            
            return (
              <li key={stepName} className="flex items-center text-sm transition-all duration-300">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 mr-3 text-green-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 mr-3 animate-spin text-blue-500" />
                ) : (
                  <Circle className="h-5 w-5 mr-3 text-gray-300" />
                )}
                <span className={
                  isCompleted ? "text-gray-500 line-through" :
                  isCurrent ? "font-semibold text-gray-900" :
                  "text-gray-400"
                }>
                  {stepName}
                </span>
              </li>
            );
          })}
        </ul>
        {status.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-semibold">An error occurred:</p>
                <p className="text-sm text-red-600">{status.error}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function BillAnalysis() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [fullBillText, setFullBillText] = useState<string>('') // Keep this for the source viewer
  const [persona, setPersona] = useState<PersonaRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personalImpacts, setPersonalImpacts] = useState<PersonalImpact[]>([])
  const [impactsLoading, setImpactsLoading] = useState(false)
  const [showSourceDialog, setShowSourceDialog] = useState(false)
  const [selectedSource, setSelectedSource] = useState<PersonalImpact['source'] | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!params.billId || !user?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [fetchedBill, userPersona] = await Promise.all([
          getBillById(params.billId as string),
          personaUtils.getPersona(user.id),
        ]);
        
        if (!fetchedBill) {
          setError(`Bill not found in local database. This bill (ID: ${params.billId}) may be from the external search results.`);
          return;
        }
        if (!userPersona) {
          setError('No persona found. Please create a persona first.');
          return;
        }
        setBill(fetchedBill);
        setFullBillText(fetchedBill.text || 'No text available for this bill.');
        setPersona(userPersona);
      } catch (err: any) {
        setError('Failed to load initial data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.billId, user]);

  useEffect(() => {
    const runAnalysis = async () => {
      if (bill && persona) {
        setImpactsLoading(true);
        setPersonalImpacts([]);
        setError(null);

        const onStatusUpdate = (status: AgentStatus) => {
          setAgentStatus(status);
        };

        try {
          const agent = new ClientAnalysisAgent(bill, persona, onStatusUpdate);
          const impacts = await agent.analyze();
          setPersonalImpacts(impacts);
        } catch (error: any) {
          setError(error.message || 'An unknown error occurred during analysis.');
        } finally {
          setImpactsLoading(false);
        }
      }
    };
    runAnalysis();
  }, [bill, persona]);

  const handleViewSource = (source: PersonalImpact['source']) => {
    if (source) {
        setSelectedSource(source);
        setShowSourceDialog(true);
    }
  };

  const handleViewFullText = () => {
    handleViewSource({ text: fullBillText, sectionTitle: 'Full Bill Text' });
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analysis data...</span>
        </div>
      </AuthGuard>
    )
  }
  
  // This error state is for initial data loading errors
  if (error && !impactsLoading) {
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
            <CardContent className="pt-6 text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  {error.includes('persona') ? 'Persona Required' : 'Bill Not Available'}
                </h3>
                <p className="text-red-600 mb-4">{error}</p>
                {/* ... button logic from original file ... */}
            </CardContent>
          </Card>
        </div>
      </AuthGuard>
    )
  }

  if (!bill || !persona) {
    return null;
  }

  // --- Main Render Logic ---
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
                  <Badge variant="outline" className="font-mono">{formatBillId(bill)}</Badge>
                  {bill.policy_area && <Badge variant="secondary">{bill.policy_area}</Badge>}
                </div>
              </div>
              <Button variant="outline" onClick={handleViewFullText}>
                <BookOpen className="h-4 w-4 mr-2" />
                View Full Text
              </Button>
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
              <div><p className="font-medium">Location</p><p>{persona.location}</p></div>
              <div><p className="font-medium">Occupation</p><p>{persona.occupation}</p></div>
              <div><p className="font-medium">Age</p><p>{persona.age}</p></div>
              <div><p className="font-medium">Dependents</p><p>{persona.dependents}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Impact Analysis */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">How This Bill Affects You</h2>
          
          {impactsLoading ? (
            <AgentStatusDisplay status={agentStatus} />
          ) : personalImpacts.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Direct Impact Identified</h3>
                <p className="text-gray-600">
                  {agentStatus?.error 
                    ? `Analysis failed: ${agentStatus.error}`
                    : "Based on your persona, our agent didn't identify significant direct impacts."}
                </p>
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
                  onViewSource={() => handleViewSource(impact.source)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Overall Bill Sentiment */}
        {personalImpacts.length > 0 && !impactsLoading && (
          <Card>
            <CardHeader>
              <CardTitle>Your Overall Position on This Bill</CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentFeedback
                userId={user?.id || ''}
                billId={bill.bill_id}
                showVoteCounts={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Representative Contact */}
        <Card>
            <CardHeader>
                <CardTitle>Contact Your Representatives</CardTitle>
            </CardHeader>
            <CardContent>
                <RepresentativeContact
                    sentiment="support" // This should be dynamic
                    billId={bill.bill_id}
                    billTitle={bill.title || ''}
                    personaData={persona}
                />
            </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Take Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline">
                <Link href={`/bills/${bill.bill_id}`}>View Full Bill Details</Link>
              </Button>
              <Button variant="outline" onClick={handleViewFullText}>
                <FileText className="h-4 w-4 mr-2" /> Read Original Text
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Text Source Viewer Dialog */}
        <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedSource?.sectionTitle || "Bill Text"}</DialogTitle>
            </DialogHeader>
            <TextSourceViewer
              title={selectedSource?.sectionTitle || "Bill Text"}
              fullText={fullBillText}
              sourceText={selectedSource?.text || ""}
              onClose={() => setShowSourceDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  )
}