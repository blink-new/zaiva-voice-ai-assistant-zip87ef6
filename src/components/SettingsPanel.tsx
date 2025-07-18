import { useState } from 'react'
import { X, Save, User, Mic, Search, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Switch } from './ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import type { ZaivaSettings } from '../types/zaiva'

interface SettingsPanelProps {
  settings: ZaivaSettings
  onSettingsChange: (settings: ZaivaSettings) => void
  onClose: () => void
}

export function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<ZaivaSettings>(settings)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      onSettingsChange(localSettings)
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = <K extends keyof ZaivaSettings>(
    key: K,
    value: ZaivaSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">ZAIVA Settings</CardTitle>
            <CardDescription>
              Customize your AI assistant for Lukas Rejchrt
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* User Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">User Profile</h3>
            </div>
            
            <div className="grid gap-4 pl-7">
              <div className="grid gap-2">
                <Label htmlFor="username">Name</Label>
                <Input
                  id="username"
                  value="Lukas Rejchrt"
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  This is your identity in ZAIVA. Cannot be changed.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* AI Personality Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">AI Personality</h3>
            </div>
            
            <div className="grid gap-4 pl-7">
              <div className="grid gap-2">
                <Label htmlFor="personality">System Instructions</Label>
                <Textarea
                  id="personality"
                  value={localSettings.personalityConfig}
                  onChange={(e) => updateSetting('personalityConfig', e.target.value)}
                  placeholder="Describe how ZAIVA should behave and respond..."
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Define ZAIVA's personality, tone, and behavior. This affects all interactions.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Voice Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Voice Settings</h3>
            </div>
            
            <div className="grid gap-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="voice-enabled">Voice Interaction</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable real-time voice conversation with ZAIVA
                  </p>
                </div>
                <Switch
                  id="voice-enabled"
                  checked={localSettings.voiceEnabled}
                  onCheckedChange={(checked) => updateSetting('voiceEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-transcription">Auto Transcription</Label>
                  <p className="text-xs text-muted-foreground">
                    Show text transcription of voice conversations
                  </p>
                </div>
                <Switch
                  id="auto-transcription"
                  checked={localSettings.autoTranscription}
                  onCheckedChange={(checked) => updateSetting('autoTranscription', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Search Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Search & Grounding</h3>
            </div>
            
            <div className="grid gap-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="web-search">Web Search</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow ZAIVA to search the web for current information
                  </p>
                </div>
                <Switch
                  id="web-search"
                  checked={localSettings.webSearchEnabled}
                  onCheckedChange={(checked) => updateSetting('webSearchEnabled', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>

        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  )
}