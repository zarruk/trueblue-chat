
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
    <div className="h-full flex flex-col overflow-hidden">
      <ConversationList
        onSelectConversation={onSelectConversation}
        selectedConversationId={selectedConversationId}
        conversations={conversations}
        loading={loading}
      />
    </div>
  )
}
