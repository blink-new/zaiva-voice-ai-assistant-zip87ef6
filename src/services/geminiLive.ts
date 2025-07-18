// Gemini Live API Service for ZAIVA
import type { Message, GroundingCitation } from '../types/zaiva'

export interface GeminiLiveConfig {
  apiKey: string
  systemInstruction?: string
  sessionResumptionHandle?: string
}

export interface GeminiMessage {
  role: 'user' | 'assistant'
  content: string
  audioData?: ArrayBuffer
  groundingCitations?: GroundingCitation[]
}

export class GeminiLiveService {
  private ws: WebSocket | null = null
  private config: GeminiLiveConfig
  private isConnected = false
  private messageQueue: any[] = []
  private audioContext: AudioContext | null = null
  private audioQueue: AudioBuffer[] = []
  private isPlaying = false
  private currentSource: AudioBufferSourceNode | null = null

  constructor(config: GeminiLiveConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent?key=${this.config.apiKey}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('Connected to Gemini Live API')
          this.isConnected = true
          this.sendSetupMessage()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('Disconnected from Gemini Live API')
          this.isConnected = false
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private sendSetupMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const setupMessage = {
      setup: {
        model: "models/gemini-2.0-flash-exp",
        generation_config: {
          response_modalities: ["AUDIO", "TEXT"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: "Aoede"
              }
            }
          }
        },
        system_instruction: {
          parts: [{
            text: this.config.systemInstruction || `You are ZAIVA, a sophisticated AI assistant created specifically for Lukas Rejchrt. You are helpful, intelligent, and have a warm, professional personality. You can search the web for current information when needed. Keep responses conversational and natural.`
          }]
        },
        tools: [{
          google_search: {}
        }]
      }
    }

    this.ws.send(JSON.stringify(setupMessage))
  }

  private async handleMessage(data: string) {
    try {
      const message = JSON.parse(data)
      
      if (message.serverContent) {
        await this.handleServerContent(message.serverContent)
      }
      
      if (message.setupComplete) {
        console.log('Gemini Live setup complete')
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  }

  private async handleServerContent(content: any) {
    if (content.modelTurn) {
      const parts = content.modelTurn.parts || []
      
      for (const part of parts) {
        if (part.text) {
          this.onTextResponse?.(part.text)
        }
        
        if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
          await this.handleAudioResponse(part.inlineData.data)
        }
      }

      // Handle grounding metadata
      if (content.groundingMetadata) {
        const citations = this.extractCitations(content.groundingMetadata)
        this.onCitationsReceived?.(citations)
      }
    }

    if (content.turnComplete) {
      this.onTurnComplete?.()
    }
  }

  private extractCitations(groundingMetadata: any): GroundingCitation[] {
    const citations: GroundingCitation[] = []
    
    if (groundingMetadata.groundingAttributions) {
      groundingMetadata.groundingAttributions.forEach((attr: any) => {
        if (attr.segment && attr.web) {
          citations.push({
            startIndex: attr.segment.startIndex || 0,
            endIndex: attr.segment.endIndex || 0,
            uri: attr.web.uri || '',
            title: attr.web.title || 'Web Source'
          })
        }
      })
    }
    
    return citations
  }

  private async handleAudioResponse(audioData: string) {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 24000 })
      }

      // Decode base64 audio data
      const binaryData = atob(audioData)
      const arrayBuffer = new ArrayBuffer(binaryData.length)
      const uint8Array = new Uint8Array(arrayBuffer)
      
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i)
      }

      // Convert PCM data to AudioBuffer
      const audioBuffer = await this.pcmToAudioBuffer(arrayBuffer)
      this.audioQueue.push(audioBuffer)
      
      if (!this.isPlaying) {
        this.playNextAudio()
      }
    } catch (error) {
      console.error('Error handling audio response:', error)
    }
  }

  private async pcmToAudioBuffer(pcmData: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('Audio context not initialized')
    
    const int16Array = new Int16Array(pcmData)
    const audioBuffer = this.audioContext.createBuffer(1, int16Array.length, 24000)
    const channelData = audioBuffer.getChannelData(0)
    
    // Convert 16-bit PCM to float32
    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768.0
    }
    
    return audioBuffer
  }

  private playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false
      this.onAudioPlaybackComplete?.()
      return
    }

    if (!this.audioContext) return

    this.isPlaying = true
    this.onAudioPlaybackStart?.()
    
    const audioBuffer = this.audioQueue.shift()!
    this.currentSource = this.audioContext.createBufferSource()
    this.currentSource.buffer = audioBuffer
    this.currentSource.connect(this.audioContext.destination)
    
    this.currentSource.onended = () => {
      this.playNextAudio()
    }
    
    this.currentSource.start()
  }

  async sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Gemini Live API')
    }

    const message = {
      clientContent: {
        turns: [{
          role: "user",
          parts: [{
            text: text
          }]
        }],
        turnComplete: true
      }
    }

    this.ws.send(JSON.stringify(message))
  }

  async sendAudioMessage(audioBlob: Blob) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to Gemini Live API')
    }

    try {
      // Convert audio blob to the required format
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioData = await this.convertAudioToPCM(arrayBuffer)
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioData)))

      const message = {
        realtimeInput: {
          mediaChunks: [{
            mimeType: "audio/pcm",
            data: base64Audio
          }]
        }
      }

      this.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Error sending audio message:', error)
      throw error
    }
  }

  private async convertAudioToPCM(audioData: ArrayBuffer): Promise<ArrayBuffer> {
    // Create audio context for conversion
    const audioContext = new AudioContext({ sampleRate: 16000 })
    
    try {
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0))
      
      // Resample to 16kHz mono if needed
      const targetSampleRate = 16000
      const targetChannels = 1
      
      let resampledBuffer = audioBuffer
      
      if (audioBuffer.sampleRate !== targetSampleRate || audioBuffer.numberOfChannels !== targetChannels) {
        const offlineContext = new OfflineAudioContext(
          targetChannels,
          Math.ceil(audioBuffer.duration * targetSampleRate),
          targetSampleRate
        )
        
        const source = offlineContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(offlineContext.destination)
        source.start()
        
        resampledBuffer = await offlineContext.startRendering()
      }
      
      // Convert to 16-bit PCM
      const channelData = resampledBuffer.getChannelData(0)
      const pcmData = new Int16Array(channelData.length)
      
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]))
        pcmData[i] = sample * 32767
      }
      
      return pcmData.buffer
    } finally {
      await audioContext.close()
    }
  }

  stopAudioPlayback() {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
    this.audioQueue = []
    this.isPlaying = false
    this.onAudioPlaybackComplete?.()
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.stopAudioPlayback()
    this.isConnected = false
  }

  // Event handlers
  onTextResponse?: (text: string) => void
  onCitationsReceived?: (citations: GroundingCitation[]) => void
  onTurnComplete?: () => void
  onAudioPlaybackStart?: () => void
  onAudioPlaybackComplete?: () => void
  onError?: (error: Error) => void
}