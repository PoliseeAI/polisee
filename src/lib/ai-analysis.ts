import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { SourceReference } from '@/components/ui/source-citation'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Users, 
  GraduationCap, 
  Heart, 
  Building, 
  Zap 
} from 'lucide-react'

// Type for AI analysis response
interface AIAnalysisResponse {
  impacts: Array<{
    category: string
    impact: 'positive' | 'negative' | 'neutral'
    severity: 'low' | 'medium' | 'high'
    title: string
    description: string
    details: string[]
    relevance_score: number
  }>
}

// Icon mapping
const CATEGORY_ICONS = {
  'Education': GraduationCap,
  'Healthcare': Heart,
  'Business': Building,
  'Employment': Users,
  'Taxation': DollarSign,
  'Social Security': CheckCircle,
  'Housing': Building,
  'Environment': Zap,
  'Agriculture': Building,
  'Transportation': Building,
  'Financial': DollarSign,
  'Food Security': AlertTriangle,
  'Energy': Zap,
  'Future Planning': TrendingUp,
  'Economic': TrendingUp,
  'Community': Users,
  'Professional': GraduationCap,
  'Family': Users,
  'Infrastructure': Building,
  'Local Impact': Building
}

export async function analyzeImpactsWithAI(
  billText: string,
  billTitle: string,
  persona: PersonaRow,
  sourceReferences: SourceReference[]
): Promise<PersonalImpact[]> {
  try {
    // Call our secure API route instead of OpenAI directly
    const response = await fetch('/api/analyze-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billText,
        billTitle,
        persona
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status}`)
    }
    
    const aiResponse: AIAnalysisResponse = await response.json()
    
    // Convert AI response to PersonalImpact format
    const impacts = convertAIResponseToImpacts(aiResponse, sourceReferences)
    
    return impacts.slice(0, 6) // Return top 6 most relevant impacts
    
  } catch (error) {
    console.error('AI analysis failed, falling back to basic analysis:', error)
    // Fallback to basic keyword-based analysis if AI fails
    return generateBasicImpacts(billText, persona, sourceReferences)
  }
}



function convertAIResponseToImpacts(
  aiResponse: AIAnalysisResponse, 
  sourceReferences: SourceReference[]
): PersonalImpact[] {
  return aiResponse.impacts.map(impact => {
    // Find relevant source references based on category keywords
    const categoryKeywords = getCategoryKeywords(impact.category)
    const relevantSources = sourceReferences.filter(ref => 
      categoryKeywords.some(keyword => 
        ref.text.toLowerCase().includes(keyword.toLowerCase())
      )
    ).slice(0, 3)
    
    return {
      category: impact.category,
      impact: impact.impact,
      severity: impact.severity,
      title: impact.title,
      description: impact.description,
      details: impact.details,
      icon: CATEGORY_ICONS[impact.category as keyof typeof CATEGORY_ICONS] || TrendingUp,
      sourceReferences: relevantSources
    }
  }).sort((a, b) => {
    // Sort by severity (high > medium > low)
    const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

function getCategoryKeywords(category: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    'Education': ['education', 'school', 'student', 'teacher', 'university', 'college'],
    'Healthcare': ['health', 'medical', 'medicare', 'medicaid', 'insurance', 'hospital'],
    'Business': ['business', 'small business', 'tax credit', 'deduction', 'commerce'],
    'Employment': ['employment', 'job', 'worker', 'employee', 'wage', 'salary'],
    'Taxation': ['tax', 'taxation', 'deduction', 'credit', 'income tax'],
    'Social Security': ['social security', 'disability', 'retirement', 'benefits'],
    'Housing': ['housing', 'home', 'mortgage', 'rent', 'property'],
    'Environment': ['environment', 'climate', 'energy', 'renewable', 'pollution'],
    'Agriculture': ['agriculture', 'farm', 'farmer', 'crop', 'livestock'],
    'Transportation': ['transportation', 'highway', 'road', 'infrastructure'],
    'Financial': ['financial', 'banking', 'credit', 'loan', 'debt'],
    'Food Security': ['SNAP', 'food stamp', 'food assistance', 'nutrition']
  }
  
  return keywordMap[category] || [category.toLowerCase()]
}

// Fallback function for when AI is not available
function generateBasicImpacts(
  billText: string,
  persona: PersonaRow,
  sourceReferences: SourceReference[]
): PersonalImpact[] {
  const impacts: PersonalImpact[] = []
  
  // Basic tax impact analysis
  if (billText.toLowerCase().includes('tax')) {
    impacts.push({
      category: 'Taxation',
      impact: 'neutral',
      severity: 'medium',
      title: 'Tax Changes May Affect You',
      description: 'This bill contains tax provisions that may impact your situation.',
      details: [
        'Tax provisions are included in this legislation',
        'Impact depends on your specific tax situation',
        'Consult a tax professional for detailed analysis',
        'Changes may affect future tax filings'
      ],
      icon: DollarSign,
      sourceReferences: sourceReferences.filter(ref => 
        ref.text.toLowerCase().includes('tax')
      ).slice(0, 3)
    })
  }
  
  // Basic healthcare impact
  if ((persona.has_medicare || persona.has_health_insurance) && 
      billText.toLowerCase().includes('health')) {
    impacts.push({
      category: 'Healthcare',
      impact: 'neutral',
      severity: 'medium',
      title: 'Healthcare System Changes',
      description: 'Healthcare provisions may affect your coverage or costs.',
      details: [
        'Healthcare-related provisions are included',
        'May impact insurance coverage or costs',
        'Review with your healthcare provider',
        'Monitor implementation timeline'
      ],
      icon: Heart,
      sourceReferences: sourceReferences.filter(ref => 
        ref.text.toLowerCase().includes('health')
      ).slice(0, 3)
    })
  }
  
  return impacts
} 