'use client'

import React from 'react'
import { Button } from './button'
import { Badge } from './badge'
import { BillSection } from './pdf-viewer'
import { SourceReference } from './source-citation'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  List,
  Navigation,
  Target,
  BookOpen
} from 'lucide-react'

interface SectionNavigatorProps {
  sections: BillSection[]
  currentSection?: BillSection
  sourceReferences: SourceReference[]
  onSectionChange: (section: BillSection) => void
  compact?: boolean
}

export function SectionNavigator({
  sections,
  currentSection,
  sourceReferences,
  onSectionChange,
  compact = false
}: SectionNavigatorProps) {
  const currentIndex = currentSection 
    ? sections.findIndex(s => s.id === currentSection.id)
    : -1

  const previousSection = currentIndex > 0 ? sections[currentIndex - 1] : null
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null

  const getSectionReferencesCount = (sectionId: string) => {
    return sourceReferences.filter(ref => ref.sectionId === sectionId).length
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => previousSection && onSectionChange(previousSection)}
          disabled={!previousSection}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs">
            {currentIndex + 1} / {sections.length}
          </Badge>
          {currentSection && (
            <span className="text-sm font-medium truncate">
              {currentSection.title}
            </span>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => nextSection && onSectionChange(nextSection)}
          disabled={!nextSection}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Section Navigation
        </h3>
        <Badge variant="outline" className="text-xs">
          {sections.length} sections
        </Badge>
      </div>

      {/* Current Section Info */}
      {currentSection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              {currentSection.id}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Page {currentSection.pageNumber}
            </Badge>
          </div>
          <h4 className="font-medium text-blue-900 mb-1">
            {currentSection.title}
          </h4>
          <p className="text-xs text-blue-700">
            {getSectionReferencesCount(currentSection.id)} reference{getSectionReferencesCount(currentSection.id) !== 1 ? 's' : ''} in analysis
          </p>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => previousSection && onSectionChange(previousSection)}
          disabled={!previousSection}
          className="justify-start"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => nextSection && onSectionChange(nextSection)}
          disabled={!nextSection}
          className="justify-end"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Section Quick Jump */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Quick Jump</h4>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {sections.slice(0, 10).map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section)}
              className={`w-full text-left p-2 rounded text-xs transition-colors ${
                currentSection?.id === section.id
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{section.title}</span>
                <div className="flex items-center gap-1 ml-2">
                  <Badge variant="outline" className="text-xs">
                    {section.pageNumber}
                  </Badge>
                  {getSectionReferencesCount(section.id) > 0 && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            </button>
          ))}
          {sections.length > 10 && (
            <div className="text-xs text-gray-500 text-center py-1">
              ... and {sections.length - 10} more sections
            </div>
          )}
        </div>
      </div>

      {/* Referenced Sections Only */}
      {sourceReferences.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Referenced in Analysis</h4>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {sections
              .filter(section => getSectionReferencesCount(section.id) > 0)
              .map((section) => (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    currentSection?.id === section.id
                      ? 'bg-green-100 text-green-900 border border-green-300'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{section.title}</span>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge variant="outline" className="text-xs">
                        {getSectionReferencesCount(section.id)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Page {section.pageNumber}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SectionBreadcrumbProps {
  sections: BillSection[]
  currentSection?: BillSection
  onSectionChange: (section: BillSection) => void
}

export function SectionBreadcrumb({
  sections,
  currentSection,
  onSectionChange
}: SectionBreadcrumbProps) {
  if (!currentSection) return null

  // Find the path to the current section
  const currentIndex = sections.findIndex(s => s.id === currentSection.id)
  const path = []
  
  // Add parent sections (level 1)
  for (let i = currentIndex; i >= 0; i--) {
    if (sections[i].level === 1) {
      path.unshift(sections[i])
      break
    }
  }
  
  // Add current section if it's not level 1
  if (currentSection.level > 1) {
    path.push(currentSection)
  }

  return (
    <div className="flex items-center gap-1 text-sm text-gray-600">
      <BookOpen className="h-4 w-4" />
      {path.map((section, index) => (
        <React.Fragment key={section.id}>
          <button
            onClick={() => onSectionChange(section)}
            className="hover:text-blue-600 transition-colors"
          >
            {section.title}
          </button>
          {index < path.length - 1 && (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
} 