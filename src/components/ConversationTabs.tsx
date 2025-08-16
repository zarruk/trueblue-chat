
import { ConversationList } from './ConversationList'
import { Conversation } from '@/hooks/useConversations'

interface ConversationTabsProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
  conversations: Conversation[]
  loading: boolean
}

export function ConversationTabs({ onSelectConversation, selectedConversationId, conversations, loading }: ConversationTabsProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold tracking-tight">Conversaciones</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ConversationList
          onSelectConversation={onSelectConversation}
          selectedConversationId={selectedConversationId}
          conversations={conversations}
          loading={loading}
        />
      </div>
    </div>
  )
}
