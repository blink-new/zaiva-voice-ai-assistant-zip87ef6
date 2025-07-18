// Simplified AI Service for ZAIVA using Blink SDK directly
import { blink } from '../blink/client'
import type { GroundingCitation } from '../types/zaiva'

export interface AIResponse {
  text: string
  citations?: GroundingCitation[]
}

export class AIServiceSimple {
  async sendTextMessage(content: string, systemInstruction?: string): Promise<AIResponse> {
    try {
      console.log('Sending text message via Blink AI:', { contentLength: content.length })
      
      // Use Blink's built-in AI service with web search
      const response = await blink.ai.generateText({
        prompt: content,
        search: true, // Enable web search for grounding
        model: 'gpt-4o-mini'
      })

      console.log('Blink AI response received successfully')
      
      // Extract citations from sources if available
      const citations: GroundingCitation[] = []
      if (response.sources) {
        response.sources.forEach((source, index) => {
          citations.push({
            startIndex: 0, // Blink doesn't provide exact indices
            endIndex: response.text.length,
            uri: source.url || '',
            title: source.title || `Source ${index + 1}`
          })
        })
      }

      return { 
        text: response.text,
        citations: citations.length > 0 ? citations : undefined
      }
    } catch (error) {
      console.error('Blink AI Service error:', error)
      throw error
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('Transcribing audio via Blink AI:', { size: audioBlob.size })
      
      // Convert audio to base64 for transcription
      const base64Audio = await this.blobToBase64(audioBlob)
      
      // Use Blink's AI transcription service
      const result = await blink.ai.transcribeAudio({
        audio: base64Audio,
        language: 'en'
      })
      
      console.log('Audio transcription completed successfully')
      return result.text
    } catch (error) {
      console.error('Transcription error:', error)
      throw new Error('Failed to transcribe audio')
    }
  }

  async generateSpeech(text: string): Promise<string> {
    try {
      console.log('Generating speech via Blink AI:', { textLength: text.length })
      
      // Use Blink's AI speech generation
      const result = await blink.ai.generateSpeech({
        text,
        voice: 'nova'
      })
      
      console.log('Speech generation completed successfully')
      return result.url
    } catch (error) {
      console.error('Speech generation error:', error)
      throw new Error('Failed to generate speech')
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}