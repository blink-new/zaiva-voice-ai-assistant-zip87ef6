import { createClient } from '@blinkdotnew/sdk'

// ZAIVA - Single User System
// This client is configured for Lukas Rejchrt as the sole user
export const blink = createClient({
  projectId: 'zaiva-voice-ai-assistant-zip87ef6',
  authRequired: true
})

// Singleton user context - all operations are for Lukas
export const SINGLETON_USER = {
  name: 'Lukas Rejchrt',
  username: 'lukas',
  id: 'lukas-singleton'
} as const

export type SingletonUser = typeof SINGLETON_USER