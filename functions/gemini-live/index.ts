import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

interface GeminiRequest {
  type: 'text' | 'audio'
  content: string
  systemInstruction?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    })
  }

  try {
    const { type, content, systemInstruction } = await req.json() as GeminiRequest
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    console.log('Function called with:', { type, contentLength: content?.length, hasApiKey: !!apiKey })
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment')
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        details: 'GEMINI_API_KEY environment variable is missing'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // For now, use the regular Gemini API for text generation
    // The Live API requires WebSocket which is complex to proxy
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: content
          }]
        }],
        systemInstruction: {
          parts: [{
            text: systemInstruction || "You are ZAIVA, a sophisticated AI assistant created specifically for Lukas Rejchrt. You are helpful, intelligent, and have a warm, professional personality. Keep responses conversational and natural."
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        tools: [{
          googleSearchRetrieval: {}
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API error: ${response.status} - ${errorText}`)
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Gemini API response received successfully')
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
})