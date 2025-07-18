import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Volume2, Loader2, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { VoiceState } from '../types/zaiva'

interface VoiceButtonProps {
  state: VoiceState
  onStateChange: (state: VoiceState) => void
  disabled?: boolean
  onAudioData?: (audioData: Blob) => void
  onAudioProcessed?: (transcribedText: string, aiResponse: string) => void
}

export function VoiceButton({ 
  state, 
  onStateChange, 
  disabled = false,
  onAudioData,
  onAudioProcessed
}: VoiceButtonProps) {
  const [isPressed, setIsPressed] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const audioChunksRef = useRef<Blob[]>([])

  // Audio level monitoring
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    
    // Calculate average audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    setAudioLevel(average / 255) // Normalize to 0-1

    if (state === 'listening') {
      animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
    }
  }, [state])

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      streamRef.current = stream
      audioChunksRef.current = []

      // Set up audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        onAudioData?.(audioBlob)
      }
      
      mediaRecorder.start(100) // 100ms chunks
      onStateChange('listening')
      
      // Start audio level monitoring
      monitorAudioLevel()
    } catch (error) {
      console.error('Failed to start recording:', error)
      onStateChange('idle')
    }
  }, [onStateChange, onAudioData, monitorAudioLevel])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    setAudioLevel(0)
    onStateChange('processing')
    
    // Simulate processing delay (will be replaced with actual Gemini Live API)
    setTimeout(() => {
      onStateChange('idle')
    }, 1500)
  }, [onStateChange])

  const handleClick = useCallback(() => {
    if (disabled) return
    
    switch (state) {
      case 'idle':
        startListening()
        break
      case 'listening':
        stopListening()
        break
      case 'speaking':
        // Interrupt speaking
        onStateChange('idle')
        break
      default:
        break
    }
  }, [state, disabled, startListening, stopListening, onStateChange])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const getIcon = () => {
    switch (state) {
      case 'listening':
        return <Mic className="h-6 w-6" />
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin" />
      case 'speaking':
        return <Volume2 className="h-6 w-6" />
      default:
        return <MicOff className="h-6 w-6" />
    }
  }

  const getButtonClass = () => {
    const baseClass = "h-16 w-16 rounded-full transition-all duration-200 relative overflow-hidden"
    
    switch (state) {
      case 'listening':
        return cn(baseClass, "bg-primary hover:bg-primary/90 listening-animation")
      case 'processing':
        return cn(baseClass, "bg-muted hover:bg-muted/90")
      case 'speaking':
        return cn(baseClass, "bg-accent hover:bg-accent/90 speaking-animation")
      default:
        return cn(baseClass, "bg-secondary hover:bg-secondary/80")
    }
  }

  const getStatusText = () => {
    switch (state) {
      case 'idle':
        return 'Tap to speak'
      case 'listening':
        return 'Listening...'
      case 'processing':
        return 'Processing...'
      case 'speaking':
        return 'Speaking...'
      default:
        return 'Ready'
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Button
          onClick={handleClick}
          disabled={disabled}
          className={getButtonClass()}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
        >
          {getIcon()}
          
          {/* Audio level visualization */}
          {state === 'listening' && (
            <div 
              className="absolute inset-0 rounded-full border-2 border-white/30"
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
                opacity: 0.6 + audioLevel * 0.4
              }}
            />
          )}
        </Button>

        {/* Power indicator */}
        {state !== 'idle' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <Zap className="h-2 w-2 text-white" />
          </div>
        )}
      </div>
      
      <div className="text-center">
        <span className="text-sm text-muted-foreground block">
          {getStatusText()}
        </span>
        
        {/* Audio level indicator */}
        {state === 'listening' && (
          <div className="mt-1 w-16 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-100 rounded-full"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}