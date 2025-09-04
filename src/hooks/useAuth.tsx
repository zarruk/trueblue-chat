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
        
        if (session?.user && event === 'SIGNED_IN') {
          // Solo cargar perfil en SIGNED_IN, no en TOKEN_REFRESHED para evitar refrescos
          setTimeout(async () => {
            const u = session.user;
            const email = u.email || '';
            const name = (u.user_metadata as any)?.name || email?.split('@')[0] || 'Agente';
            console.log('🔍 Buscando/creando perfil para usuario:', email);
            try {
              // Buscar por email (puede no existir aún) - tomar el más reciente si hay duplicados
              const { data: initialProfile, error: selectErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              let finalProfile = initialProfile as Profile | null;

              if (selectErr) {
                console.error('❌ Error buscando perfil por email:', selectErr);
              }

              if (!finalProfile) {
                // NO crear perfil automáticamente
                console.log('⚠️ Usuario sin perfil:', email);
                console.log('⚠️ Contacta al administrador para crear tu perfil');
                // Continuar sin perfil - mostrar pantalla de acceso denegado
              }
              else if (finalProfile && (finalProfile as any).status === 'pending') {
                // Autocrear perfil mínimo (id = auth.uid())
                console.log('➕ Creando perfil porque no existe:', email);
                const { data: inserted, error: insertErr } = await supabase
                  .from('profiles')
                  .insert({ 
                    id: u.id,
                    user_id: u.id,
                    email, 
                    name, 
                    status: 'active',
                    client_id: '550e8400-e29b-41d4-a716-446655440000' // Cliente Trueblue por defecto
                  })
                  .select('*')
                  .maybeSingle();

                if (insertErr) {
                  console.error('❌ Error creando perfil:', insertErr);
                } else {
                  finalProfile = inserted as Profile | null;
                }
              } else if (finalProfile && (finalProfile as any).status === 'pending') {
                // Activar si estaba pendiente
                console.log(`🔄 Activando agente pendiente: ${email}`);
                const { data: updated, error: updateErr } = await supabase
                  .from('profiles')
                  .update({ status: 'active' })
                  .eq('email', email)
                  .select('*')
                  .maybeSingle();
                if (updateErr) {
                  console.error('❌ Error activando perfil:', updateErr);
                } else if (updated) {
                  finalProfile = updated as Profile;
                }
              }

              // Backfill: asegurar que user_id esté seteado para RLS
              if (finalProfile && !(finalProfile as any).user_id) {
                console.log('🛠️ Backfill user_id en profiles para RLS');
                const { data: updatedUserId, error: backfillErr } = await supabase
                  .from('profiles')
                  .update({ user_id: u.id })
                  .eq('id', (finalProfile as any).id)
                  .select('*')
                  .maybeSingle();
                if (backfillErr) {
                  console.warn('⚠️ No se pudo backfillear user_id en profiles:', backfillErr);
                } else if (updatedUserId) {
                  finalProfile = updatedUserId as Profile;
                }
              }

              // Si no logramos obtener/crear, continuar sin bloquear la app
              if (!finalProfile) {
                console.log('⚠️ No se encontró/creó perfil, continuando sin perfil');
              }

              console.log('🏁 Perfil final cargado en Auth:', finalProfile);
              console.log('🏁 Client ID del perfil:', finalProfile?.client_id);
              setProfile(finalProfile || null);
            } catch (e) {
              console.error('❌ Excepción resolviendo perfil:', e);
              setProfile(null);
            }
          }, 50);
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
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resolveRedirectUrl = (): string => {
    // Preferir siempre el dominio actual para evitar envs desactualizados
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`;
    }
    // Fallback a variable de entorno si por alguna razón no hay window (SSR no aplica aquí)
    return (import.meta.env.VITE_APP_URL as string) || '/';
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = resolveRedirectUrl();
    
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
      const redirectUrl = resolveRedirectUrl();
      
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