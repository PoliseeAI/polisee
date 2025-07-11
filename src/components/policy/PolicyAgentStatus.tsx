'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  Search, 
  FileText, 
  Brain, 
  PenTool,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { AgentStatus } from '@/app/propose/page'
import { cn } from '@/lib/utils'

interface PolicyAgentStatusProps {
  status: AgentStatus
}

const actionIcons: Record<string, React.ReactNode> = {
  'Processing your request...': <Loader2 className="h-4 w-4 animate-spin" />,
  'Searching for relevant information...': <Search className="h-4 w-4 animate-pulse" />,
  'Analyzing existing policies...': <FileText className="h-4 w-4 animate-pulse" />,
  'Generating policy content...': <PenTool className="h-4 w-4 animate-pulse" />,
  'Thinking about your request...': <Brain className="h-4 w-4 animate-pulse" />,
  'Finalizing response...': <CheckCircle className="h-4 w-4 animate-pulse" />,
}

export function PolicyAgentStatus({ status }: PolicyAgentStatusProps) {
  const icon = actionIcons[status.currentAction] || <Loader2 className="h-4 w-4 animate-spin" />

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-blue-100 text-blue-600"
            )}>
              {icon}
            </div>
          </div>
          
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-gray-900">
              Agent Activity
            </p>
            <p className="text-sm text-gray-600">
              {status.currentAction}
            </p>
            {status.progress !== undefined && (
              <Progress value={status.progress} className="h-1.5" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 