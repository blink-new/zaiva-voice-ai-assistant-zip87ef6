import { useState, useEffect, useCallback, useRef } from 'react'
import { GeminiLiveService } from '../services/geminiLive'
import type { VoiceState, GroundingCitation } from '../types/zaiva'
import { blink } from '../blink/client'

interface UseGeminiLiveOptions {
  systemInstruction?: string
  onTextResponse?: (text: string) => void
  onCitationsReceived?: (citations: GroundingCitation[]) => void
  onError?: (error: Error) => void
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [currentResponse, setCurrentResponse] = useState('')
  const [citations, setCitations] = useState<GroundingCitation[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const serviceRef = useRef<GeminiLiveService | null>(null)
  const responseBufferRef = useRef('')

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      // Get API key from Blink secrets via secure fetch
      const response = await blink.data.fetch({
        url: 'https://api.blink.new/internal/secrets/GEMINI_API_KEY',
        method: 'GET'
      })
      
      const apiKey = response.body?.value
      if (!apiKey) {
        throw new Error('Gemini API key not found. Please check your project secrets.')
      }

      const service = new GeminiLiveService({
        apiKey,
        systemInstruction: options.systemInstruction
      })

      // Set up event handlers
      service.onTextResponse = (text: string) => {
        responseBufferRef.current += text
        setCurrentResponse(responseBufferRef.current)
        options.onTextResponse?.(text)
      }

      service.onCitationsReceived = (newCitations: GroundingCitation[]) => {
        setCitations(prev => [...prev, ...newCitations])
        options.onCitationsReceived?.(newCitations)
      }

      service.onTurnComplete = () => {
        setVoiceState('idle')
        responseBufferRef.current = ''
        setCurrentResponse('')
      }

      service.onAudioPlaybackStart = () => {
        setVoiceState('speaking')
      }

      service.onAudioPlaybackComplete = () => {
        setVoiceState('idle')
      }

      service.onError = (err: Error) => {
        setError(err.message)
        setVoiceState('idle')
        options.onError?.(err)
      }

      await service.connect()
      serviceRef.current = service
      setIsConnected(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Gemini Live API'
      setError(errorMessage)
      options.onError?.(new Error(errorMessage))
    } finally {
      setIsConnecting(false)
    }
  }, [isConnecting, isConnected, options])

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect()
      serviceRef.current = null
    }
    setIsConnected(false)
    setVoiceState('idle')
    setCurrentResponse('')
    setCitations([])
  }, [])

  const sendTextMessage = useCallback(async (text: string) => {
    if (!serviceRef.current || !isConnected) {
      throw new Error('Not connected to Gemini Live API')
    }

    try {
      setVoiceState('processing')
      responseBufferRef.current = ''
      setCitations([])
      await serviceRef.current.sendTextMessage(text)
    } catch (err) {
      setVoiceState('idle')
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected])

  const sendAudioMessage = useCallback(async (audioBlob: Blob) => {
    if (!serviceRef.current || !isConnected) {
      throw new Error('Not connected to Gemini Live API')
    }

    try {
      setVoiceState('processing')
      responseBufferRef.current = ''
      setCitations([])
      await serviceRef.current.sendAudioMessage(audioBlob)
    } catch (err) {
      setVoiceState('idle')
      const errorMessage = err instanceof Error ? err.message : 'Failed to send audio message'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [isConnected])

  const stopAudioPlayback = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopAudioPlayback()
    }
    setVoiceState('idle')
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect()
      }
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    voiceState,
    currentResponse,
    citations,
    error,
    connect,
    disconnect,
    sendTextMessage,
    sendAudioMessage,
    stopAudioPlayback,
    setVoiceState
  }
}