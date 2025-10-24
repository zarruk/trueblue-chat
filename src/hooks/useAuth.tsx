import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean; // auth + perfil
  isProfileReady: boolean;
  clientId: string | null;
  signInWithMagicLink: (email: string) => Promise<{ error: any; message?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const profileLoadedRef = useRef(false);
  const isLoadingProfileRef = useRef(false); // 🛡️ Protección contra llamadas duplicadas

  const loadProfile = async (u: User, skipLoadingState = false) => {
    // 🛡️ PROTECCIÓN: Si ya hay una carga en progreso, ignorar esta llamada
    if (isLoadingProfileRef.current) {
      console.log('⏭️ loadProfile: Ya hay una carga en progreso, ignorando...');
      return;
    }
    
    isLoadingProfileRef.current = true;
    console.log('🔐 loadProfile: Iniciando carga de perfil...');
    
    // Si ya tenemos un perfil y no queremos cambiar el loading state, usar modo silencioso
    if (!skipLoadingState) {
      setProfileLoading(true);
    }
    try {
      const email = u.email || '';
      const name = (u.user_metadata as any)?.name || email?.split('@')[0] || 'Agente';
      console.log('🔍 Buscando/creando perfil para usuario:', email);
      
      // 1) Buscar perfil existente por email (más reciente)
      console.log('🔍 Ejecutando consulta a tabla profiles...');
      const { data: initialProfile, error: selectErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log('🔍 Consulta profiles completada. Data:', initialProfile, 'Error:', selectErr);

      let finalProfile = initialProfile as Profile | null;

      if (selectErr) {
        console.error('❌ Error buscando perfil por email:', selectErr);
      }

      if (!finalProfile) {
        // ✅ CORRECTO: Solo crear perfil si NO existe
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
          // ✅ Si hay error de conflicto (409), intentar obtener el perfil existente
          if (insertErr.code === '23505' || insertErr.message?.includes('duplicate') || insertErr.message?.includes('conflict')) {
            console.log('🔄 Conflicto de email, obteniendo perfil existente...');
            const { data: existingProfile, error: selectErr2 } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (!selectErr2 && existingProfile) {
              finalProfile = existingProfile as Profile;
              console.log('✅ Perfil existente obtenido después del conflicto');
            }
          }
        } else {
          finalProfile = inserted as Profile | null;
          console.log('✅ Perfil creado exitosamente');
        }
      } else if (finalProfile && (finalProfile as any).status === 'pending') {
        // ✅ CORRECTO: Solo actualizar si existe y está pending
        console.log('🔄 Activando perfil pending:', email);
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
          console.log('✅ Perfil activado exitosamente');
        }
      } else if (finalProfile && (finalProfile as any).status === 'inactive') {
        // Activar si estaba inactivo
        console.log(`🔄 Activando agente inactivo: ${email}`);
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
      
      if (finalProfile) {
        profileLoadedRef.current = true;
      }
    } catch (e) {
      console.error('❌ Excepción resolviendo perfil:', e);
      setProfile(null);
    } finally {
      if (!skipLoadingState) {
        setProfileLoading(false);
      }
      isLoadingProfileRef.current = false; // 🔓 Liberar la bandera siempre
      console.log('🔓 loadProfile: Carga completada, bandera liberada');
    }
  };

  useEffect(() => {
    // Logs específicos para diagnóstico móvil
    console.log('🔍 MOBILE DEBUG - AuthProvider useEffect started');
    console.log('🔍 MOBILE DEBUG - User agent:', navigator.userAgent);
    console.log('🔍 MOBILE DEBUG - Is mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    console.log('🔍 MOBILE DEBUG - Window location:', window.location.href);
    console.log('🔍 MOBILE DEBUG - Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    // ✅ CRÍTICO: Bandera para evitar que onAuthStateChange actúe antes de getSession
    let sessionInitialized = false;
    
    // 1️⃣ PRIMERO: Establecer la sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 getSession: Procesando sesión inicial');
      setSession(session);
      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        console.log('🔍 getSession: Usuario encontrado, cargando perfil');
        await loadProfile(u);
      } else {
        console.log('🔍 getSession: No hay usuario, reseteando estados');
        setProfile(null);
        setProfileLoading(false);
      }
      
      setAuthLoading(false);
      sessionInitialized = true; // 🔓 Permitir que onAuthStateChange actúe ahora
      console.log('✅ getSession: Completado, auth listener puede proceder');
    });

    // 2️⃣ SEGUNDO: Set up auth state listener (se ejecutará después)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 MOBILE DEBUG - Auth state changed:', event, session?.user?.email);
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        // 🛡️ CRÍTICO: No hacer NADA hasta que getSession() complete
        if (!sessionInitialized) {
          console.log('⏭️ onAuthStateChange: Esperando a que getSession() complete, ignorando evento:', event);
          return;
        }
        
        setSession(session);
        const u = session?.user ?? null;
        setUser(u);
        
        if (u) {
          // ✅ Solo recargar perfil en SIGNED_IN (nuevo login después de la inicialización)
          // NO recargar en TOKEN_REFRESHED para evitar desmontar componentes
          if (event === 'SIGNED_IN') {
            // Si ya cargamos el perfil anteriormente, usar modo silencioso para no desmontar componentes
            const hasLoadedBefore = profileLoadedRef.current;
            console.log('🔍 Perfil ya cargado anteriormente:', hasLoadedBefore);
            
            // ✅ SOLUCIÓN 1: Solo recargar si NO se ha cargado antes
            if (!hasLoadedBefore) {
              await loadProfile(u, false);
            } else {
              console.log('⏭️ Perfil ya cargado, evitando recarga innecesaria');
              // Solo asegurar que loading se resetee
              setProfileLoading(false);
            }
          } else {
            console.log('⏭️ Evento de auth no requiere recarga de perfil:', event);
            // Asegurar que loading se resetee incluso si no cargamos perfil
            if (!profileLoadedRef.current) {
              setProfileLoading(false);
            }
            setAuthLoading(false);
          }
        } else {
          console.log('👤 Usuario no autenticado');
          setProfile(null);
          setProfileLoading(false);
          profileLoadedRef.current = false;
          isLoadingProfileRef.current = false; // Resetear la bandera
        }
        
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const resolveRedirectUrl = (): string => {
    // En desarrollo, SIEMPRE usar la URL de red para magic links
    if (import.meta.env.DEV) {
      const networkUrl = import.meta.env.VITE_NETWORK_URL;
      if (networkUrl) {
        console.log('🔧 Development mode - Always using network URL for magic links:', networkUrl);
        return networkUrl;
      }
    }
    
    // En producción, usar la URL actual del navegador
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`;
    }
    
    // Fallback a variable de entorno
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
      return { error, message: undefined };
    }
    
    return { error: undefined, message: 'Enlace mágico enviado. Revisa tu correo electrónico.' };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const loading = authLoading || profileLoading;
  const isProfileReady = !profileLoading;
  const clientId = useMemo(() => profile?.client_id ?? null, [profile]);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isProfileReady,
      clientId,
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
