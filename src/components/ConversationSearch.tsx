

import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Conversation } from '@/hooks/useConversations';

interface ConversationSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSearchResults?: (results: Conversation[]) => void;
  isSearching?: boolean;
}

export function ConversationSearch({ 
  searchTerm, 
  onSearchChange, 
  onSearchResults,
  isSearching = false 
}: ConversationSearchProps) {
  const [isSearchingComplete, setIsSearchingComplete] = useState(false);
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [searchTime, setSearchTime] = useState<number>(0);
  const { profile } = useAuth();

  // Debounce para evitar búsquedas excesivas
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms de debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Función de búsqueda completa en la base de datos
  const performCompleteSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearchingComplete(false);
      if (onSearchResults) {
        onSearchResults([]);
      }
      return;
    }

    if (!profile?.client_id) {
      console.log('❌ ConversationSearch: No client_id available');
      return;
    }

    const startTime = Date.now();
    setIsSearchingComplete(true);

    try {
      console.log('🔍 ConversationSearch: Buscando en base de datos:', term);
      
      const { data, error } = await supabase
        .from('tb_conversations')
        .select('*')
        .eq('client_id', profile.client_id)
        .or(`username.ilike.%${term}%,phone_number.ilike.%${term}%,user_id.ilike.%${term}%`)
        .order('updated_at', { ascending: false })
        .limit(100); // Límite de 100 resultados

      const endTime = Date.now();
      setSearchTime(endTime - startTime);

      if (error) {
        console.error('❌ ConversationSearch: Error en búsqueda:', error);
        setSearchResults([]);
        return;
      }

      console.log('✅ ConversationSearch: Búsqueda completada:', data?.length || 0, 'resultados');
      console.log('⏱️ ConversationSearch: Tiempo de búsqueda:', endTime - startTime, 'ms');

      // Obtener último mensaje para cada resultado
      const resultsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation: any) => {
          try {
            const { data: lastMessage } = await supabase
              .from('tb_messages')
              .select('sender_role, content, created_at')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...conversation,
              last_message_sender_role: lastMessage?.sender_role || null,
              last_message_at: lastMessage?.created_at || null,
              last_message_content: lastMessage?.content || null
            };
          } catch (error) {
            return {
              ...conversation,
              last_message_sender_role: null,
              last_message_at: null,
              last_message_content: null
            };
          }
        })
      );

      setSearchResults(resultsWithLastMessage);
      if (onSearchResults) {
        onSearchResults(resultsWithLastMessage);
      }

    } catch (error) {
      console.error('❌ ConversationSearch: Excepción en búsqueda:', error);
      setSearchResults([]);
    } finally {
      setIsSearchingComplete(false);
    }
  }, [profile?.client_id, onSearchResults]);

  // Ejecutar búsqueda cuando cambie el término debounced
  useEffect(() => {
    performCompleteSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performCompleteSearch]);

  const handleClearSearch = () => {
    onSearchChange('');
    setSearchResults([]);
    setIsSearchingComplete(false);
    if (onSearchResults) {
      onSearchResults([]);
    }
  };

  const getSearchStatusMessage = () => {
    if (isSearchingComplete) {
      return `Buscando...`;
    }
    if (searchResults.length > 0) {
      return `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} encontrado${searchResults.length !== 1 ? 's' : ''} en ${searchTime}ms`;
    }
    if (debouncedSearchTerm.length >= 2) {
      return 'No se encontraron resultados';
    }
    return '';
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {(isSearchingComplete || isSearching) && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      
      {/* Mensaje de estado de búsqueda */}
      {getSearchStatusMessage() && (
        <div className="text-xs text-muted-foreground px-1">
          {getSearchStatusMessage()}
        </div>
      )}
      
      {/* Información adicional para búsquedas completas */}
      {searchResults.length >= 100 && (
        <div className="text-xs text-orange-600 dark:text-orange-400 px-1">
          ⚠️ Mostrando solo los primeros 100 resultados. Refina tu búsqueda para ver más.
        </div>
      )}
    </div>
  );
}
