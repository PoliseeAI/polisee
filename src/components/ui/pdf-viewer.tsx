'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from './button'
import { Input } from './input'
import { Badge } from './badge'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Search, 
  FileText,
  RotateCw,
  Home,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown
} from 'lucide-react'

// Configure PDF.js worker (same as SimplePDFTest)
if (typeof window !== 'undefined') {
  const EXPECTED_PDFJS_VERSION = '4.4.168';
  const workerVersion = pdfjs.version === EXPECTED_PDFJS_VERSION ? pdfjs.version : EXPECTED_PDFJS_VERSION;
  
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`
  console.log('PDFViewer - PDF.js version:', pdfjs.version)
  console.log('PDFViewer - Worker configured to:', pdfjs.GlobalWorkerOptions.workerSrc)
  
  if (pdfjs.version !== EXPECTED_PDFJS_VERSION) {
    console.warn(`PDFViewer - Version mismatch! API: ${pdfjs.version}, Expected: ${EXPECTED_PDFJS_VERSION}`)
  }
}

export interface PDFHighlight {
  pageNumber: number
  text: string
  coordinates: {
    x: number
    y: number
    width: number
    height: number
  }
  sectionId?: string
  color?: string
  title?: string
}

export interface SearchResult {
  pageNumber: number
  text: string
  contextBefore?: string
  contextAfter?: string
  coordinates: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface BillSection {
  id: string
  title: string
  pageNumber: number
  level: number
  coordinates?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface PDFViewerProps {
  fileUrl: string
  highlights?: PDFHighlight[]
  sections?: BillSection[]
  onHighlightClick?: (highlight: PDFHighlight) => void
  onSectionClick?: (section: BillSection) => void
  className?: string
  showControls?: boolean
  initialPage?: number
  initialZoom?: number
}

export function PDFViewer({
  fileUrl,
  highlights = [],
  sections = [],
  onHighlightClick,
  onSectionClick,
  className = '',
  showControls = true,
  initialPage = 1,
  initialZoom = 1.0
}: PDFViewerProps) {
  const [isClient, setIsClient] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window !== 'undefined') {
      setIsClient(true)
    }
  }, [])

  // Add error boundary for PDF loading
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('DOMMatrix') || event.message?.includes('worker')) {
        console.error('PDF loading error caught:', event.message)
        setHasError(true)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError)
      return () => window.removeEventListener('error', handleError)
    }
  }, [])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDFViewer - Document loaded successfully!', numPages, 'pages')
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: any) => {
    console.error('PDFViewer - Document load error:', error)
    setError(error.message || 'Failed to load PDF')
    setLoading(false)
    setHasError(true)
  }, [])

  const onLoadStart = useCallback(() => {
    console.log('PDFViewer - Load started')
    setLoading(true)
    setError(null)
    setHasError(false)
  }, [])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page)
    }
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading PDF viewer...</span>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 font-medium">PDF Viewer Error</p>
          <p className="text-red-600 text-sm mt-1">
            Failed to initialize PDF viewer. Please refresh the page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`pdf-viewer ${className} h-full flex flex-col`}>
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading PDF...</span>
        </div>
      )}
      
      {error && (
        <div className="text-red-600 mb-4 p-3 bg-red-50 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {numPages > 0 && (
        <div className="text-green-600 mb-4">
          Successfully loaded PDF with {numPages} pages!
        </div>
      )}

      {showControls && numPages > 0 && (
        <Card className="mb-4 flex-shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span>PDF Viewer</span>
              </div>
              <Badge variant="outline">
                {numPages} pages
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={pageNumber === 1}
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(pageNumber - 1)}
                disabled={pageNumber === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={pageNumber}
                  onChange={(e) => {
                    const page = parseInt(e.target.value)
                    if (!isNaN(page)) goToPage(page)
                  }}
                  className="w-12 sm:w-16 text-center text-sm"
                  min={1}
                  max={numPages}
                />
                <span className="text-xs sm:text-sm text-gray-600">of {numPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(pageNumber + 1)}
                disabled={pageNumber === numPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Next</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-full max-h-full">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            onLoadStart={onLoadStart}
            loading={<div>Loading document...</div>}
            error={<div className="text-red-600">Failed to load document</div>}
            className="max-w-full max-h-full"
          >
            <Page 
              pageNumber={pageNumber} 
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadError={(error) => {
                console.error('PDFViewer - Page load error:', error)
              }}
              onLoadSuccess={() => {
                console.log('PDFViewer - Page loaded successfully')
              }}
              className="max-w-full max-h-full shadow-lg"
              scale={1}
              width={typeof window !== 'undefined' ? Math.min(800, window.innerWidth - 100) : 800}
            />
          </Document>
        </div>
      </div>

      {numPages > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-center flex-shrink-0">
          Page {pageNumber} of {numPages}
        </div>
      )}
    </div>
  )
} 