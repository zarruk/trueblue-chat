
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useAgents } from '@/hooks/useAgents';
import { ConversationTabs } from '@/components/ConversationTabs';
import { ChatContextPanel } from '@/components/ChatContextPanel';
import { ChatWindow } from '@/components/ChatWindow';
import { ConversationWithMessages } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { RealtimeDebugPanel } from '@/components/RealtimeDebugPanel';
import { useRealtimeFallback } from '@/hooks/useRealtimeFallback';


export default function Dashboard() {
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [conversationsPanelWidth, setConversationsPanelWidth] = useState(320); // ancho inicial en px
  const { profile } = useAuth();
  const { 
    conversations, 
    loading, 
    sendMessage, 
    updateConversationStatus, 
    selectConversation,
    messages,
    assignAgent,
    selectedConversationId
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
  };

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

  const getConversationStats = () => {
    const activeAI = conversations.filter(c => c.status === 'active_ai').length;
    const activeHuman = conversations.filter(c => c.status === 'active_human').length;
    const pendingHuman = conversations.filter(c => c.status === 'pending_human').length;
    const unreadMessages = 0;
    const total = conversations.length;

    return { activeAI, activeHuman, pendingHuman, unreadMessages, total };
  };

  const stats = getConversationStats();

  // Debug logs para verificar el flujo de datos
  console.log('🔍 [DEBUG] Dashboard render:', {
    selectedConversationId,
    messagesCount: messages.length,
    conversationsCount: conversations.length,
    selectedConversation: selectedConversation?.id
  });

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-6 pb-0 flex-shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IA Activa</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAI}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humano Activo</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeHuman}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendiente Humano</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingHuman}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Responder</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.unreadMessages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 p-6 pt-6 overflow-hidden">
        <div className="flex h-full gap-6">
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
