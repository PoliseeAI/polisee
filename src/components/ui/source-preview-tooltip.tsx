'use client'

import React, { useState } from 'react'
import { Button } from './button'
import { Badge } from './badge'
import { SourceReference } from './source-citation'
import { 
  Quote, 
  FileText, 
  Eye,
  ChevronRight,
  MapPin
} from 'lucide-react'

interface SourcePreviewTooltipProps {
  sourceRef: SourceReference
  children: React.ReactNode
  onViewInPdf?: (sourceRef: SourceReference) => void
}

export function SourcePreviewTooltip({ 
  sourceRef, 
  children,
  onViewInPdf 
}: SourcePreviewTooltipProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {isHovered && (
        <div className="absolute z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg -top-2 left-full ml-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Bill Reference</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {sourceRef.sectionTitle || sourceRef.sectionId}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Page {sourceRef.pageNumber}
              </Badge>
            </div>
          </div>

          {/* Quote */}
          <div className="mb-3">
            <blockquote className="text-sm text-gray-700 italic border-l-2 border-blue-200 pl-3 bg-blue-50 py-2 rounded-r">
              "{sourceRef.text}"
            </blockquote>
          </div>

          {/* Context */}
          {sourceRef.contextBefore && (
            <div className="mb-3 text-xs text-gray-600">
              <p className="font-medium mb-1">Context:</p>
              <p className="bg-gray-50 p-2 rounded">
                ...{sourceRef.contextBefore} <strong className="text-blue-700">{sourceRef.text}</strong> {sourceRef.contextAfter}...
              </p>
            </div>
          )}

          {/* Bill Info */}
          <div className="mb-3 text-xs text-gray-600">
            <p className="font-medium">{sourceRef.billTitle}</p>
            <p>Section: {sourceRef.sectionId}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewInPdf?.(sourceRef)}
              className="text-xs flex-1"
            >
              <Eye className="h-3 w-3 mr-1" />
              View in PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(sourceRef.text)}
              className="text-xs"
            >
              <FileText className="h-3 w-3" />
            </Button>
          </div>

          {/* Arrow pointing to trigger */}
          <div className="absolute top-4 -left-2 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-gray-200"></div>
          <div className="absolute top-4 -left-1 w-0 h-0 border-t-[6px] border-b-[6px] border-r-[8px] border-t-transparent border-b-transparent border-r-white"></div>
        </div>
      )}
    </div>
  )
}

interface InlineBillReferenceProps {
  sourceRef: SourceReference
  text: string
  onViewInPdf?: (sourceRef: SourceReference) => void
}

export function InlineBillReference({ 
  sourceRef, 
  text, 
  onViewInPdf 
}: InlineBillReferenceProps) {
  return (
    <SourcePreviewTooltip sourceRef={sourceRef} onViewInPdf={onViewInPdf}>
      <button className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors">
        <MapPin className="h-3 w-3" />
        {text}
        <ChevronRight className="h-3 w-3" />
      </button>
    </SourcePreviewTooltip>
  )
}

interface QuickSourcePreviewProps {
  sourceRefs: SourceReference[]
  onViewInPdf?: (sourceRef: SourceReference) => void
}

export function QuickSourcePreview({ 
  sourceRefs, 
  onViewInPdf 
}: QuickSourcePreviewProps) {
  if (sourceRefs.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {sourceRefs.slice(0, 3).map((sourceRef, index) => (
        <InlineBillReference
          key={index}
          sourceRef={sourceRef}
          text={sourceRef.sectionTitle || sourceRef.sectionId}
          onViewInPdf={onViewInPdf}
        />
      ))}
      {sourceRefs.length > 3 && (
        <Badge variant="outline" className="text-xs">
          +{sourceRefs.length - 3} more
        </Badge>
      )}
    </div>
  )
} 