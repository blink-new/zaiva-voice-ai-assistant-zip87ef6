import { useState, useCallback, useMemo } from 'react'
import { AIServiceSimple } from '../services/aiServiceSimple'
import type { VoiceState, GroundingCitation } from '../types/zaiva'

interface UseAIOptions {
  systemInstruction?: string
  onError?: (error: Error) => void
}

export function useAI(options: UseAIOptions = {}) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const aiService = useMemo(() => new AIServiceSimple(), [])

  const sendTextMessage = useCallback(async (text: string): Promise<{ text: string; citations?: GroundingCitation[] }> => {
    setIsProcessing(true)
    setError(null)
    setVoiceState('processing')

    try {
      const response = await aiService.sendTextMessage(text, options.systemInstruction)
      setVoiceState('idle')
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      setVoiceState('idle')
      options.onError?.(new Error(errorMessage))
      throw new Error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [aiService, options])

  const processAudioMessage = useCallback(async (audioBlob: Blob): Promise<{ text: string; aiResponse: string; citations?: GroundingCitation[] }> => {
    setIsProcessing(true)
    setError(null)
    setVoiceState('processing')

    try {
      // First transcribe the audio
      const transcribedText = await aiService.transcribeAudio(audioBlob)
      
      // Then send the transcribed text to AI
      const response = await aiService.sendTextMessage(transcribedText, options.systemInstruction)
      
      // Generate speech for the response
      try {
        const speechUrl = await aiService.generateSpeech(response.text)
        
        // Play the generated speech
        setVoiceState('speaking')
        const audio = new Audio(speechUrl)
        
        audio.onended = () => {
          setVoiceState('idle')
        }
        
        audio.onerror = () => {
          console.warn('Failed to play generated speech')
          setVoiceState('idle')
        }
        
        await audio.play()
      } catch (speechError) {
        console.warn('Speech generation failed, continuing with text response:', speechError)
        setVoiceState('idle')
      }
      
      return { 
        text: transcribedText, // User's transcribed speech
        aiResponse: response.text, // AI's response
        citations: response.citations 
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process audio message'
      setError(errorMessage)
      setVoiceState('idle')
      options.onError?.(new Error(errorMessage))
      throw new Error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [aiService, options])

  const stopAudioPlayback = useCallback(() => {
    // Stop any currently playing audio
    const audioElements = document.querySelectorAll('audio')
    audioElements.forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
    setVoiceState('idle')
  }, [])

  return {
    voiceState,
    isProcessing,
    error,
    sendTextMessage,
    processAudioMessage,
    stopAudioPlayback,
    setVoiceState
  }
}