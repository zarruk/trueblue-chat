
import { ConversationList } from './ConversationList'

interface ConversationTabsProps {
  onSelectConversation: (conversationId: string) => void
  selectedConversationId?: string
}

export function ConversationTabs({ onSelectConversation, selectedConversationId }: ConversationTabsProps) {
  return (
    <div className="h-full flex flex-col">
      <ConversationList
        onSelectConversation={onSelectConversation}
        selectedConversationId={selectedConversationId}
      />
    </div>
  )
}
