'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SentimentFeedbackProps {
  billId: string
  sectionId: string
  sectionTitle: string
  userId?: string
  onFeedbackChange?: (sentiment: 'positive' | 'negative' | null) => void
  className?: string
}

export function SentimentFeedback({
  billId,
  sectionId,
  sectionTitle,
  userId,
  onFeedbackChange,
  className
}: SentimentFeedbackProps) {
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSentimentClick = async (newSentiment: 'positive' | 'negative') => {
    if (!userId) {
      // Could show login prompt here
      return
    }

    setLoading(true)
    try {
      // Toggle sentiment if clicking the same button
      const finalSentiment = sentiment === newSentiment ? null : newSentiment
      setSentiment(finalSentiment)
      
      // Call parent callback
      onFeedbackChange?.(finalSentiment)
      
      // TODO: Save to database
      // await saveSentimentFeedback({
      //   billId,
      //   sectionId,
      //   sectionTitle,
      //   userId,
      //   sentiment: finalSentiment
      // })
      
    } catch (error) {
      console.error('Error saving sentiment feedback:', error)
      // Revert on error
      setSentiment(sentiment)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-gray-600 mr-2">How do you feel about this?</span>
      
      <Button
        variant={sentiment === 'positive' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleSentimentClick('positive')}
        disabled={loading}
        className={cn(
          'flex items-center gap-1 transition-all',
          sentiment === 'positive' && 'bg-green-600 hover:bg-green-700 text-white'
        )}
      >
        <ThumbsUp className="h-3 w-3" />
        <span className="text-xs">Support</span>
      </Button>
      
      <Button
        variant={sentiment === 'negative' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleSentimentClick('negative')}
        disabled={loading}
        className={cn(
          'flex items-center gap-1 transition-all',
          sentiment === 'negative' && 'bg-red-600 hover:bg-red-700 text-white'
        )}
      >
        <ThumbsDown className="h-3 w-3" />
        <span className="text-xs">Oppose</span>
      </Button>
      
      {sentiment && (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          sentiment === 'positive' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        )}>
          {sentiment === 'positive' ? 'You support this' : 'You oppose this'}
        </span>
      )}
    </div>
  )
} 