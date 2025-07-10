'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'

interface TextSourceViewerProps {
  fullText: string
  sourceText: string
  title?: string
  onClose?: () => void
}

export function TextSourceViewer({
  fullText,
  sourceText,
  title = 'Source Text',
  onClose,
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
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
      <CardContent className="py-4 flex-grow overflow-y-auto">
        <div className="text-gray-800 leading-relaxed text-sm">
          {renderTextWithHighlight()}
        </div>
      </CardContent>
    </Card>
  )
} 