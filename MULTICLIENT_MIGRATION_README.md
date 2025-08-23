# 🏢 Migración a Sistema Multi-Cliente

## 📋 Resumen

Este documento describe la migración de la plataforma de un sistema mono-cliente (Trueblue) a un sistema multi-cliente que permite servir a múltiples organizaciones desde una sola instancia.

## 🎯 Objetivos

- ✅ Permitir múltiples clientes en una sola plataforma
- ✅ Aislar datos por cliente usando `client_id`
- ✅ Mantener compatibilidad con datos existentes
- ✅ Implementar Row Level Security (RLS) para seguridad
- ✅ Configuración personalizable por cliente
- ✅ Branding dinámico por cliente

## 🗄️ Cambios en Base de Datos

### Nuevas Tablas

#### `clients`
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- identificador único para URLs
    domain TEXT, -- dominio personalizado opcional
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `client_configs`
```sql
CREATE TABLE client_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    config_key TEXT NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, config_key)
);
```

### Modificaciones a Tablas Existentes

Se agregó la columna `client_id UUID REFERENCES clients(id)` a:
- `profiles`
- `tb_conversations`
- `tb_agents`
- `tb_message_templates`

### Nuevas Funciones

#### `get_current_user_client_id()`
Obtiene el `client_id` del usuario autenticado.

#### `validate_client_access(target_client_id UUID)`
Valida si el usuario tiene acceso al cliente especificado.

#### `get_client_config(config_key TEXT)`
Obtiene configuración específica del cliente actual.

### Nueva Vista

#### `current_client_info`
Vista que proporciona información completa del cliente actual del usuario.

## 🔒 Seguridad (RLS)

Se implementaron políticas de Row Level Security para asegurar que los usuarios solo puedan acceder a datos de su cliente:

```sql
-- Ejemplo para tb_conversations
CREATE POLICY "Users can only access their own client's conversations" ON tb_conversations
    FOR ALL USING (client_id = get_current_user_client_id());
```

## 🚀 Migración

### Script de Migración

El archivo `scripts/migrate-to-multiclient.sql` contiene la migración completa y segura.

### Pasos de Migración

1. **Crear tablas nuevas**
   - `clients`
   - `client_configs`

2. **Agregar columnas `client_id`**
   - A todas las tablas existentes

3. **Crear cliente por defecto**
   - Cliente "Trueblue" con UUID fijo

4. **Migrar datos existentes**
   - Asignar todos los registros al cliente Trueblue

5. **Crear índices y funciones**
   - Para optimización y funcionalidad

6. **Habilitar RLS**
   - Políticas de seguridad

7. **Verificar migración**
   - Validaciones automáticas

### Ejecutar Migración

```bash
# En Supabase SQL Editor o psql
\i scripts/migrate-to-multiclient.sql
```

## 🔧 Cambios en el Código

### Nuevo Hook: `useClient`

```typescript
const { 
  clientInfo, 
  getClientDisplayName, 
  getClientShortName,
  getClientLogo,
  getClientColors,
  isFeatureEnabled,
  getLimit 
} = useClient();
```

### Actualizaciones en Hooks Existentes

#### `useAuth`
- Agrega `client_id` al crear perfiles

#### `useConversations`
- Filtra conversaciones por `client_id`

#### `useAgents`
- Filtra agentes por `client_id`
- Asigna `client_id` al crear agentes

#### `useMessageTemplates`
- Filtra plantillas por `client_id`
- Asigna `client_id` al crear plantillas

### Actualizaciones en Componentes

#### `App.tsx`
- Usa `getClientDisplayName()` para mostrar nombre del cliente

## 🎨 Branding Dinámico

### Configuración de Branding

```json
{
  "branding": {
    "name": "Nombre del Cliente",
    "shortName": "NC",
    "logo": "https://example.com/logo.png"
  }
}
```

### Colores Personalizables

- `primary_color`: Color principal del cliente
- `secondary_color`: Color secundario del cliente

## ⚙️ Configuración por Cliente

### Features
```json
{
  "features": {
    "realtime": true,
    "templates": true,
    "agents": true
  }
}
```

### Límites
```json
{
  "limits": {
    "maxAgents": 50,
    "maxTemplates": 100,
    "maxConversations": 10000
  }
}
```

## 📊 Gestión de Clientes

### Crear Nuevo Cliente

```sql
-- Solo admins pueden crear clientes
SELECT create_client(
  'Nombre del Cliente',
  'slug-cliente',
  'cliente.com',
  'https://cliente.com/logo.png',
  '#FF0000',
  '#CC0000'
);
```

### Asignar Usuario a Cliente

```sql
-- Solo admins pueden asignar usuarios
SELECT assign_user_to_client('usuario@email.com', 'slug-cliente');
```

## 🔍 Verificación Post-Migración

### Verificar Cliente Trueblue
```sql
SELECT * FROM clients WHERE slug = 'trueblue';
```

### Verificar Datos Migrados
```sql
-- Verificar que no hay registros sin client_id
SELECT COUNT(*) FROM profiles WHERE client_id IS NULL;
SELECT COUNT(*) FROM tb_conversations WHERE client_id IS NULL;
```

### Verificar RLS
```sql
-- Verificar que las políticas están activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'tb_conversations', 'tb_agents', 'tb_message_templates');
```

## 🚨 Consideraciones Importantes

### Compatibilidad
- ✅ Todos los datos existentes se migran automáticamente
- ✅ No hay cambios en la API pública
- ✅ Funcionalidad existente se mantiene

### Rendimiento
- ✅ Índices optimizados para consultas por cliente
- ✅ RLS no afecta significativamente el rendimiento
- ✅ Consultas filtradas automáticamente

### Seguridad
- ✅ Aislamiento completo de datos entre clientes
- ✅ Políticas RLS verificadas
- ✅ Funciones con `SECURITY DEFINER`

## 🔮 Próximos Pasos

### Funcionalidades Futuras
- [ ] Panel de administración de clientes
- [ ] Dominios personalizados por cliente
- [ ] Configuración avanzada de branding
- [ ] Analytics por cliente
- [ ] Facturación por cliente

### Optimizaciones
- [ ] Cache de configuración del cliente
- [ ] Lazy loading de datos por cliente
- [ ] Compresión de datos históricos

## 📞 Soporte

Para preguntas o problemas con la migración:

1. Revisar logs de la migración
2. Verificar políticas RLS
3. Comprobar configuración del cliente
4. Contactar al equipo de desarrollo

---

**Fecha de Migración**: [Fecha actual]  
**Versión**: 1.0.0  
**Estado**: ✅ Completado
