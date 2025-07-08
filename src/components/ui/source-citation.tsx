'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Badge } from './badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { PDFViewer, PDFHighlight } from './pdf-viewer'
import { 
  FileText, 
  Quote, 
  Eye,
  BookOpen,
  MapPin
} from 'lucide-react'

export interface SourceReference {
  billId: string
  sectionId: string
  pageNumber: number
  text: string
  contextBefore?: string
  contextAfter?: string
  coordinates?: {
    x: number
    y: number
    width: number
    height: number
  }
  sectionTitle?: string
  billTitle?: string
  pdfUrl?: string
}

interface SourceCitationProps {
  sourceRef: SourceReference
  className?: string
  showFullContext?: boolean
  onViewInPdf?: (sourceRef: SourceReference) => void
}

export function SourceCitation({ 
  sourceRef, 
  className = '', 
  showFullContext = false,
  onViewInPdf 
}: SourceCitationProps) {
  const [showDialog, setShowDialog] = useState(false)

  const handleViewInPdf = () => {
    if (onViewInPdf) {
      onViewInPdf(sourceRef)
    } else {
      setShowDialog(true)
    }
  }

  const getHighlights = (): PDFHighlight[] => {
    if (!sourceRef.coordinates) return []
    
    return [{
      pageNumber: sourceRef.pageNumber,
      text: sourceRef.text,
      coordinates: sourceRef.coordinates,
      sectionId: sourceRef.sectionId,
      color: '#fbbf24',
      title: sourceRef.sectionTitle
    }]
  }

  return (
    <div className={`source-citation ${className}`}>
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
              <Quote className="h-4 w-4" />
              Source Citation
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Page {sourceRef.pageNumber}
              </Badge>
              {sourceRef.sectionTitle && (
                <Badge variant="secondary" className="text-xs">
                  {sourceRef.sectionTitle}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main quoted text */}
          <div className="bg-white p-3 rounded border-l-2 border-l-blue-300">
            <blockquote className="text-sm text-gray-700 italic">
              "{sourceRef.text}"
            </blockquote>
          </div>

          {/* Context (if available and requested) */}
          {showFullContext && (sourceRef.contextBefore || sourceRef.contextAfter) && (
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
              <p className="font-medium mb-1">Context:</p>
              {sourceRef.contextBefore && (
                <p className="mb-1">...{sourceRef.contextBefore}</p>
              )}
              <p className="font-medium text-blue-700">{sourceRef.text}</p>
              {sourceRef.contextAfter && (
                <p className="mt-1">{sourceRef.contextAfter}...</p>
              )}
            </div>
          )}

          {/* Bill reference */}
          {sourceRef.billTitle && (
            <div className="text-xs text-gray-600">
              <p className="font-medium">From: {sourceRef.billTitle}</p>
              <p>Section: {sourceRef.sectionId}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewInPdf}
              className="text-xs"
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
              <FileText className="h-3 w-3 mr-1" />
              Copy Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      {sourceRef.pdfUrl && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {sourceRef.billTitle || 'Bill Text'}
                <Badge variant="outline">Page {sourceRef.pageNumber}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="h-[70vh] overflow-hidden">
              <PDFViewer
                fileUrl={sourceRef.pdfUrl}
                highlights={getHighlights()}
                initialPage={sourceRef.pageNumber}
                initialZoom={1.2}
                onHighlightClick={(highlight) => {
                  console.log('Highlight clicked:', highlight)
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

interface SourceReferenceListProps {
  sources: SourceReference[]
  title?: string
  className?: string
  onViewInPdf?: (sourceRef: SourceReference) => void
}

export function SourceReferenceList({ 
  sources, 
  title = "Source References", 
  className = '',
  onViewInPdf 
}: SourceReferenceListProps) {
  if (sources.length === 0) return null

  return (
    <div className={`source-reference-list ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        {title} ({sources.length})
      </h3>
      <div className="space-y-4">
        {sources.map((source, index) => (
          <SourceCitation
            key={`${source.billId}-${source.sectionId}-${index}`}
            sourceRef={source}
            showFullContext={true}
            onViewInPdf={onViewInPdf}
          />
        ))}
      </div>
    </div>
  )
}

interface ViewInContextButtonProps {
  sourceRef: SourceReference
  onViewInPdf?: (sourceRef: SourceReference) => void
  className?: string
  variant?: 'default' | 'outline' | 'secondary'
  size?: 'sm' | 'default' | 'lg'
}

export function ViewInContextButton({ 
  sourceRef, 
  onViewInPdf,
  className = '',
  variant = 'outline',
  size = 'sm'
}: ViewInContextButtonProps) {
  const [showDialog, setShowDialog] = useState(false)

  const handleClick = () => {
    if (onViewInPdf) {
      onViewInPdf(sourceRef)
    } else {
      setShowDialog(true)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        <MapPin className="h-3 w-3 mr-1" />
        View in Context
      </Button>

      {/* PDF Viewer Dialog */}
      {sourceRef.pdfUrl && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {sourceRef.billTitle || 'Bill Text'}
                <Badge variant="outline">Page {sourceRef.pageNumber}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="h-[70vh] overflow-hidden">
              <PDFViewer
                fileUrl={sourceRef.pdfUrl}
                highlights={sourceRef.coordinates ? [{
                  pageNumber: sourceRef.pageNumber,
                  text: sourceRef.text,
                  coordinates: sourceRef.coordinates,
                  sectionId: sourceRef.sectionId,
                  color: '#fbbf24',
                  title: sourceRef.sectionTitle
                }] : []}
                initialPage={sourceRef.pageNumber}
                initialZoom={1.2}
                onHighlightClick={(highlight) => {
                  console.log('Highlight clicked:', highlight)
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 