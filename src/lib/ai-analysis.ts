import { PersonaRow } from '@/lib/supabase'
import { PersonalImpact } from '@/components/ui/enhanced-impact-card'
import { TextChunk } from './text-chunker' // Import TextChunk
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
    source_chunk_id?: string // The ID of the chunk used as a source
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
  'Local Impact': Building,
  'Government Operations': Building,
  'Veterans Affairs': Users,
  'Postal Service': Building,
  'Legal': CheckCircle
}

export async function analyzeImpactsWithAI(
  billTitle: string,
  persona: PersonaRow,
  textChunks: TextChunk[]
): Promise<PersonalImpact[]> {
  try {
    console.log('Starting AI analysis for bill:', billTitle)
    console.log('Number of text chunks:', textChunks.length)
    
    // Call our secure API route instead of OpenAI directly
    const response = await fetch('/api/analyze-bill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        textChunks: textChunks,
        billTitle: billTitle,
        persona: persona
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('API error:', error)
      throw new Error(error.error || `API error: ${response.status}`)
    }
    
    const aiResponse: AIAnalysisResponse = await response.json()
    console.log('AI analysis completed, found', aiResponse.impacts?.length || 0, 'impacts')
    
    // Convert AI response to PersonalImpact format
    const impacts = convertAIResponseToImpacts(aiResponse, textChunks) // Pass chunks
    
    return impacts.slice(0, 6) // Return top 6 most relevant impacts
    
  } catch (error) {
    console.error('AI analysis failed, falling back to enhanced analysis:', error)
    // Fallback to enhanced keyword-based analysis if AI fails
    const fullText = textChunks.map(c => c.content).join('\n\n')
    return generateEnhancedImpacts(fullText, billTitle, persona, textChunks) // Pass chunks to fallback
  }
}

function convertAIResponseToImpacts(
  aiResponse: AIAnalysisResponse, 
  textChunks: TextChunk[] // Updated parameter
): PersonalImpact[] {
  if (!aiResponse.impacts || aiResponse.impacts.length === 0) {
    return []
  }

  return aiResponse.impacts.map(impact => {
    // Find the source chunk cited by the AI
    const sourceChunk = impact.source_chunk_id 
      ? textChunks.find(c => c.id === impact.source_chunk_id)
      : null;

    return {
      category: impact.category,
      impact: impact.impact,
      severity: impact.severity,
      title: impact.title,
      description: impact.description,
      details: impact.details,
      icon: CATEGORY_ICONS[impact.category as keyof typeof CATEGORY_ICONS] || TrendingUp,
      source: sourceChunk ? {
        text: sourceChunk.content,
        sectionTitle: `Referenced from paragraph ${sourceChunk.id.split('-')[1]}`
      } : undefined
    }
  }).sort((a, b) => {
    // Sort by severity (high > medium > low)
    const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })
}

function getCategoryKeywords(category: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    'Education': ['education', 'school', 'student', 'teacher', 'university', 'college', 'learning', 'academic'],
    'Healthcare': ['health', 'medical', 'medicare', 'medicaid', 'insurance', 'hospital', 'care', 'treatment'],
    'Business': ['business', 'small business', 'tax credit', 'deduction', 'commerce', 'entrepreneur', 'company'],
    'Employment': ['employment', 'job', 'worker', 'employee', 'wage', 'salary', 'work', 'career'],
    'Taxation': ['tax', 'taxation', 'deduction', 'credit', 'income tax', 'refund', 'irs'],
    'Social Security': ['social security', 'disability', 'retirement', 'benefits', 'pension'],
    'Housing': ['housing', 'home', 'mortgage', 'rent', 'property', 'apartment', 'real estate'],
    'Environment': ['environment', 'climate', 'energy', 'renewable', 'pollution', 'conservation'],
    'Agriculture': ['agriculture', 'farm', 'farmer', 'crop', 'livestock', 'food', 'rural'],
    'Transportation': ['transportation', 'highway', 'road', 'infrastructure', 'transit', 'vehicle'],
    'Financial': ['financial', 'banking', 'credit', 'loan', 'debt', 'investment', 'money'],
    'Food Security': ['SNAP', 'food stamp', 'food assistance', 'nutrition', 'hunger', 'meal'],
    'Government Operations': ['government', 'federal', 'administration', 'agency', 'department'],
    'Veterans Affairs': ['veteran', 'military', 'service', 'armed forces', 'va', 'benefits'],
    'Postal Service': ['postal', 'mail', 'post office', 'usps', 'delivery'],
    'Legal': ['legal', 'law', 'court', 'justice', 'attorney', 'litigation']
  }
  
  return keywordMap[category] || [category.toLowerCase()]
}

// Enhanced fallback function for when AI is not available
function generateEnhancedImpacts(
  billText: string,
  billTitle: string,
  persona: PersonaRow,
  textChunks: TextChunk[] // Updated parameter
): PersonalImpact[] {
  console.log('Generating enhanced impacts for bill:', billTitle)
  
  const impacts: PersonalImpact[] = []
  const textLower = billText.toLowerCase()
  const titleLower = billTitle.toLowerCase()
  
  // Check if this is a post office naming bill (very common)
  if (titleLower.includes('post office') || titleLower.includes('postal service') || 
      titleLower.includes('designate the facility')) {
    impacts.push({
      category: 'Community',
      impact: 'neutral',
      severity: 'low',
      title: 'Local Post Office Recognition',
      description: 'This bill designates or renames a local postal facility.',
      details: [
        'Recognizes community members or veterans',
        'No direct impact on postal services',
        'Symbolic importance to local community',
        'No cost to taxpayers for operations'
      ],
      icon: Building,
      source: textChunks.length > 0 ? { text: textChunks[0].content, sectionTitle: 'Preamble' } : undefined
    })
  }
  
  // Enhanced tax impact analysis
  if (textLower.includes('tax') || textLower.includes('deduction') || 
      textLower.includes('credit') || textLower.includes('income')) {
    const isPositive = textLower.includes('credit') || textLower.includes('deduction') || 
                      textLower.includes('reduce') || textLower.includes('lower')
    
    impacts.push({
      category: 'Taxation',
      impact: isPositive ? 'positive' : 'neutral',
      severity: 'medium',
      title: isPositive ? 'Potential Tax Benefits' : 'Tax Changes May Apply',
      description: isPositive ? 'This bill may provide tax benefits for your situation.' : 
                   'This bill contains tax provisions that may impact your situation.',
      details: [
        'Tax provisions are included in this legislation',
        `May affect ${persona.income_bracket} income earners`,
        persona.business_type ? 'May impact business taxes' : 'May impact personal taxes',
        'Consult a tax professional for detailed analysis'
      ],
      icon: DollarSign,
      source: textChunks.find(c => c.content.toLowerCase().includes('tax')) 
              ? { text: textChunks.find(c => c.content.toLowerCase().includes('tax'))!.content } 
              : undefined
    })
  }
  
  // Enhanced healthcare impact
  if (textLower.includes('health') || textLower.includes('medical') || 
      textLower.includes('medicare') || textLower.includes('medicaid')) {
    const relevantToUser = persona.has_medicare || persona.has_health_insurance || 
                          persona.age >= 65
    
    if (relevantToUser) {
      impacts.push({
        category: 'Healthcare',
        impact: 'neutral',
        severity: 'medium',
        title: 'Healthcare System Changes',
        description: 'Healthcare provisions may affect your coverage or costs.',
        details: [
          'Healthcare-related provisions are included',
          persona.has_medicare ? 'May impact Medicare coverage' : 'May impact insurance coverage',
          persona.age >= 65 ? 'Senior-specific provisions may apply' : 'May affect insurance costs',
          'Monitor implementation timeline'
        ],
        icon: Heart,
        source: textChunks.find(c => c.content.toLowerCase().includes('health'))
                ? { text: textChunks.find(c => c.content.toLowerCase().includes('health'))!.content }
                : undefined
      })
    }
  }
  
  // Social Security impact
  if (textLower.includes('social security') || textLower.includes('retirement') || 
      textLower.includes('disability benefits')) {
    const relevantToUser = persona.has_social_security || persona.age >= 62
    
    if (relevantToUser) {
      impacts.push({
        category: 'Social Security',
        impact: 'neutral',
        severity: 'high',
        title: 'Social Security Changes',
        description: 'This bill may affect Social Security benefits or eligibility.',
        details: [
          'Social Security provisions are included',
          persona.has_social_security ? 'May impact your current benefits' : 'May affect future eligibility',
          persona.age >= 62 ? 'May affect retirement benefits' : 'May impact future retirement',
          'Monitor changes to benefit calculations'
        ],
        icon: CheckCircle,
        source: textChunks.find(c => c.content.toLowerCase().includes('social security'))
                ? { text: textChunks.find(c => c.content.toLowerCase().includes('social security'))!.content }
                : undefined
      })
    }
  }
  
  // Employment impact
  if (textLower.includes('employment') || textLower.includes('job') || 
      textLower.includes('worker') || textLower.includes('wage')) {
    impacts.push({
      category: 'Employment',
      impact: 'neutral',
      severity: 'medium',
      title: 'Employment-Related Changes',
      description: 'This bill may affect employment policies or worker benefits.',
      details: [
        'Employment provisions are included',
        `May impact ${persona.occupation} workers`,
        persona.business_type ? 'May affect business employment practices' : 'May impact worker protections',
        'Could affect wages or benefits'
      ],
      icon: Users,
      source: textChunks.find(c => c.content.toLowerCase().includes('employment'))
                ? { text: textChunks.find(c => c.content.toLowerCase().includes('employment'))!.content }
                : undefined
      })
  }
  
  // Education impact
  if (textLower.includes('education') || textLower.includes('school') || 
      textLower.includes('student') || textLower.includes('college')) {
    const relevantToUser = persona.has_higher_education || persona.dependents > 0 || 
                          persona.school_district
    
    if (relevantToUser) {
      impacts.push({
        category: 'Education',
        impact: 'neutral',
        severity: 'medium',
        title: 'Education System Changes',
        description: 'This bill may affect educational policies or funding.',
        details: [
          'Education provisions are included',
          persona.dependents > 0 ? `May impact your ${persona.dependents} dependent(s)` : 'May affect educational access',
          persona.school_district ? `May impact ${persona.school_district} school district` : 'May affect local schools',
          'Could change educational funding or policies'
        ],
        icon: GraduationCap,
        source: textChunks.find(c => c.content.toLowerCase().includes('education'))
                ? { text: textChunks.find(c => c.content.toLowerCase().includes('education'))!.content }
                : undefined
      })
    }
  }
  
  // Business impact
  if (textLower.includes('business') || textLower.includes('small business') || 
      textLower.includes('commerce') || textLower.includes('entrepreneur')) {
    const relevantToUser = persona.business_type || persona.employee_count
    
    if (relevantToUser) {
      impacts.push({
        category: 'Business',
        impact: 'neutral',
        severity: 'medium',
        title: 'Business-Related Changes',
        description: 'This bill may affect business operations or regulations.',
        details: [
          'Business provisions are included',
          persona.business_type ? `May impact ${persona.business_type} businesses` : 'May affect business regulations',
          persona.employee_count ? `May affect businesses with ${persona.employee_count} employees` : 'May impact small businesses',
          'Could change business compliance requirements'
        ],
        icon: Building,
        source: textChunks.find(c => c.content.toLowerCase().includes('business'))
                ? { text: textChunks.find(c => c.content.toLowerCase().includes('business'))!.content }
                : undefined
      })
    }
  }
  
  // If no specific impacts found, provide a general assessment
  if (impacts.length === 0) {
    const billLength = billText.length
    const isComplex = billLength > 10000
    
    impacts.push({
      category: 'General',
      impact: 'neutral',
      severity: 'low',
      title: 'Limited Direct Impact',
      description: `This ${isComplex ? 'complex' : 'focused'} bill may have indirect effects on your situation.`,
      details: [
        `${isComplex ? 'Complex legislation' : 'Focused legislation'} with specific scope`,
        'May have indirect effects on your community',
        'Could impact government operations or services',
        'Monitor for implementation details'
      ],
      icon: TrendingUp,
      source: textChunks.length > 0 ? { text: textChunks[0].content, sectionTitle: 'Overview' } : undefined
    })
  }
  
  console.log('Generated', impacts.length, 'enhanced impacts')
  return impacts
} 