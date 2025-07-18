import { useState, useEffect, useCallback } from 'react'
import { blink, SINGLETON_USER } from './blink/client'
import { VoiceButton } from './components/VoiceButton'
import { ChatInterface } from './components/ChatInterface'
import { ConversationSidebar } from './components/ConversationSidebar'
import { SettingsPanel } from './components/SettingsPanel'
import { Toaster } from './components/ui/sonner'
import { useAI } from './hooks/useAI'
import { toast } from 'sonner'
import type { 
  VoiceState, 
  Conversation, 
  Message, 
  ZaivaSettings,
  UserProfile 
} from './types/zaiva'

function App() {
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Voice state
  const [audioLevel, setAudioLevel] = useState(0)

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // UI state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Settings state
  const [settings, setSettings] = useState<ZaivaSettings>({
    personalityConfig: 'You are ZAIVA, a sophisticated AI assistant created specifically for Lukas Rejchrt. You are intelligent, helpful, and have a warm personality. You remember our conversations and provide personalized assistance.',
    voiceEnabled: true,
    autoTranscription: true,
    webSearchEnabled: true
  })

  // AI integration
  const ai = useAI({
    systemInstruction: settings.personalityConfig,
    onError: (error) => {
      toast.error(`AI Error: ${error.message}`)
    }
  })

  // Initialize authentication
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setIsLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  // Load conversations when user is authenticated
  useEffect(() => {
    if (user) {
      loadConversations()
      loadUserSettings()
    }
  }, [user])

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId)
    } else {
      setMessages([])
    }
  }, [activeConversationId])

  const loadConversations = async () => {
    try {
      const result = await blink.db.conversations.list({
        where: { userId: SINGLETON_USER.id },
        orderBy: { updatedAt: 'desc' }
      })
      setConversations(result)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      toast.error('Failed to load conversations')
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const result = await blink.db.messages.list({
        where: { conversationId },
        orderBy: { timestamp: 'asc' }
      })
      
      // Parse grounding citations from JSON strings
      const parsedMessages = result.map(msg => ({
        ...msg,
        groundingCitations: msg.groundingCitations 
          ? JSON.parse(msg.groundingCitations) 
          : undefined
      }))
      
      setMessages(parsedMessages)
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const loadUserSettings = async () => {
    try {
      const profile = await blink.db.userProfile.list({
        where: { id: SINGLETON_USER.id },
        limit: 1
      })
      
      if (profile.length > 0) {
        setSettings(prev => ({
          ...prev,
          personalityConfig: profile[0].personalityConfig || prev.personalityConfig
        }))
      }
    } catch (error) {
      console.error('Failed to load user settings:', error)
    }
  }

  const createNewConversation = async (): Promise<string | null> => {
    try {
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await blink.db.conversations.create({
        id: conversationId,
        userId: SINGLETON_USER.id,
        title: 'New Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      setActiveConversationId(conversationId)
      await loadConversations()
      toast.success('New conversation started')
      return conversationId
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to create new conversation')
      return null
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await blink.db.conversations.delete(conversationId)
      
      if (activeConversationId === conversationId) {
        setActiveConversationId(null)
      }
      
      await loadConversations()
      toast.success('Conversation deleted')
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      toast.error('Failed to delete conversation')
    }
  }

  const sendMessage = async (content: string) => {
    if (!activeConversationId) {
      const newConversationId = await createNewConversation()
      if (!newConversationId) {
        toast.error('Failed to create conversation')
        return
      }
    }

    setIsChatLoading(true)
    
    try {
      // Add user message
      const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const userMessage: Message = {
        id: userMessageId,
        conversationId: activeConversationId,
        role: 'user',
        content,
        timestamp: new Date().toISOString()
      }

      await blink.db.messages.create(userMessage)
      setMessages(prev => [...prev, userMessage])

      // Get AI response
      const aiResponse = await ai.sendTextMessage(content)
      
      const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: activeConversationId,
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date().toISOString(),
        groundingCitations: aiResponse.citations
      }

      await blink.db.messages.create({
        ...assistantMessage,
        groundingCitations: aiResponse.citations ? JSON.stringify(aiResponse.citations) : undefined
      })
      setMessages(prev => [...prev, assistantMessage])
      
      // Update conversation timestamp
      await blink.db.conversations.update(activeConversationId, {
        updatedAt: new Date().toISOString()
      })
      
      await loadConversations()

    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    toast.info(`File upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    // File processing will be implemented with backend integration
  }

  const handleSettingsChange = async (newSettings: ZaivaSettings) => {
    try {
      await blink.db.userProfile.update(SINGLETON_USER.id, {
        personalityConfig: newSettings.personalityConfig
      })
      
      setSettings(newSettings)
      setIsSettingsOpen(false)
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg zaiva-gradient flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold text-white">Z</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">ZAIVA</h1>
          <p className="text-muted-foreground">Initializing your AI assistant...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-lg zaiva-gradient flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-bold text-white">Z</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to ZAIVA</h1>
          <p className="text-muted-foreground mb-6">Your personalized AI assistant</p>
          <p className="text-sm text-muted-foreground">Please sign in to continue</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId || undefined}
        onSelectConversation={setActiveConversationId}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {activeConversationId 
                  ? conversations.find(c => c.id === activeConversationId)?.title || 'Conversation'
                  : 'ZAIVA Assistant'
                }
              </h2>
              <p className="text-sm text-muted-foreground">
                Voice-first AI assistant for Lukas Rejchrt
              </p>
            </div>
            
            {settings.voiceEnabled && (
              <VoiceButton
                state={ai.voiceState}
                onStateChange={ai.setVoiceState}
                disabled={false}
                onAudioData={async (audioBlob) => {
                  let conversationId = activeConversationId
                  if (!conversationId) {
                    conversationId = await createNewConversation()
                    if (!conversationId) {
                      toast.error('Failed to create conversation')
                      return
                    }
                  }
                  
                  try {
                    const result = await ai.processAudioMessage(audioBlob)
                    
                    // Add user message (transcribed text)
                    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    const userMessage: Message = {
                      id: userMessageId,
                      conversationId: conversationId,
                      role: 'user',
                      content: result.text,
                      timestamp: new Date().toISOString()
                    }

                    await blink.db.messages.create(userMessage)
                    setMessages(prev => [...prev, userMessage])

                    // Add AI response
                    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    const assistantMessage: Message = {
                      id: assistantMessageId,
                      conversationId: conversationId,
                      role: 'assistant',
                      content: result.aiResponse, // AI's response text
                      timestamp: new Date().toISOString(),
                      groundingCitations: result.citations
                    }

                    await blink.db.messages.create({
                      ...assistantMessage,
                      groundingCitations: result.citations ? JSON.stringify(result.citations) : undefined
                    })
                    setMessages(prev => [...prev, assistantMessage])
                    
                    // Update conversation timestamp
                    await blink.db.conversations.update(conversationId, {
                      updatedAt: new Date().toISOString()
                    })
                    
                    await loadConversations()
                  } catch (error) {
                    console.error('Voice processing error:', error)
                    toast.error('Failed to process voice message')
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1">
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            onFileUpload={handleFileUpload}
            isLoading={isChatLoading || ai.isProcessing}
            voiceState={ai.voiceState}
            audioLevel={audioLevel}
          />
        </div>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <Toaster />
    </div>
  )
}

export default App