import { useState, useEffect } from 'react'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'
import type { Message } from '../types/zaiva'

interface ContextSuggestionsProps {
  messages: Message[]
  onSuggestionClick: (suggestion: string) => void
  className?: string
}

interface Suggestion {
  text: string
  category: 'follow-up' | 'clarification' | 'related' | 'action'
  icon?: string
}

export function ContextSuggestions({ 
  messages, 
  onSuggestionClick, 
  className 
}: ContextSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Generate context-aware suggestions based on recent messages
    const generateSuggestions = () => {
      if (messages.length === 0) {
        // Initial suggestions for new conversations
        return [
          { text: "What can you help me with today?", category: 'follow-up' as const },
          { text: "Tell me about the latest tech news", category: 'action' as const },
          { text: "Help me plan my day", category: 'action' as const },
          { text: "Explain a complex topic to me", category: 'action' as const }
        ]
      }

      const lastMessage = messages[messages.length - 1]
      const contextSuggestions: Suggestion[] = []

      if (lastMessage?.role === 'assistant') {
        // Generate follow-up questions based on assistant's response
        if (lastMessage.content.includes('explain') || lastMessage.content.includes('information')) {
          contextSuggestions.push(
            { text: "Can you explain that in simpler terms?", category: 'clarification' },
            { text: "Give me more details about this", category: 'follow-up' },
            { text: "What are the practical applications?", category: 'related' }
          )
        }

        if (lastMessage.content.includes('help') || lastMessage.content.includes('assist')) {
          contextSuggestions.push(
            { text: "What else can you help me with?", category: 'follow-up' },
            { text: "Show me step-by-step instructions", category: 'action' },
            { text: "Are there any alternatives?", category: 'related' }
          )
        }

        // Always include some general suggestions
        contextSuggestions.push(
          { text: "Continue this conversation", category: 'follow-up' },
          { text: "Ask me something", category: 'action' }
        )
      }

      // Limit to 4 suggestions and add variety
      return contextSuggestions.slice(0, 4)
    }

    const newSuggestions = generateSuggestions()
    setSuggestions(newSuggestions)
    setIsVisible(newSuggestions.length > 0)
  }, [messages])

  const getCategoryColor = (category: Suggestion['category']) => {
    switch (category) {
      case 'follow-up':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'clarification':
        return 'bg-accent/10 text-accent-foreground border-accent/20'
      case 'related':
        return 'bg-secondary/10 text-secondary-foreground border-secondary/20'
      case 'action':
        return 'bg-muted/10 text-muted-foreground border-muted/20'
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

  const getCategoryLabel = (category: Suggestion['category']) => {
    switch (category) {
      case 'follow-up':
        return 'Follow-up'
      case 'clarification':
        return 'Clarify'
      case 'related':
        return 'Related'
      case 'action':
        return 'Action'
      default:
        return 'Suggestion'
    }
  }

  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <Card className={cn("p-4 border-dashed", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          Suggestions for Lukas
        </span>
      </div>
      
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="ghost"
            className="justify-between h-auto p-3 text-left hover:bg-accent/5"
            onClick={() => onSuggestionClick(suggestion.text)}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm">{suggestion.text}</span>
              <Badge 
                variant="outline" 
                className={cn("text-xs", getCategoryColor(suggestion.category))}
              >
                {getCategoryLabel(suggestion.category)}
              </Badge>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </Button>
        ))}
      </div>
    </Card>
  )
}