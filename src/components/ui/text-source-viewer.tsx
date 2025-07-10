'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'

interface TextSourceViewerProps {
  fullText: string
  sourceText: string
  title?: string
  onClose?: () => void
  hideHeader?: boolean
}

export function TextSourceViewer({
  fullText,
  sourceText,
  title = 'Source Text',
  onClose,
  hideHeader = false,
}: TextSourceViewerProps) {
  const highlightRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [sourceText])

  const renderTextWithHighlight = () => {
    if (!sourceText || !fullText.includes(sourceText)) {
      return <p className="whitespace-pre-wrap">{fullText}</p>
    }

    const parts = fullText.split(sourceText)
    return (
      <p className="whitespace-pre-wrap">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <mark
                ref={highlightRef}
                className="bg-yellow-200 px-1 py-0.5 rounded-md"
              >
                {sourceText}
              </mark>
            )}
          </span>
        ))}
      </p>
    )
  }

  // When used in a modal (hideHeader=true), use minimal styling
  if (hideHeader) {
    return (
      <div className="h-full flex flex-col bg-white rounded-lg border overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-800 leading-relaxed text-sm">
            {renderTextWithHighlight()}
          </div>
        </div>
      </div>
    )
  }

  // Regular card view with header
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4 flex-shrink-0">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </CardHeader>
      <CardContent className="py-4 flex-1 overflow-y-auto">
        <div className="text-gray-800 leading-relaxed text-sm">
          {renderTextWithHighlight()}
        </div>
      </CardContent>
    </Card>
  )
} 