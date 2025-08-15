
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConversationList } from './ConversationList'
import { Badge } from '@/components/ui/badge'
import { useConversations } from '@/hooks/useConversations'

interface ConversationTabsProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
}

export function ConversationTabs({ onSelectConversation, selectedConversationId }: ConversationTabsProps) {
  const [activeTab, setActiveTab] = useState('all')
  const { conversations } = useConversations()

  const getConversationCounts = () => {
    const counts = {
      all: conversations.length,
      active_ai: conversations.filter(c => c.status === 'active_ai').length,
      active_human: conversations.filter(c => c.status === 'active_human').length,
      pending_human: conversations.filter(c => c.status === 'pending_human').length,
      closed: conversations.filter(c => c.status === 'closed').length
    }
    return counts
  }



  const counts = getConversationCounts()

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <div className="border-b px-4 pt-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            Todas
            <Badge variant="secondary" className="ml-1">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active_ai" className="flex items-center gap-2">
            AI Activo
            <Badge variant="secondary" className="ml-1">
              {counts.active_ai}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active_human" className="flex items-center gap-2">
            Humano
            <Badge variant="default" className="ml-1">
              {counts.active_human}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending_human" className="flex items-center gap-2">
            Pendientes
            <Badge variant="destructive" className="ml-1">
              {counts.pending_human}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center gap-2">
            Cerradas
            <Badge variant="outline" className="ml-1">
              {counts.closed}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="all" className="h-full m-0">
          <ConversationList
            onSelectConversation={onSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </TabsContent>
        
        <TabsContent value="active_ai" className="h-full m-0">
          <ConversationList
            onSelectConversation={onSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </TabsContent>
        
        <TabsContent value="active_human" className="h-full m-0">
          <ConversationList
            onSelectConversation={onSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </TabsContent>
        
        <TabsContent value="pending_human" className="h-full m-0">
          <ConversationList
            onSelectConversation={onSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </TabsContent>
        
        <TabsContent value="closed" className="h-full m-0">
          <ConversationList
            onSelectConversation={onSelectConversation}
            selectedConversationId={selectedConversationId}
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}
