'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from './button'
import { Input } from './input'
import { Badge } from './badge'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { PDFViewer, PDFHighlight, BillSection } from './pdf-viewer'
import { SourceReference } from './source-citation'
import { SectionNavigator, SectionBreadcrumb } from './section-navigator'
import { 
  ChevronLeft, 
  ChevronRight, 
  List, 
  Search, 
  FileText,
  BookOpen,
  MapPin,
  Eye,
  ChevronDown,
  ChevronUp,
  Target,
  Navigation
} from 'lucide-react'

interface EnhancedPDFViewerProps {
  fileUrl: string
  highlights?: PDFHighlight[]
  sections?: BillSection[]
  sourceReferences?: SourceReference[]
  onHighlightClick?: (highlight: PDFHighlight) => void
  onSectionClick?: (section: BillSection) => void
  className?: string
  showControls?: boolean
  initialPage?: number
  initialZoom?: number
  analysisMode?: boolean
}

export function EnhancedPDFViewer({
  fileUrl,
  highlights = [],
  sections = [],
  sourceReferences = [],
  onHighlightClick,
  onSectionClick,
  className = '',
  showControls = true,
  initialPage = 1,
  initialZoom = 1.0,
  analysisMode = false
}: EnhancedPDFViewerProps) {
  const [showSectionNav, setShowSectionNav] = useState(analysisMode)
  const [activeSection, setActiveSection] = useState<BillSection | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SourceReference[]>([])

  // Filter source references based on search
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([])
      return
    }
    
    const filtered = sourceReferences.filter(ref =>
      ref.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.sectionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.sectionId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setSearchResults(filtered)
  }, [searchTerm, sourceReferences])

  const handleSectionClick = (section: BillSection) => {
    setActiveSection(section)
    onSectionClick?.(section)
  }

  const handleJumpToReference = (sourceRef: SourceReference) => {
    const section = sections.find(s => s.id === sourceRef.sectionId)
    if (section) {
      handleSectionClick(section)
    }
  }

  const groupedSections = sections.reduce((acc, section) => {
    if (section.level === 1) {
      acc.push({ ...section, subsections: [] })
    } else if (acc.length > 0) {
      acc[acc.length - 1].subsections.push(section)
    }
    return acc
  }, [] as (BillSection & { subsections: BillSection[] })[])

  return (
    <div className={`enhanced-pdf-viewer ${className} flex h-full`}>
      {/* Left Sidebar - Section Navigation */}
      {showSectionNav && (
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <List className="h-4 w-4" />
              Bill Sections
            </h3>
            
            {/* Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Search Results ({searchResults.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleJumpToReference(result)}
                      className="w-full text-left p-2 text-xs bg-white rounded border hover:bg-blue-50 hover:border-blue-200"
                    >
                      <div className="font-medium text-blue-700">{result.sectionTitle}</div>
                      <div className="text-gray-600 truncate">{result.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Navigator */}
          <div className="flex-1 overflow-y-auto p-4">
            <SectionNavigator
              sections={sections}
              currentSection={activeSection || undefined}
              sourceReferences={sourceReferences}
              onSectionChange={handleSectionClick}
            />
          </div>
        </div>
      )}

      {/* Main PDF Area */}
      <div className="flex-1 flex flex-col">
                {/* Header Controls */}
        {showControls && (
          <div className="border-b border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSectionNav(!showSectionNav)}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  {showSectionNav ? 'Hide' : 'Show'} Navigation
                </Button>
                {activeSection && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {activeSection.title}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {highlights.length} highlights
                </Badge>
                <Badge variant="outline">
                  {sections.length} sections
                </Badge>
              </div>
            </div>
            
            {/* Section Breadcrumb */}
            <SectionBreadcrumb
              sections={sections}
              currentSection={activeSection || undefined}
              onSectionChange={handleSectionClick}
            />
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1">
          <PDFViewer
            fileUrl={fileUrl}
            highlights={highlights}
            sections={sections}
            onHighlightClick={onHighlightClick}
            onSectionClick={onSectionClick}
            initialPage={initialPage}
            initialZoom={initialZoom}
            showControls={showControls}
          />
        </div>
      </div>
    </div>
  )
}

interface AnalysisLinkedPDFViewerProps {
  fileUrl: string
  sourceReferences: SourceReference[]
  sections: BillSection[]
  selectedReference?: SourceReference
  onReferenceSelect?: (reference: SourceReference) => void
}

export function AnalysisLinkedPDFViewer({
  fileUrl,
  sourceReferences,
  sections,
  selectedReference,
  onReferenceSelect
}: AnalysisLinkedPDFViewerProps) {
  const highlights: PDFHighlight[] = sourceReferences.map(ref => ({
    pageNumber: ref.pageNumber,
    text: ref.text,
    coordinates: ref.coordinates || { x: 0, y: 0, width: 100, height: 10 },
    sectionId: ref.sectionId,
    color: selectedReference?.sectionId === ref.sectionId ? '#fbbf24' : '#93c5fd',
    title: ref.sectionTitle
  }))

  return (
    <EnhancedPDFViewer
      fileUrl={fileUrl}
      highlights={highlights}
      sections={sections}
      sourceReferences={sourceReferences}
      onHighlightClick={(highlight) => {
        const ref = sourceReferences.find(r => r.sectionId === highlight.sectionId)
        if (ref) onReferenceSelect?.(ref)
      }}
      onSectionClick={(section) => {
        const ref = sourceReferences.find(r => r.sectionId === section.id)
        if (ref) onReferenceSelect?.(ref)
      }}
      initialPage={selectedReference?.pageNumber || 1}
      analysisMode={true}
      showControls={true}
    />
  )
} 