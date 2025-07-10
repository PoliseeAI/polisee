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
  X
} from 'lucide-react'
import { PolicyDocument } from '@/app/propose/page'

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
        <Textarea
          value={document.content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start writing your policy proposal..."
          className="w-full h-full min-h-[500px] resize-none font-mono text-sm"
          disabled={isReadOnly}
        />
      </CardContent>
    </div>
  )
} 