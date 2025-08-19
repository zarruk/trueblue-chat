
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useAgents } from '@/hooks/useAgents';
import { ConversationTabs } from '@/components/ConversationTabs';
import { ChatContextPanel } from '@/components/ChatContextPanel';
import { ChatWindow } from '@/components/ChatWindow';
import { ConversationWithMessages } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { RealtimeDebugPanel } from '@/components/RealtimeDebugPanel';
import { useRealtimeFallback } from '@/hooks/useRealtimeFallback';
import { useLocation, useNavigate } from 'react-router-dom';


export default function Dashboard() {
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [conversationsPanelWidth, setConversationsPanelWidth] = useState(320); // ancho inicial en px
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    conversations, 
    loading, 
    sendMessage, 
    updateConversationStatus, 
    selectConversation,
    messages,
    assignAgent,
    selectedConversationId,
    updateUserDisplayName
  } = useConversations();
  const { agents } = useAgents();
  
  // Activar fallback de polling en staging y production (no en dev local)
  const enableFallback = import.meta.env.MODE === 'production' || import.meta.env.VITE_ENABLE_POLLING === 'true';
  useRealtimeFallback(enableFallback);

  // Las conversaciones se actualizan automáticamente vía tiempo real

  // Keep selectedConversation synchronized with conversations updates
  const selectedConversation = selectedConversationId 
    ? conversations.find(conv => conv.id === selectedConversationId) || null
    : null;

  const handleSelectConversation = (conversationId: string) => {
    console.log('🖱️ Conversation selected:', conversationId);
    selectConversation(conversationId);
    // sincronizar URL para deep-linking
    const params = new URLSearchParams(location.search);
    params.set('conv', conversationId);
    navigate({ pathname: '/dashboard', search: params.toString() }, { replace: true });
  };

  // seleccionar conversación desde query param ?conv=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conv = params.get('conv');
    if (conv && conv !== selectedConversationId) {
      console.log('🔗 Dashboard: seleccionando conversación desde query param:', conv);
      selectConversation(conv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = conversationsPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(250, Math.min(600, startWidth + deltaX)); // min 250px, max 600px
      setConversationsPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 min-h-0 p-3 xl:p-6 pt-3 xl:pt-6 overflow-hidden">
        <div className="flex h-full gap-3 xl:gap-6">
          {/* Conversations List */}
          <div 
            className="hidden xl:flex flex-col h-full min-h-0 flex-shrink-0"
            style={{ width: `${conversationsPanelWidth}px` }}
          >
            <ConversationTabs
              selectedConversationId={selectedConversationId || undefined}
              onSelectConversation={handleSelectConversation}
              conversations={conversations}
              loading={loading}
            />
          </div>

          {/* Resize Handle */}
          <div 
            className="hidden xl:flex w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors relative group"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute inset-0 -mx-1" /> {/* Área de click más grande */}
            <div className="w-full bg-current opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Chat Window */}
          <div className="flex flex-col h-full min-h-0 overflow-hidden flex-1">
            <Card className="h-full flex flex-col">
              <CardContent className="p-0 h-full flex-1 overflow-hidden">
                {selectedConversation ? (
                  <ChatWindow
                    conversationId={selectedConversationId || undefined}
                    messages={messages}
                    loading={loading}
                    onSendMessage={(conversationId, content, senderRole) => sendMessage(conversationId, content, senderRole as 'user' | 'ai' | 'agent')}
                    onSelectConversation={selectConversation}
                    onUpdateConversationStatus={updateConversationStatus}
                    onAssignAgent={(conversationId, agentId) => assignAgent(conversationId, agentId)}
                    conversations={conversations}
                    showContextToggle={!contextPanelOpen}
                    onToggleContext={() => setContextPanelOpen(true)}
                    onMobileBack={() => {
                      const params = new URLSearchParams(location.search)
                      params.delete('conv')
                      navigate({ pathname: '/dashboard', search: params.toString() }, { replace: true })
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Selecciona una conversación para ver los mensajes</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Context Panel */}
          {contextPanelOpen && (
            <div className="hidden xl:block w-80 h-full min-h-0 flex-shrink-0">
              <ChatContextPanel 
                conversation={selectedConversation} 
                onToggleVisibility={() => setContextPanelOpen(false)}
                onUpdateUserName={updateUserDisplayName}
              />
            </div>
          )}
        </div>

        {/* Mobile Layout - Mantener el original para móviles */}
        <div className="xl:hidden h-full">
          {!selectedConversation ? (
            <div className="flex flex-col h-full min-h-0">
              <ConversationTabs
                selectedConversationId={selectedConversationId || undefined}
                onSelectConversation={handleSelectConversation}
                conversations={conversations}
                loading={loading}
              />
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0 overflow-hidden">
              <Card className="h-full flex flex-col">
                <CardContent className="p-0 h-full flex-1 overflow-hidden">
                  <ChatWindow
                    conversationId={selectedConversationId || undefined}
                    messages={messages}
                    loading={loading}
                    onSendMessage={(conversationId, content, senderRole) => sendMessage(conversationId, content, senderRole as 'user' | 'ai' | 'agent')}
                    onSelectConversation={selectConversation}
                    onUpdateConversationStatus={updateConversationStatus}
                    onAssignAgent={(conversationId, agentId) => assignAgent(conversationId, agentId)}
                    conversations={conversations}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Panel de Debug para Realtime - Solo en staging/dev */}
      {(import.meta.env.MODE !== 'production' || import.meta.env.VITE_ENABLE_DEBUG === 'true') && (
        <RealtimeDebugPanel />
      )}
    </div>
  );
}
