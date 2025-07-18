// AI Service for ZAIVA using Blink Edge Function
import { blink } from '../blink/client'
import type { GroundingCitation } from '../types/zaiva'

export interface AIResponse {
  text: string
  citations?: GroundingCitation[]
}

export class AIService {
  private functionUrl = 'https://zip87ef6--gemini-live.functions.blink.new'

  async sendTextMessage(content: string, systemInstruction?: string): Promise<AIResponse> {
    try {
      console.log('Sending text message to AI service:', { contentLength: content.length })
      
      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Removed Authorization header since function doesn't use JWT verification
        },
        body: JSON.stringify({
          type: 'text',
          content,
          systemInstruction
        })
      })

      console.log('AI service response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('AI service error response:', errorText)
        throw new Error(`AI service error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('AI service response received successfully')
      
      if (data.error) {
        console.error('AI service returned error:', data.error)
        throw new Error(data.error)
      }

      // Extract text from Gemini response
      const candidate = data.candidates?.[0]
      const text = candidate?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
      
      // Extract citations if available
      const citations: GroundingCitation[] = []
      if (candidate?.groundingMetadata?.groundingAttributions) {
        candidate.groundingMetadata.groundingAttributions.forEach((attr: any) => {
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

      return { text, citations }
    } catch (error) {
      console.error('AI Service error:', error)
      throw error
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      // Convert audio to base64 for transcription
      const base64Audio = await this.blobToBase64(audioBlob)
      
      // Use Blink's AI transcription service
      const result = await blink.ai.transcribeAudio({
        audio: base64Audio,
        language: 'en'
      })
      
      return result.text
    } catch (error) {
      console.error('Transcription error:', error)
      throw new Error('Failed to transcribe audio')
    }
  }

  async generateSpeech(text: string): Promise<string> {
    try {
      // Use Blink's AI speech generation
      const result = await blink.ai.generateSpeech({
        text,
        voice: 'nova'
      })
      
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