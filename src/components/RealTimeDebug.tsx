import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { testSupabaseRealTime, checkRealTimeTables } from '@/utils/supabaseRealTimeTest';
import { checkDatabaseStructure } from '@/utils/databaseStructureCheck';

export function RealTimeDebug() {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<string>('');
  const [configStatus, setConfigStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [configResult, setConfigResult] = useState<string>('');
  const [structureStatus, setStructureStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [structureResult, setStructureResult] = useState<string>('');
  const [structureData, setStructureData] = useState<any>(null);

  const handleTestRealTime = async () => {
    setTestStatus('testing');
    setTestResult('Probando real-time...');
    
    try {
      const result = await testSupabaseRealTime();
      if (result.success) {
        setTestStatus('success');
        setTestResult('✅ Real-time funcionando correctamente');
      } else {
        setTestStatus('error');
        setTestResult(`❌ Error: ${(result.error as any)?.message || 'Error desconocido'}`);
      }
    } catch (error: any) {
      setTestStatus('error');
      setTestResult(`❌ Error: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleCheckConfig = async () => {
    setConfigStatus('checking');
    setConfigResult('Verificando configuración...');
    
    try {
      const result = await checkRealTimeTables();
      if (result.success) {
        setConfigStatus('success');
        setConfigResult('✅ Configuración de real-time correcta');
      } else {
        setConfigStatus('error');
        setConfigResult(`❌ Problemas de configuración: ${(result.error as any)?.message || 'Verificar migraciones'}`);
      }
    } catch (error: any) {
      setConfigStatus('error');
      setConfigResult(`❌ Error: ${error?.message || 'Error desconocido'}`);
    }
  };

  const handleCheckStructure = async () => {
    setStructureStatus('checking');
    setStructureResult('Verificando estructura de la base de datos...');
    
    try {
      const result = await checkDatabaseStructure();
      if (result.success) {
        setStructureStatus('success');
        setStructureResult('✅ Estructura de base de datos verificada');
        setStructureData(result);
      } else {
        setStructureStatus('error');
        setStructureResult(`❌ Error verificando estructura: ${(result.error as any)?.message || 'Error desconocido'}`);
      }
    } catch (error: any) {
      setStructureStatus('error');
      setStructureResult(`❌ Error: ${error?.message || 'Error desconocido'}`);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Debug de Real-Time y Base de Datos
          <Badge variant="outline">Desarrollo</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verificación de Estructura de BD */}
        <div className="space-y-2">
          <h3 className="font-medium">1. Verificar Estructura de Base de Datos</h3>
          <p className="text-sm text-muted-foreground">
            Verifica qué tablas existen y su configuración actual
          </p>
          <Button 
            onClick={handleCheckStructure} 
            disabled={structureStatus === 'checking'}
            variant={structureStatus === 'success' ? 'default' : structureStatus === 'error' ? 'destructive' : 'outline'}
          >
            {structureStatus === 'checking' ? 'Verificando...' : 'Verificar Estructura BD'}
          </Button>
          {structureResult && (
            <div className={`text-sm p-2 rounded ${
              structureStatus === 'success' ? 'bg-green-100 text-green-800' :
              structureStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {structureResult}
            </div>
          )}
          
          {/* Mostrar resultados de la verificación */}
          {structureData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">📊 Resultados de la Verificación:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Estado de las tablas:</strong></p>
                  <ul className="list-disc list-inside ml-2">
                    <li>tb_conversations: {structureData.tableChecks?.tb_conversations ? '✅ Existe y accesible' : '❌ No existe o no accesible'}</li>
                    <li>tb_messages: {structureData.tableChecks?.tb_messages ? '✅ Existe y accesible' : '❌ No existe o no accesible'}</li>
                    <li>profiles: {structureData.tableChecks?.profiles ? '✅ Existe y accesible' : '❌ No existe o no accesible'}</li>
                  </ul>
                </div>
                <div>
                  <p><strong>Resumen:</strong></p>
                  <ul className="list-disc list-inside ml-2">
                    <li>Total de tablas accesibles: {structureData.totalTables}/3</li>
                    <li>Estado general: {structureData.totalTables === 3 ? '✅ Completo' : structureData.totalTables > 0 ? '⚠️ Parcial' : '❌ Crítico'}</li>
                  </ul>
                </div>
              </div>
              
              {structureData.permissions && (
                <div className="mt-2">
                  <p><strong>Permisos de acceso:</strong></p>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className={`p-2 rounded text-center text-xs ${
                      structureData.permissions.tb_conversations ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      tb_conversations: {structureData.permissions.tb_conversations ? '✅' : '❌'}
                    </div>
                    <div className={`p-2 rounded text-center text-xs ${
                      structureData.permissions.tb_messages ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      tb_messages: {structureData.permissions.tb_messages ? '✅' : '❌'}
                    </div>
                    <div className={`p-2 rounded text-center text-xs ${
                      structureData.permissions.profiles ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      profiles: {structureData.permissions.profiles ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verificación de Configuración */}
        <div className="space-y-2">
          <h3 className="font-medium">2. Verificar Configuración de Real-Time</h3>
          <p className="text-sm text-muted-foreground">
            Verifica que las tablas estén correctamente configuradas para real-time
          </p>
          <Button 
            onClick={handleCheckConfig} 
            disabled={configStatus === 'checking'}
            variant={configStatus === 'success' ? 'default' : configStatus === 'error' ? 'destructive' : 'outline'}
          >
            {configStatus === 'checking' ? 'Verificando...' : 'Verificar Configuración'}
          </Button>
          {configResult && (
            <div className={`text-sm p-2 rounded ${
              configStatus === 'success' ? 'bg-green-100 text-green-800' :
              configStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {configResult}
            </div>
          )}
        </div>

        {/* Prueba de Real-Time */}
        <div className="space-y-2">
          <h3 className="font-medium">3. Prueba de Real-Time</h3>
          <p className="text-sm text-muted-foreground">
            Prueba la funcionalidad de real-time creando una conversación de prueba
          </p>
          <Button 
            onClick={handleTestRealTime} 
            disabled={testStatus === 'testing'}
            variant={testStatus === 'success' ? 'default' : testStatus === 'error' ? 'destructive' : 'outline'}
          >
            {testStatus === 'testing' ? 'Probando...' : 'Probar Real-Time'}
          </Button>
          {testResult && (
            <div className={`text-sm p-2 rounded ${
              testStatus === 'success' ? 'bg-green-100 text-green-800' :
              testStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {testResult}
            </div>
          )}
        </div>

        {/* Instrucciones y Problemas Comunes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium">📋 Instrucciones de Debug</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Abre la consola del navegador (F12)</p>
              <p>2. Ejecuta las verificaciones en orden</p>
              <p>3. Revisa los logs detallados</p>
              <p>4. Verifica que no haya errores de CORS</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">🐛 Problemas Comunes</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>Tablas faltantes:</strong> Crear las tablas necesarias</p>
              <p>• <strong>RLS Policies:</strong> Verificar permisos de usuario</p>
              <p>• <strong>REPLICA IDENTITY:</strong> Configurar para real-time</p>
              <p>• <strong>Publicación:</strong> Agregar tablas a supabase_realtime</p>
            </div>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="space-y-2">
          <h3 className="font-medium">💡 Recomendaciones</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>1. <strong>Primero</strong> verifica la estructura de la BD</p>
            <p>2. <strong>Luego</strong> verifica la configuración de real-time</p>
            <p>3. <strong>Finalmente</strong> prueba la funcionalidad</p>
            <p>4. Si hay problemas, revisa la consola para logs detallados</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
