'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Badge } from './badge'
import { SourceReference, ViewInContextButton } from './source-citation'
import { QuickSourcePreview } from './source-preview-tooltip'
import { SentimentFeedback } from '@/components/feedback/SentimentFeedback'
import { 
  ChevronDown, 
  ChevronUp, 
  Quote, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  ExternalLink,
  FileText,
  Eye
} from 'lucide-react'

export interface PersonalImpact {
  category: string
  impact: 'positive' | 'negative' | 'neutral'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  details: string[]
  icon: React.ComponentType<{ className?: string }>
  sourceReferences?: SourceReference[]
}

interface EnhancedImpactCardProps {
  impact: PersonalImpact
  index: number
  billId: string
  userId?: string
  onViewInPdf?: (sourceRef: SourceReference) => void
}

export function EnhancedImpactCard({
  impact,
  index,
  billId,
  userId,
  onViewInPdf
}: EnhancedImpactCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showAllSources, setShowAllSources] = useState(false)

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

  const IconComponent = impact.icon
  const ImpactIcon = getImpactIcon(impact.impact)

  // Get the most relevant source references to display inline
  const primarySources = impact.sourceReferences?.slice(0, 2) || []
  const additionalSources = impact.sourceReferences?.slice(2) || []

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

        {/* Quick Source Preview - Hover for details */}
        {impact.sourceReferences && impact.sourceReferences.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Referenced in:</p>
            <QuickSourcePreview 
              sourceRefs={impact.sourceReferences}
              onViewInPdf={onViewInPdf}
            />
          </div>
        )}

        {/* Primary Source References - Always Visible */}
        {primarySources.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Quote className="h-4 w-4" />
              Where this comes from in the bill:
            </h4>
            <div className="space-y-3">
              {primarySources.map((sourceRef, refIndex) => (
                <div key={refIndex} className="bg-blue-50 border-l-4 border-l-blue-400 p-4 rounded-r-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {sourceRef.sectionTitle || sourceRef.sectionId}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Page {sourceRef.pageNumber}
                      </Badge>
                    </div>
                    <ViewInContextButton
                      sourceRef={sourceRef}
                      onViewInPdf={onViewInPdf}
                      size="sm"
                      className="text-xs"
                    />
                  </div>
                  <blockquote className="text-sm text-gray-700 italic mb-2">
                    "{sourceRef.text}"
                  </blockquote>
                  {sourceRef.contextBefore && (
                    <p className="text-xs text-gray-500">
                      Context: ...{sourceRef.contextBefore} <strong>{sourceRef.text}</strong> {sourceRef.contextAfter}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Details Section */}
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
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-2">Specific impacts:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {impact.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>

              {/* Additional Source References */}
              {additionalSources.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Additional References ({additionalSources.length})</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllSources(!showAllSources)}
                    >
                      {showAllSources ? 'Show Less' : 'Show All'}
                    </Button>
                  </div>
                  {showAllSources && (
                    <div className="space-y-3">
                      {additionalSources.map((sourceRef, refIndex) => (
                        <div key={refIndex} className="bg-gray-50 border-l-2 border-l-gray-300 p-3 rounded-r">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {sourceRef.sectionTitle || sourceRef.sectionId}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Page {sourceRef.pageNumber}
                              </Badge>
                            </div>
                            <ViewInContextButton
                              sourceRef={sourceRef}
                              onViewInPdf={onViewInPdf}
                              size="sm"
                              className="text-xs"
                            />
                          </div>
                          <blockquote className="text-sm text-gray-600 italic">
                            "{sourceRef.text}"
                          </blockquote>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {impact.sourceReferences && impact.sourceReferences.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Referenced in {impact.sourceReferences.length} bill section{impact.sourceReferences.length > 1 ? 's' : ''}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewInPdf?.(impact.sourceReferences![0])}
                className="text-xs"
              >
                <FileText className="h-3 w-3 mr-1" />
                View in Full Bill
              </Button>
            </div>
          </div>
        )}
        
        {/* Sentiment Feedback */}
        {userId && (
          <div className="pt-4 border-t border-gray-100">
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