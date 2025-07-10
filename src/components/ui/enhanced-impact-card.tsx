'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Badge } from './badge'
import { 
  ChevronDown, 
  ChevronUp, 
  Quote, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Eye
} from 'lucide-react'
import { SentimentFeedback } from '../feedback/SentimentFeedback'

export interface PersonalImpact {
  category: string
  impact: 'positive' | 'negative' | 'neutral'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  details: string[]
  icon: React.ComponentType<{ className?: string }>
  source?: {
    text: string
    sectionTitle?: string
  }
}

interface EnhancedImpactCardProps {
  impact: PersonalImpact
  index: number
  billId: string
  userId?: string
  onViewSource?: (source: PersonalImpact['source']) => void
}

export function EnhancedImpactCard({
  impact,
  index,
  billId,
  userId,
  onViewSource
}: EnhancedImpactCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getImpactColor = (impactType: string, severity: string) => {
    if (impactType === 'positive') {
      return severity === 'high' ? 'bg-green-100 text-green-800' : 
             severity === 'medium' ? 'bg-green-50 text-green-700' : 'bg-green-25 text-green-600'
    } else if (impactType === 'negative') {
      return severity === 'high' ? 'bg-red-100 text-red-800' : 
             severity === 'medium' ? 'bg-red-50 text-red-700' : 'bg-red-25 text-red-600'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getImpactIcon = (impactType: string) => {
    switch (impactType) {
      case 'positive': return CheckCircle
      case 'negative': return AlertTriangle
      default: return TrendingUp
    }
  }

  const IconComponent = impact.icon
  const ImpactIcon = getImpactIcon(impact.impact)

  return (
    <Card className="hover:shadow-md transition-shadow">
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

        {impact.source && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Quote className="h-4 w-4" />
              Where this comes from in the bill:
            </h4>
            <div className="bg-blue-50 border-l-4 border-l-blue-400 p-4 rounded-r-lg">
              <div className="flex items-start justify-between mb-2">
                {impact.source.sectionTitle && (
                  <Badge variant="outline" className="text-xs">
                    {impact.source.sectionTitle}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewSource?.(impact.source)}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View in Context
                </Button>
              </div>
              <blockquote className="text-sm text-gray-700 italic">
                "{impact.source.text}"
              </blockquote>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full justify-between"
          >
            <span>Specific impacts and details</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showDetails && (
            <div className="space-y-2 pt-4 border-t">
              <p className="font-medium text-gray-900 mb-2">Specific impacts:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {impact.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {userId && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <SentimentFeedback
              billId={billId}
              sectionId={`impact-${index}`}
              sectionTitle={impact.title}
              userId={userId}
              onFeedbackChange={(sentiment) => {
                console.log(`Feedback for ${impact.title}:`, sentiment)
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 