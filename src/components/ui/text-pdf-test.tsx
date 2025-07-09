'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { PDFViewer } from './pdf-viewer'
import { EnhancedPDFViewer } from './enhanced-pdf-viewer'
import { getTextAsPDFDataUrl, saveTextAsPDF } from '@/utils/text-to-pdf'
import { Download, FileText, Loader2 } from 'lucide-react'

interface TextPDFTestProps {
  textFile: string
  title?: string
  className?: string
}

export default function TextPDFTest({ 
  textFile, 
  title = "Text to PDF Test",
  className = ""
}: TextPDFTestProps) {
  const [textContent, setTextContent] = useState<string>('')
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTextFile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(textFile)
        if (!response.ok) {
          throw new Error(`Failed to load text file: ${response.statusText}`)
        }
        
        const text = await response.text()
        setTextContent(text)
        
        // Convert text to PDF
        const pdfUrl = getTextAsPDFDataUrl(text, {
          fontSize: 11,
          lineHeight: 1.5,
          margins: { top: 25, bottom: 25, left: 20, right: 20 },
          pageSize: 'a4'
        })
        
        setPdfDataUrl(pdfUrl)
      } catch (err) {
        console.error('Error loading text file:', err)
        setError(err instanceof Error ? err.message : 'Failed to load text file')
      } finally {
        setLoading(false)
      }
    }

    loadTextFile()
  }, [textFile])

  const handleDownloadPDF = () => {
    if (textContent) {
      const filename = textFile.split('/').pop()?.replace('.txt', '.pdf') || 'converted.pdf'
      saveTextAsPDF(textContent, filename, {
        fontSize: 11,
        lineHeight: 1.5,
        margins: { top: 25, bottom: 25, left: 20, right: 20 },
        pageSize: 'a4'
      })
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Converting text to PDF...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <FileText className="h-5 w-5" />
            {title} - Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 p-4 bg-red-50 rounded">
            <strong>Error:</strong> {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Source:</strong> {textFile}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Content length:</strong> {textContent.length.toLocaleString()} characters
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Lines:</strong> {textContent.split('\n').length.toLocaleString()}
                </p>
              </div>
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
            
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
              ✅ Successfully converted text file to PDF format!
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic PDF Viewer Test */}
      <Card>
        <CardHeader>
          <CardTitle>Basic PDF Viewer Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="h-[600px] overflow-hidden">
              <PDFViewer
                fileUrl={pdfDataUrl}
                highlights={[]}
                initialPage={1}
                initialZoom={1.0}
                showControls={true}
                onHighlightClick={(highlight) => {
                  console.log('Highlight clicked:', highlight)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced PDF Viewer Test */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced PDF Viewer Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="h-[700px] overflow-hidden">
              <EnhancedPDFViewer
                fileUrl={pdfDataUrl}
                highlights={[]}
                sections={[]}
                sourceReferences={[]}
                initialPage={1}
                initialZoom={1.0}
                showControls={true}
                analysisMode={false}
                onHighlightClick={(highlight) => {
                  console.log('Enhanced highlight clicked:', highlight)
                }}
                onSectionClick={(section) => {
                  console.log('Enhanced section clicked:', section)
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 