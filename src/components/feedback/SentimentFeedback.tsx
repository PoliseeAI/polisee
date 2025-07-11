'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SentimentFeedbackProps {
  onFeedbackSubmit?: (sentiment: 'positive' | 'negative' | 'neutral', comment?: string) => void
  className?: string
  userId?: string
  billId?: string
  onFeedbackChange?: (sentiment: 'positive' | 'negative' | null) => void
  sectionId?: string
  sectionTitle?: string
  showVoteCounts?: boolean
}

export function SentimentFeedback({ 
  onFeedbackSubmit, 
  className,
  userId,
  onFeedbackChange,
  billId,
  sectionId,
  sectionTitle,
  showVoteCounts = false
}: SentimentFeedbackProps) {
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null)
  const [loading, setLoading] = useState(false)
  const [voteCounters, setVoteCounters] = useState<{
    support_count: number
    oppose_count: number
    total_votes: number
  } | null>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [reasoning, setReasoning] = useState('')
  const [reasoningLoading, setReasoningLoading] = useState(false)

  // Load existing vote and counters
  useEffect(() => {
    if (billId) {
      loadVoteData()
    }
  }, [billId, userId])

  const loadVoteData = async () => {
    if (!billId) return

    try {
      const params = new URLSearchParams({
        billId,
        ...(userId && { userId })
      })
      
      const response = await fetch(`/api/vote-bill?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setVoteCounters(data.counters)
        if (data.userVote) {
          const userSentiment = data.userVote.sentiment === 'support' ? 'positive' : 'negative'
          setSentiment(userSentiment)
          onFeedbackChange?.(userSentiment)
          
          // Load existing reasoning if available
          if (data.userVote.reasoning) {
            setReasoning(data.userVote.reasoning)
          }
        }
      }
    } catch (error) {
      console.error('Error loading vote data:', error)
    }
  }

  const handleReasoningSubmit = async () => {
    if (!reasoning.trim() || !userId || !billId || !sentiment) return
    
    setReasoningLoading(true)
    try {
      const backendSentiment = sentiment === 'positive' ? 'support' : 'oppose'
      
      const response = await fetch('/api/vote-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId,
          sentiment: backendSentiment,
          userId,
          reasoning: reasoning.trim()
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Reasoning saved successfully')
        setShowReasoning(false)
      } else {
        console.error('Failed to save reasoning:', data.error)
        alert(`Failed to save reasoning: ${data.error}`)
      }
    } catch (error) {
      console.error('Error saving reasoning:', error)
      alert(`Error saving reasoning: ${error}`)
    } finally {
      setReasoningLoading(false)
    }
  }

  const handleSentimentClick = async (newSentiment: 'positive' | 'negative') => {
    if (!userId || !billId) {
      console.error('Missing userId or billId:', { userId, billId })
      return
    }

    setLoading(true)
    try {
      // Toggle sentiment if clicking the same button
      const finalSentiment = sentiment === newSentiment ? null : newSentiment
      
      if (finalSentiment) {
        // Map frontend sentiment to backend sentiment
        const backendSentiment = finalSentiment === 'positive' ? 'support' : 'oppose'
        
        // Save vote to database
        const response = await fetch('/api/vote-bill', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            billId,
            sentiment: backendSentiment,
            userId,
            sectionId,
            sectionTitle
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          setSentiment(finalSentiment)
          setVoteCounters(data.counters)
          onFeedbackChange?.(finalSentiment)
          
          // Show reasoning textbox after voting
          setShowReasoning(true)
          
          // Show notification if AI message was generated
          if (data.aiMessageGenerated) {
            const action = finalSentiment === 'positive' ? 'support' : 'oppose'
            alert(`🤖 Great! Your ${action} vote triggered an AI-generated message! Check the Feed > AI Letters section to sign and send it to representatives.`)
          }
          
          // Also call the original callback for compatibility
          onFeedbackSubmit?.(finalSentiment === 'positive' ? 'positive' : 'negative')
        } else {
          console.error('Failed to save vote:', data.error)
          alert(`Failed to save vote: ${data.error}`)
          // Keep original sentiment on error
        }
      } else {
        // Handle removal of vote (not implemented in backend yet)
        setSentiment(null)
        onFeedbackChange?.(null)
      }
      
    } catch (error) {
      console.error('Error saving sentiment feedback:', error)
      alert(`Error saving vote: ${error}`)
      // Revert on error
      setSentiment(sentiment)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
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
          {showVoteCounts && voteCounters && (
            <span className="text-xs ml-1">({voteCounters.support_count})</span>
          )}
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
          {showVoteCounts && voteCounters && (
            <span className="text-xs ml-1">({voteCounters.oppose_count})</span>
          )}
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
      
      {/* Reasoning textbox */}
      {showReasoning && sentiment && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {sentiment === 'positive' ? '✅ Why do you support this bill?' : '❌ Why do you oppose this bill?'}
            </span>
          </div>
          <Textarea
            placeholder={`Tell us your reasoning for ${sentiment === 'positive' ? 'supporting' : 'opposing'} this bill. Your input will help make AI-generated letters more personalized and effective.`}
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {reasoning.length}/1000 characters
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReasoning(false)}
                disabled={reasoningLoading}
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleReasoningSubmit}
                disabled={reasoningLoading || !reasoning.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {reasoningLoading ? 'Saving...' : 'Save Reasoning'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Show saved reasoning if it exists */}
      {reasoning && !showReasoning && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-700">Your reasoning:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReasoning(true)}
              className="text-blue-600 hover:text-blue-700 p-0 h-auto"
            >
              Edit
            </Button>
          </div>
          <p className="text-sm text-blue-600 italic">"{reasoning}"</p>
        </div>
      )}

      {showVoteCounts && voteCounters && (
        <div className="text-xs text-gray-500 flex items-center gap-4">
          <span>Total votes: {voteCounters.total_votes}</span>
          <span>Support: {voteCounters.support_count}</span>
          <span>Oppose: {voteCounters.oppose_count}</span>
        </div>
      )}
    </div>
  )
} 