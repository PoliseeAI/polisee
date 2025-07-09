import jsPDF from 'jspdf'

export interface TextToPDFOptions {
  fontSize?: number
  lineHeight?: number
  margins?: {
    top: number
    bottom: number
    left: number
    right: number
  }
  pageSize?: 'a4' | 'letter'
}

export function convertTextToPDF(
  text: string,
  options: TextToPDFOptions = {}
): jsPDF {
  const {
    fontSize = 10,
    lineHeight = 1.4,
    margins = { top: 20, bottom: 20, left: 20, right: 20 },
    pageSize = 'a4'
  } = options

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize
  })

  // Set font
  doc.setFont('helvetica')
  doc.setFontSize(fontSize)

  // Get page dimensions
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const textWidth = pageWidth - margins.left - margins.right
  const textHeight = pageHeight - margins.top - margins.bottom

  // Split text into lines
  const lines = text.split('\n')
  let currentY = margins.top

  // Calculate line height in mm
  const lineHeightMm = fontSize * lineHeight * 0.352778 // Convert points to mm

  for (const line of lines) {
    // Handle empty lines
    if (line.trim() === '') {
      currentY += lineHeightMm * 0.5
      continue
    }

    // Split long lines to fit within page width
    const wrappedLines = doc.splitTextToSize(line, textWidth)
    
    for (const wrappedLine of wrappedLines) {
      // Check if we need a new page
      if (currentY + lineHeightMm > pageHeight - margins.bottom) {
        doc.addPage()
        currentY = margins.top
      }

      // Add text to PDF
      doc.text(wrappedLine, margins.left, currentY)
      currentY += lineHeightMm
    }
  }

  return doc
}

export function saveTextAsPDF(
  text: string,
  filename: string,
  options?: TextToPDFOptions
): void {
  const doc = convertTextToPDF(text, options)
  doc.save(filename)
}

export function getTextAsPDFDataUrl(
  text: string,
  options?: TextToPDFOptions
): string {
  const doc = convertTextToPDF(text, options)
  return doc.output('datauristring')
}

export function getTextAsPDFBlob(
  text: string,
  options?: TextToPDFOptions
): Blob {
  const doc = convertTextToPDF(text, options)
  return doc.output('blob')
} 