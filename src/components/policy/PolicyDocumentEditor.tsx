'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  FileText, 
  Download, 
  Edit3,
  Check,
  X,
  Eye,
  Edit
} from 'lucide-react'
import { PolicyDocument } from '@/app/propose/page'
import ReactMarkdown from 'react-markdown'

interface PolicyDocumentEditorProps {
  document: PolicyDocument
  onUpdate: (document: PolicyDocument) => void
  isReadOnly?: boolean
}

// Default policy template
const POLICY_TEMPLATE = `## Executive Summary
[Provide a brief overview of the policy proposal, its objectives, and expected outcomes]

## Problem Statement
[Describe the issue or challenge this policy aims to address]

## Policy Objectives
1. [Primary objective]
2. [Secondary objective]
3. [Additional objectives as needed]

## Proposed Solutions
[Detail the specific actions and measures proposed]

## Implementation Plan
### Phase 1: [Timeline]
- [Action items]

### Phase 2: [Timeline]
- [Action items]

## Stakeholder Impact
- **Citizens**: [How this affects the general public]
- **Businesses**: [Impact on commercial entities]
- **Government**: [Administrative implications]

## Budget Considerations
- Estimated cost: [Amount]
- Funding sources: [Where the money comes from]
- ROI projection: [Expected returns]

## Success Metrics
- [Measurable outcome 1]
- [Measurable outcome 2]
- [Key performance indicators]

## Legal and Regulatory Framework
[Relevant laws, regulations, and compliance requirements]

## Conclusion
[Summary and call to action]`

export function PolicyDocumentEditor({ 
  document, 
  onUpdate,
  isReadOnly = false 
}: PolicyDocumentEditorProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(document.title)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    setTempTitle(document.title)
  }, [document.title])

  useEffect(() => {
    // Initialize with template if content is empty
    if (!document.content && document.content !== '') {
      onUpdate({
        ...document,
        content: POLICY_TEMPLATE,
        lastUpdated: new Date()
      })
    }
  }, [])

  const handleTitleSave = () => {
    onUpdate({
      ...document,
      title: tempTitle,
      lastUpdated: new Date()
    })
    setIsEditingTitle(false)
  }

  const handleContentChange = (content: string) => {
    onUpdate({
      ...document,
      content,
      lastUpdated: new Date()
    })
  }

  const handleExport = () => {
    const exportContent = `# ${document.title}\n\n${document.content}`
    const blob = new Blob([exportContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = `${document.title.replace(/\s+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <FileText className="h-5 w-5 text-gray-600" />
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="flex-1"
                  disabled={isReadOnly}
                  placeholder="Enter policy title..."
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleTitleSave}
                  disabled={isReadOnly}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempTitle(document.title)
                    setIsEditingTitle(false)
                  }}
                  disabled={isReadOnly}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h2 className="text-lg font-semibold">{document.title}</h2>
                {!isReadOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <Button
                size="sm"
                variant={isPreviewMode ? "default" : "outline"}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
              >
                {isPreviewMode ? (
                  <>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Last updated: {new Date(document.lastUpdated).toLocaleTimeString()}
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        {isPreviewMode ? (
          <div className="prose prose-sm max-w-none h-full overflow-y-auto">
            <ReactMarkdown 
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-800 border-b pb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-700">{children}</h3>,
                p: ({ children }) => <p className="mb-3 text-gray-600 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-gray-600 list-disc">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 my-4">{children}</blockquote>,
                code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>,
                pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 mb-4">{children}</pre>,
              }}
            >
              {document.content || 'No content to preview. Switch to edit mode to start writing.'}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={document.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing your policy proposal..."
            className="w-full h-full min-h-[500px] resize-none font-mono text-sm"
            disabled={isReadOnly}
          />
        )}
      </CardContent>
    </div>
  )
} 