'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Users, GraduationCap, Heart, Building, Zap, Loader2 } from 'lucide-react'
import { AuthGuard } from '@/components/auth'
import Link from 'next/link'
import { getBillById, BillWithDetails, formatBillId } from '@/lib/bills'
import { personaUtils, PersonaRow } from '@/lib/supabase'
import { useAuthContext } from '@/lib/auth'
import { SentimentFeedback } from '@/components/feedback/SentimentFeedback'
import RepresentativeContact from '@/components/feedback/RepresentativeContact'

interface PersonalImpact {
  category: string
  impact: 'positive' | 'negative' | 'neutral'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  details: string[]
  icon: any
}

export default function BillAnalysis() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthContext()
  const [bill, setBill] = useState<BillWithDetails | null>(null)
  const [persona, setPersona] = useState<PersonaRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [personalImpacts, setPersonalImpacts] = useState<PersonalImpact[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        if (!user) {
          setError('Please log in to view personalized analysis')
          return
        }

        // Fetch bill data
        if (params.billId) {
          const fetchedBill = await getBillById(params.billId as string)
          setBill(fetchedBill)
          
          if (!fetchedBill) {
            setError('Bill not found')
            return
          }
        }

        // Fetch user's persona
        const userPersona = await personaUtils.getPersona(user.id)
        setPersona(userPersona)

        if (!userPersona) {
          setError('No persona found. Please create a persona first.')
          return
        }

        // Generate personalized analysis based on persona and bill
        if (params.billId && userPersona) {
          const impacts = generatePersonalImpacts(params.billId as string, userPersona)
          setPersonalImpacts(impacts)
        }

      } catch (err) {
        setError('Failed to load analysis')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.billId, user])

  const generatePersonalImpacts = (billId: string, persona: PersonaRow): PersonalImpact[] => {
    const impacts: PersonalImpact[] = []

    // Education Technology Bill Analysis
    if (billId === 'hr2025-118') {
      if (persona.occupation.toLowerCase().includes('teacher') || persona.occupation.toLowerCase().includes('education')) {
        impacts.push({
          category: 'Professional',
          impact: 'positive',
          severity: 'high',
          title: 'Major Benefits for Educators',
          description: 'This bill directly supports your profession with funding and resources.',
          details: [
            '$5 billion in federal funding for school technology upgrades',
            'Mandatory teacher training programs for technology integration',
            'Tax incentives for technology companies donating to schools',
            'Enhanced cybersecurity requirements for educational systems'
          ],
          icon: GraduationCap
        })
      }
      
      if (persona.dependents > 0) {
        impacts.push({
          category: 'Family',
          impact: 'positive',
          severity: 'medium',
          title: 'Benefits for Your Children',
          description: 'Your dependents will benefit from improved educational technology.',
          details: [
            'Enhanced digital literacy curriculum for all grade levels',
            'Expanded high-speed internet access in schools',
            'Better technology infrastructure in classrooms',
            'Improved educational outcomes through technology'
          ],
          icon: Users
        })
      }

      if (persona.location.toLowerCase().includes('rural') || persona.school_district?.toLowerCase().includes('rural')) {
        impacts.push({
          category: 'Community',
          impact: 'positive',
          severity: 'high',
          title: 'Rural Education Enhancement',
          description: 'Special provisions for rural school districts like yours.',
          details: [
            'Expanded access to high-speed internet in rural schools',
            'Priority funding for rural technology infrastructure',
            'Reduced digital divide in rural communities'
          ],
          icon: Building
        })
      }
    }

    // Small Business Tax Relief Bill Analysis
    if (billId === 'hr2100-118') {
      if (persona.business_type) {
        impacts.push({
          category: 'Business',
          impact: 'positive',
          severity: 'high',
          title: 'Direct Tax Relief for Your Business',
          description: 'Significant tax benefits for your small business.',
          details: [
            'Extension of Section 199A deduction through 2030',
            'Increased startup deduction limits from $5,000 to $25,000',
            'Simplified tax filing procedures for small businesses',
            'Expansion of R&D tax credits',
            'Access to $2 billion loan guarantee program'
          ],
          icon: DollarSign
        })
      }

      if (persona.income_bracket === 'Under $50,000' || persona.income_bracket === '$50,000 - $100,000') {
        impacts.push({
          category: 'Financial',
          impact: 'positive',
          severity: 'medium',
          title: 'Tax Savings for Your Income Level',
          description: 'Small business benefits may reduce your tax burden.',
          details: [
            'Simplified tax procedures may reduce preparation costs',
            'Potential for increased business opportunities',
            'Economic growth benefits from small business support'
          ],
          icon: TrendingUp
        })
      }

      if (persona.employee_count && persona.employee_count < 100) {
        impacts.push({
          category: 'Employment',
          impact: 'positive',
          severity: 'high',
          title: 'Perfect Fit for Your Business Size',
          description: 'This bill specifically targets businesses with fewer than 100 employees.',
          details: [
            'All major provisions apply to your business size',
            'Reduced regulatory burden in innovation zones',
            'Streamlined SBA loan applications (90 days to 30 days)',
            'Enhanced competitiveness against larger corporations'
          ],
          icon: Building
        })
      }
    }

    // Medicare Bill Analysis
    if (billId === 'hr2200-118') {
      if (persona.has_medicare) {
        impacts.push({
          category: 'Healthcare',
          impact: 'positive',
          severity: 'high',
          title: 'Major Medicare Benefits',
          description: 'Direct savings and expanded coverage for Medicare beneficiaries.',
          details: [
            'Annual out-of-pocket prescription costs capped at $2,000',
            'Medicare can negotiate prices for up to 200 drugs annually',
            'Extended coverage for dental, vision, and hearing services',
            'Protection against price increases above inflation'
          ],
          icon: Heart
        })
      }

      if (persona.age >= 60) {
        impacts.push({
          category: 'Future Benefits',
          impact: 'positive',
          severity: 'medium',
          title: 'Near-Term Medicare Eligibility',
          description: 'You may benefit from lowered Medicare eligibility age.',
          details: [
            'Medicare eligibility age lowered to 60 for qualifying individuals',
            'Expanded coverage options for pre-Medicare years',
            'Enhanced prescription drug benefits when you qualify'
          ],
          icon: TrendingUp
        })
      }

      if (persona.income_bracket === 'Under $50,000' || persona.income_bracket === '$50,000 - $100,000') {
        impacts.push({
          category: 'Financial',
          impact: 'positive',
          severity: 'medium',
          title: 'Healthcare Cost Relief',
          description: 'Lower prescription costs benefit your income level.',
          details: [
            'Significant savings on prescription medications',
            'Reduced financial burden of healthcare costs',
            'Enhanced financial security for medical expenses'
          ],
          icon: DollarSign
        })
      }
    }

    // Broadband Bill Analysis
    if (billId === 'hr2300-118') {
      if (persona.location.toLowerCase().includes('rural') || persona.location.toLowerCase().includes('small town')) {
        impacts.push({
          category: 'Infrastructure',
          impact: 'positive',
          severity: 'high',
          title: 'Rural Broadband Access',
          description: 'This bill specifically targets rural areas like yours.',
          details: [
            '$15 billion investment in rural broadband infrastructure',
            'Grants for areas with speeds below 25 Mbps',
            'Subsidies for low-income households',
            'Streamlined permitting for broadband projects'
          ],
          icon: Zap
        })
      }

      if (persona.business_type) {
        impacts.push({
          category: 'Business',
          impact: 'positive',
          severity: 'medium',
          title: 'Enhanced Business Connectivity',
          description: 'Better broadband infrastructure supports your business.',
          details: [
            'Improved internet speeds for business operations',
            'Enhanced competitiveness in digital markets',
            'Better access to online customers and suppliers',
            'Reduced operational costs from better connectivity'
          ],
          icon: Building
        })
      }

      if (persona.income_bracket === 'Under $50,000') {
        impacts.push({
          category: 'Financial',
          impact: 'positive',
          severity: 'medium',
          title: 'Affordable Internet Access',
          description: 'Subsidies and affordable service plans for your income level.',
          details: [
            'Subsidies for low-income households',
            'Requirements for affordable service plans',
            'Reduced digital divide impact on your household'
          ],
          icon: DollarSign
        })
      }
    }

    // Environmental Bill Analysis
    if (billId === 'hr2400-118') {
      if (persona.business_type === 'Agriculture' || persona.business_type === 'Energy') {
        impacts.push({
          category: 'Business',
          impact: 'positive',
          severity: 'high',
          title: 'Green Business Opportunities',
          description: 'Significant opportunities in your industry sector.',
          details: [
            '$100 billion in clean energy infrastructure grants',
            'Extended renewable energy tax credits',
            'Support for transitioning energy industries',
            'New market opportunities in clean energy'
          ],
          icon: Building
        })
      }

      if (persona.age >= 18 && persona.age <= 35) {
        impacts.push({
          category: 'Employment',
          impact: 'positive',
          severity: 'medium',
          title: 'Job Creation Opportunities',
          description: 'New employment opportunities in clean energy sector.',
          details: [
            'Creation of civilian climate corps (300,000 workers)',
            'Workforce development in clean energy',
            'Priority for disadvantaged communities',
            'Long-term career opportunities in growing sector'
          ],
          icon: Users
        })
      }

      // Environmental justice component
      if (persona.income_bracket === 'Under $50,000' || persona.income_bracket === '$50,000 - $100,000') {
        impacts.push({
          category: 'Community',
          impact: 'positive',
          severity: 'medium',
          title: 'Environmental Justice Benefits',
          description: '40% of benefits targeted to disadvantaged communities.',
          details: [
            'Environmental justice provisions for lower-income communities',
            'Priority access to clean energy programs',
            'Health benefits from reduced pollution',
            'Community investment in clean infrastructure'
          ],
          icon: Heart
        })
      }
    }

    // Young Adult Economic Security Act Analysis
    if (billId === 'hr2500-118') {
      if (persona.age >= 18 && persona.age <= 30) {
        impacts.push({
          category: 'Direct Benefits',
          impact: 'positive',
          severity: 'high',
          title: 'Major Benefits for Young Adults',
          description: 'This bill is specifically designed for people your age with comprehensive support.',
          details: [
            '$15,000 annual student loan forgiveness for those earning under $50,000',
            'Free community college tuition for students under 25',
            'Expanded Medicaid coverage for all individuals under 26',
            'Young adult job training programs',
            'Mental health services designed for your demographic'
          ],
          icon: Users
        })
      }

      if (persona.income_bracket === 'Under $50,000' || persona.income_bracket === 'Under $25,000') {
        impacts.push({
          category: 'Financial',
          impact: 'positive',
          severity: 'high',
          title: 'Significant Income and Cost Relief',
          description: 'Multiple provisions specifically target your income level.',
          details: [
            'Federal minimum wage increase to $18/hour',
            'Student loan forgiveness eligibility (earning under $50,000)',
            'Up to $25,000 in first-time homebuyer down payment assistance',
            'Expanded SNAP benefits for young adults without dependents',
            'Reduced healthcare costs through Medicaid expansion'
          ],
          icon: DollarSign
        })
      }

      if (persona.location.toLowerCase().includes('denver') || persona.location.toLowerCase().includes('colorado')) {
        impacts.push({
          category: 'Local Impact',
          impact: 'positive',
          severity: 'medium',
          title: 'Denver/Colorado Specific Benefits',
          description: 'Major city transportation and housing benefits.',
          details: [
            '$50 billion public transportation investment in major cities like Denver',
            'First-time homebuyer assistance in expensive markets',
            'Sponsored by Rep. Alexandria Martinez from Colorado',
            'Enhanced job training programs in urban areas'
          ],
          icon: Building
        })
      }

      if (persona.dependents === 0) {
        impacts.push({
          category: 'Single Adult Benefits',
          impact: 'positive',
          severity: 'medium',
          title: 'Benefits for Adults Without Dependents',
          description: 'Specific provisions for young adults without children.',
          details: [
            'Expanded SNAP benefits for young adults without dependents',
            'Healthcare coverage regardless of family status',
            'Housing assistance for single young adults',
            'Individual-focused job training and career development'
          ],
          icon: CheckCircle
        })
      }

      if (persona.has_higher_education || persona.age <= 25) {
        impacts.push({
          category: 'Education',
          impact: 'positive',
          severity: 'high',
          title: 'Education and Career Development',
          description: 'Strong support for educational advancement and career building.',
          details: [
            'Free community college tuition for students under 25',
            'Student loan forgiveness reducing debt burden',
            'Career-focused job training programs',
            'Enhanced opportunities for skill development'
          ],
          icon: GraduationCap
        })
      }
    }

    return impacts
  }

  const getImpactColor = (impact: string, severity: string) => {
    if (impact === 'positive') {
      return severity === 'high' ? 'bg-green-100 text-green-800' : 
             severity === 'medium' ? 'bg-green-50 text-green-700' : 'bg-green-25 text-green-600'
    } else if (impact === 'negative') {
      return severity === 'high' ? 'bg-red-100 text-red-800' : 
             severity === 'medium' ? 'bg-red-50 text-red-700' : 'bg-red-25 text-red-600'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'positive': return CheckCircle
      case 'negative': return AlertTriangle
      default: return TrendingUp
    }
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
                  <Badge variant="secondary">
                    {bill.policy_area}
                  </Badge>
                </div>
              </div>
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
          
          {personalImpacts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Direct Impact Identified</h3>
                  <p className="text-gray-600">
                    Based on your persona, this bill doesn't appear to have significant direct impacts on your situation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {personalImpacts.map((impact, index) => {
                const IconComponent = impact.icon
                const ImpactIcon = getImpactIcon(impact.impact)
                
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconComponent className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{impact.title}</CardTitle>
                            <p className="text-sm text-gray-600">{impact.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getImpactColor(impact.impact, impact.severity)}>
                            <ImpactIcon className="h-3 w-3 mr-1" />
                            {impact.impact} - {impact.severity}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{impact.description}</p>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium text-gray-900 mb-2">Specific impacts:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {impact.details.map((detail, idx) => (
                              <li key={idx}>{detail}</li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Sentiment Feedback */}
                        <div className="pt-3 border-t border-gray-100">
                          <SentimentFeedback
                            billId={bill.bill_id}
                            sectionId={`impact-${index}`}
                            sectionTitle={impact.title}
                            userId={user?.id}
                            onFeedbackChange={(sentiment) => {
                              console.log(`Feedback for ${impact.title}:`, sentiment)
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Representative Contact */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Contact Your Representatives</h2>
          <p className="text-gray-600">
            Based on your sentiment feedback, send a personalized message to your representatives about how you feel about this legislation.
          </p>
          
          {/* Support Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-green-700">If you Support this bill:</h3>
            <RepresentativeContact
              sentiment="support"
              billId={bill.bill_id || ''}
              billTitle={bill.title || 'Unknown Bill'}
              personaData={persona}
              onMessageSent={(rep, message) => {
                console.log(`Message sent to ${rep.first_name} ${rep.last_name}:`, message)
              }}
            />
          </div>
          
          {/* Oppose Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-red-700">If you Oppose this bill:</h3>
            <RepresentativeContact
              sentiment="oppose"
              billId={bill.bill_id || ''}
              billTitle={bill.title || 'Unknown Bill'}
              personaData={persona}
              onMessageSent={(rep, message) => {
                console.log(`Message sent to ${rep.first_name} ${rep.last_name}:`, message)
              }}
            />
          </div>
        </div>

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
                <Button disabled>
                  Provide Feedback (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
} 