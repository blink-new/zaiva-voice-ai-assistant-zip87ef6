import { useState } from 'react'
import { Plus, MessageSquare, Settings, Search, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { cn } from '../lib/utils'
import type { Conversation } from '../types/zaiva'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation: (conversationId: string) => void
  onNewConversation: () => void
  onDeleteConversation: (conversationId: string) => void
  onOpenSettings: () => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg zaiva-gradient flex items-center justify-center">
              <span className="text-sm font-bold text-white">Z</span>
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">ZAIVA</h1>
              <p className="text-xs text-sidebar-foreground/60">Lukas Rejchrt</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={onNewConversation}
          className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/40" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-sidebar-foreground/60">
              {searchQuery ? (
                <p className="text-sm">No conversations found</p>
              ) : (
                <div>
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation to begin</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={cn(
                    "p-3 cursor-pointer transition-colors border-sidebar-border hover:bg-sidebar-accent group",
                    activeConversationId === conversation.id
                      ? "bg-sidebar-accent border-sidebar-primary"
                      : "bg-transparent"
                  )}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-sidebar-foreground truncate">
                        {conversation.title}
                      </h3>
                      <p className="text-xs text-sidebar-foreground/60 mt-1">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-sidebar border-sidebar-border">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteConversation(conversation.id)
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {conversation.lastResumptionHandle && (
                    <Badge variant="outline" className="mt-2 text-xs border-sidebar-border text-sidebar-foreground/60">
                      Resumable
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}