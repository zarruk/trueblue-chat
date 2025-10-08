import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useAgents } from '@/hooks/useAgents';
import { ConversationTabs } from '@/components/ConversationTabs';
import { ChatContextPanel } from '@/components/ChatContextPanel';
import { ChatWindow } from '@/components/ChatWindow';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { RealtimeDebugPanel } from '@/components/RealtimeDebugPanel';
import { useRealtimeFallback } from '@/hooks/useRealtimeFallback';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


export default function Dashboard() {
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [conversationsPanelWidth, setConversationsPanelWidth] = useState(320); // ancho inicial en px
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    conversations, 
    loading, 
    refreshing,
    sendMessage, 
    updateConversationStatus, 
    selectConversation,
    messages,
    assignAgent,
    selectedConversationId,
    updateUserDisplayName,
    clearSelectedConversation,
    fetchConversations,
    fetchMessages,
    // Scroll infinito y bÃºsqueda
    loadMore,
    loadingMore,
    hasMore,
    searchConversations,
    isSearching,
    searchQuery,
    // Estados de paginaciÃ³n (legacy)
    currentPage,
    totalCount,
    // Estados para control inteligente de scroll
    isUserScrolling,
    newConversationIds,
    handleScrollStateChange
  } = useConversations();
  const { agents } = useAgents();
  
  // DESHABILITADO: No usar polling automÃ¡tico para evitar refrescos
  // const enableFallback = import.meta.env.MODE === 'production' || import.meta.env.VITE_ENABLE_POLLING === 'true';
  // useRealtimeFallback({
  //   enabled: enableFallback,
  //   fetchConversations,
  //   fetchMessages,
  //   selectedConversationId
  // });

  // ✅ FIX: Page Visibility API DESHABILITADO para evitar interferencias con canales WebSocket
  // El problema original era que al volver de otra pestaña, los canales se interferían
  // Supabase maneja la reconexión automáticamente, no necesitamos intervenir
  useEffect(() => {
    console.log('👁️ [PAGE VISIBILITY] Page Visibility API deshabilitado - Supabase maneja reconexión automática')
    
    // No hacer nada - dejar que Supabase maneje todo automáticamente
    return () => {
      console.log('👁️ [PAGE VISIBILITY] Page Visibility cleanup - no action needed')
    }
  }, []) // Sin dependencias - solo se ejecuta una vez

  // ✅ FIX: NO necesitamos cleanup global - cada componente maneja sus propios canales
  // Supabase limpiará automáticamente los canales cuando el cliente se desconecte

  // Las conversaciones se actualizan automÃ¡ticamente vÃ­a tiempo real

  // Keep selectedConversation synchronized with conversations updates
  const selectedConversation = selectedConversationId 
    ? conversations.find(conv => conv.id === selectedConversationId) || null
    : null;

  const handleSelectConversation = useCallback((conversationId: string) => {
    console.log('ðŸ–±ï¸ Conversation selected:', conversationId);
    selectConversation(conversationId);
    // sincronizar URL para deep-linking
    const params = new URLSearchParams(location.search);
    params.set('conv', conversationId);
    navigate({ pathname: '/dashboard', search: params.toString() }, { replace: true });
  }, [selectConversation, location.search, navigate]);

  // seleccionar conversaciÃ³n desde query param ?conv=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const conv = params.get('conv');
    if (conv && conv !== selectedConversationId) {
      console.log('ðŸ”— Dashboard: seleccionando conversaciÃ³n desde query param:', conv);
      selectConversation(conv);
    } else if (!conv && selectedConversationId) {
      // Si se elimina el query param, limpiar selecciÃ³n (Ãºtil en mÃ³vil al pulsar volver)
      clearSelectedConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  if (loading && conversations.length === 0) {
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
    <div className="h-full w-full">
      {/* CSS Grid Layout Responsive */}
      <div className="h-full grid grid-cols-1 tablet:grid-cols-[1fr] desktop:grid-cols-[320px_1px_1fr] transition-all duration-300">
        
        {/* Conversations Panel - Oculto en mÃ³vil */}
        <aside className="
          hidden desktop:block desktop:col-start-1 desktop:col-end-2 desktop:row-span-full
          flex flex-col h-full min-h-0 overflow-hidden
        ">
          <ConversationTabs
            selectedConversationId={selectedConversationId || undefined}
            onSelectConversation={handleSelectConversation}
            conversations={conversations}
            loading={loading || refreshing}
            fetchConversations={fetchConversations}
            selectById={(id) => handleSelectConversation(id)}
            loadMore={loadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
            searchConversations={searchConversations}
            isSearching={isSearching}
            searchQuery={searchQuery}
            currentPage={currentPage}
            totalCount={totalCount}
            onScrollStateChange={handleScrollStateChange}
            isUserScrolling={isUserScrolling}
            newConversationIds={newConversationIds}
          />
        </aside>

        {/* Resize Handle - Solo en desktop */}
        <div className="
          hidden desktop:block desktop:col-start-2 desktop:col-end-3 desktop:row-span-full
          w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors relative group
        " onMouseDown={handleResizeStart}>
          <div className="absolute inset-0 -mx-1" />
          <div className="w-full bg-current opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Chat Area */}
        <main className="
          col-span-full tablet:col-span-full desktop:col-start-3 desktop:col-end-4 desktop:row-span-full
          flex flex-col h-full min-h-0 overflow-hidden
        ">
          {/* Mobile: Show conversations list or chat */}
          <div className="desktop:hidden h-full">
            {!selectedConversation ? (
              <div className="h-full min-h-0 overflow-hidden">
                <ConversationTabs
                  selectedConversationId={selectedConversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  conversations={conversations}
                  loading={loading || refreshing}
                  fetchConversations={fetchConversations}
                  selectById={(id) => handleSelectConversation(id)}
                  loadMore={loadMore}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  searchConversations={searchConversations}
                  isSearching={isSearching}
                  searchQuery={searchQuery}
                  currentPage={currentPage}
                  totalCount={totalCount}
                  onScrollStateChange={handleScrollStateChange}
                  isUserScrolling={isUserScrolling}
                  newConversationIds={newConversationIds}
                />
              </div>
            ) : (
              <ChatWindow
                conversationId={selectedConversationId || undefined}
                messages={messages}
                loading={loading}
                onSendMessage={(conversationId, content, senderRole) => sendMessage(conversationId, content, senderRole as 'user' | 'ai' | 'agent')}
                onSelectConversation={selectConversation}
                onUpdateConversationStatus={updateConversationStatus}
                onAssignAgent={(conversationId, agentId) => assignAgent(conversationId, agentId)}
                conversations={conversations}
                onMobileBack={() => {
                  const params = new URLSearchParams(location.search)
                  params.delete('conv')
                  navigate({ pathname: '/dashboard', search: params.toString() }, { replace: true })
                }}
              />
            )}
          </div>

          {/* Desktop: Always show chat */}
          <div className="hidden desktop:flex flex-col h-full min-h-0 overflow-hidden">
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
                  <p>Selecciona una conversaciÃ³n para ver los mensajes</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Context Panel - Solo en desktop */}
      {contextPanelOpen && (
        <div className="hidden desktop:block fixed right-0 top-12 bottom-0 w-80 bg-background border-l z-40">
          <ChatContextPanel 
            conversation={selectedConversation} 
            onToggleVisibility={() => setContextPanelOpen(false)}
            onUpdateUserName={updateUserDisplayName}
          />
        </div>
      )}
      
      {/* Panel de Debug para Realtime - Solo en staging/dev */}
      {(import.meta.env.MODE !== 'production' || import.meta.env.VITE_ENABLE_DEBUG === 'true') && (
        <RealtimeDebugPanel 
          conversations={conversations}
          updateConversationStatus={updateConversationStatus}
        />
      )}
    </div>
  );
}
