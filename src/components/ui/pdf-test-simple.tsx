'use client'

import React, { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure PDF.js worker
console.log('Simple PDF Test - PDF.js version:', pdfjs.version)

// Force use of the exact version that react-pdf 9.1.1 uses
const EXPECTED_PDFJS_VERSION = '4.4.168';
const workerVersion = pdfjs.version === EXPECTED_PDFJS_VERSION ? pdfjs.version : EXPECTED_PDFJS_VERSION;

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`
console.log('Simple PDF Test - Worker configured to:', pdfjs.GlobalWorkerOptions.workerSrc)
console.log('Simple PDF Test - Expected version:', EXPECTED_PDFJS_VERSION)
console.log('Simple PDF Test - Actual version:', pdfjs.version)

if (pdfjs.version !== EXPECTED_PDFJS_VERSION) {
  console.warn(`Simple PDF Test - Version mismatch! API: ${pdfjs.version}, Expected: ${EXPECTED_PDFJS_VERSION}`)
}

export default function SimplePDFTest() {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber] = useState<number>(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log('Simple PDF Test - Document loaded successfully!', numPages, 'pages')
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  function onDocumentLoadError(error: any) {
    console.error('Simple PDF Test - Document load error:', error)
    setError(error.message || 'Failed to load PDF')
    setLoading(false)
  }

  function onLoadStart() {
    console.log('Simple PDF Test - Load started')
    setLoading(true)
    setError(null)
  }

  return (
    <div className="p-4 border rounded h-full flex flex-col">
      <h3 className="text-lg font-medium mb-4">Simple PDF Test</h3>
      
      {loading && (
        <div className="text-blue-600 mb-4">Loading PDF...</div>
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

      <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4 border-2 border-gray-300">
        <div className="max-w-full max-h-full">
          <Document
            file="/sample-bill.pdf"
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
                console.error('Simple PDF Test - Page load error:', error)
              }}
              onLoadSuccess={() => {
                console.log('Simple PDF Test - Page loaded successfully')
              }}
              className="max-w-full max-h-full shadow-lg"
              scale={1}
              width={typeof window !== 'undefined' ? Math.min(600, window.innerWidth - 150) : 600}
            />
          </Document>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center">
        Page {pageNumber} of {numPages}
      </div>
    </div>
  )
} 