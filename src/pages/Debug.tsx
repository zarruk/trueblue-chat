import { RealTimeDebug } from '@/components/RealTimeDebug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DebugPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">🔧 Página de Debug</h1>
        <p className="text-muted-foreground">
          Herramientas para diagnosticar y probar la funcionalidad de real-time
        </p>
        <Badge variant="outline">Solo para desarrollo</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Información del Proyecto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Proyecto:</strong> TrueBlue Chat Management
            </div>
            <div>
              <strong>Base de Datos:</strong> Supabase
            </div>
            <div>
              <strong>URL:</strong> avkpygwhymnxotwqzknz.supabase.co
            </div>
            <div>
              <strong>Estado:</strong> <Badge variant="outline">Conectado</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Estado de Real-Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📡 Estado de Real-Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Conversaciones:</strong> <Badge variant="outline">Pendiente</Badge>
            </div>
            <div>
              <strong>Mensajes:</strong> <Badge variant="outline">Pendiente</Badge>
            </div>
            <div>
              <strong>Perfiles:</strong> <Badge variant="outline">Pendiente</Badge>
            </div>
            <div>
              <strong>Configuración:</strong> <Badge variant="outline">Pendiente</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚡ Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Verificar BD:</strong> Usar el componente de debug
            </div>
            <div>
              <strong>Probar Real-Time:</strong> Ejecutar pruebas automáticas
            </div>
            <div>
              <strong>Revisar Logs:</strong> Abrir consola del navegador
            </div>
            <div>
              <strong>Documentación:</strong> REALTIME_TROUBLESHOOTING.md
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Componente Principal de Debug */}
      <RealTimeDebug />

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📚 Recursos de Ayuda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">📖 Documentación</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>REALTIME_TROUBLESHOOTING.md</code> - Guía completa</li>
                <li>• <code>SUPABASE_SETUP.md</code> - Configuración inicial</li>
                <li>• <code>env.example</code> - Variables de entorno</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🔧 Archivos de Configuración</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code>20250813000000_fix_realtime_config.sql</code> - Migración</li>
                <li>• <code>src/integrations/supabase/client.ts</code> - Cliente</li>
                <li>• <code>src/hooks/useConversations.tsx</code> - Hook principal</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">🚀 Próximos Pasos</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Ejecutar la verificación de estructura de BD</li>
              <li>Revisar si faltan tablas o configuración</li>
              <li>Aplicar la migración de real-time si es necesario</li>
              <li>Probar la funcionalidad de real-time</li>
              <li>Verificar que los mensajes se sincronicen en tiempo real</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





