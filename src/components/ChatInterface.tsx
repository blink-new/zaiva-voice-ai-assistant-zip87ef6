import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, ExternalLink, FileText, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { AudioWaveform } from './AudioWaveform'
import { ContextSuggestions } from './ContextSuggestions'
import { cn } from '../lib/utils'
import type { Message, GroundingCitation } from '../types/zaiva'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  onFileUpload: (file: File) => void
  isLoading?: boolean
  voiceState?: 'idle' | 'listening' | 'processing' | 'speaking'
  audioLevel?: number
}

export function ChatInterface({ 
  messages, 
  onSendMessage, 
  onFileUpload, 
  isLoading = false,
  voiceState = 'idle',
  audioLevel = 0
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(true)
      setUploadProgress(0)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)
      
      try {
        await onFileUpload(file)
        setUploadProgress(100)
        setTimeout(() => {
          setIsUploading(false)
          setUploadProgress(0)
        }, 500)
      } catch (error) {
        setIsUploading(false)
        setUploadProgress(0)
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const renderCitations = (citations: GroundingCitation[]) => {
    if (!citations || citations.length === 0) return null

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {citations.map((citation, index) => (
          <Badge
            key={index}
            variant="outline"
            className="text-xs cursor-pointer hover:bg-accent/20"
            onClick={() => window.open(citation.uri, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {citation.title || `Source ${index + 1}`}
          </Badge>
        ))}
      </div>
    )
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="w-16 h-16 rounded-lg zaiva-gradient flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">Z</span>
              </div>
              <h3 className="text-lg font-medium mb-2">Welcome to ZAIVA</h3>
              <p>Your personalized AI assistant is ready to help, Lukas.</p>
              <p className="text-sm mt-2">Start a conversation by speaking or typing below.</p>
              
              {/* Voice state indicator */}
              {voiceState !== 'idle' && (
                <div className="mt-4 flex justify-center">
                  <AudioWaveform 
                    isActive={voiceState === 'listening'} 
                    audioLevel={audioLevel}
                    className="opacity-60"
                  />
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <Card
                  className={cn(
                    "max-w-[80%] p-3",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.role === 'user' ? 'You' : 'ZAIVA'}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    
                    {message.groundingCitations && renderCitations(message.groundingCitations)}
                  </div>
                </Card>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-card p-3">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-muted-foreground">ZAIVA is thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Context Suggestions */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4">
          <ContextSuggestions 
            messages={messages}
            onSuggestionClick={(suggestion) => {
              setInputValue(suggestion)
            }}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        {/* File Upload Progress */}
        {isUploading && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Uploading file...</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Voice Activity Indicator */}
        {voiceState === 'listening' && (
          <div className="mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <AudioWaveform 
                  isActive={true} 
                  audioLevel={audioLevel}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-primary font-medium">Listening...</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={voiceState === 'listening' ? "Listening..." : "Type your message or use voice..."}
              disabled={isLoading || voiceState === 'listening'}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading}
              title="Upload document (PDF, TXT, DOCX)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading || voiceState === 'listening'}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}