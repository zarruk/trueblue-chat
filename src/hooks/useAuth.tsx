import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: any; message?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Defer profile fetch to avoid blocking
          setTimeout(async () => {
            console.log('🔍 Buscando perfil para usuario:', session.user.email);
            
            // Find profile by email (new system without user_id dependency)
            let { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', session.user.email || '')
              .single();

            if (profileError) {
              console.error('❌ Error buscando perfil por email:', profileError);
              console.log('⚠️ No se encontró perfil para:', session.user.email);
            } else if (profile) {
              console.log('✅ Perfil encontrado por email:', profile);
              
              // Si el perfil está en estado "pending", activarlo automáticamente
              if (profile.status === 'pending') {
                console.log(`🔄 Activando agente pendiente: ${session.user.email}`);
                
                const { data: updatedProfile, error: updateError } = await supabase
                  .from('profiles')
                  .update({ status: 'active' })
                  .eq('email', session.user.email || '')
                  .select()
                  .single();

                if (updateError) {
                  console.error('❌ Error activando perfil:', updateError);
                } else {
                  console.log(`✅ Agente activado exitosamente: ${session.user.email}`);
                  profile = updatedProfile; // Usar el perfil actualizado
                }
              }
              
              // Solo usar perfiles activos
              if (profile.status !== 'active') {
                console.log('⚠️ Perfil no está activo:', profile.status);
                profile = null;
              }
            }
            
            console.log('🏁 Perfil final cargado en Auth:', profile);
            setProfile(profile);
          }, 100);
        } else {
          console.log('👤 Usuario no autenticado o evento no relevante');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Initial profile fetch will be handled by the auth state change
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
    if (error) {
      return { error };
    }
    
    return { 
      error: null, 
      message: 'Se ha enviado un enlace mágico a tu correo electrónico. Revisa tu bandeja de entrada.' 
    };
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signInWithMagicLink,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}