// ZAIVA Types - Single User System

export interface UserProfile {
  id: string
  username: string
  email: string
  personalityConfig: string
  lastActive: string
  createdAt: string
}

export interface Conversation {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
  lastResumptionHandle?: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  audioUrl?: string
  timestamp: string
  groundingCitations?: GroundingCitation[]
}

export interface GroundingCitation {
  startIndex: number
  endIndex: number
  uri: string
  title: string
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

export interface AudioConfig {
  sampleRate: number
  channels: number
  bitDepth: number
}

export interface ZaivaSettings {
  personalityConfig: string
  voiceEnabled: boolean
  autoTranscription: boolean
  webSearchEnabled: boolean
}