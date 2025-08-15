
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useAgents } from '@/hooks/useAgents';
import { ConversationTabs } from '@/components/ConversationTabs';
import { ChatWindow } from '@/components/ChatWindow';
import { ConversationWithMessages } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';


export default function Dashboard() {
  const { profile } = useAuth();
  const { 
    conversations, 
    loading, 
    sendMessage, 
    updateConversationStatus, 
    selectConversation,
    messages,
    selectedConversationId 
  } = useConversations();
  const { agents } = useAgents();

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

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <ConversationTabs
            selectedConversationId={selectedConversationId || undefined}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              {selectedConversation ? (
                <ChatWindow
                  conversationId={selectedConversationId || undefined}
                  messages={messages}
                  loading={loading}
                  onSendMessage={(conversationId, content, senderRole) => sendMessage(conversationId, content, senderRole as 'user' | 'ai' | 'agent')}
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
      </div>
    </div>
  );
}
