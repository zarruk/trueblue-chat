# TrueBlue Chat Management

Sistema de gestión de chat en tiempo real con integración completa de Supabase, diseñado para equipos de soporte y atención al cliente.

## 🚀 Características

- **Autenticación completa** con Supabase Auth
- **Chat en tiempo real** usando Supabase Realtime
- **Gestión de agentes** con sistema de roles (admin, agent)
- **Dashboard interactivo** con métricas en tiempo real
- **Integración con n8n** para automatización de flujos
- **UI moderna** con shadcn/ui y Tailwind CSS
- **Responsive design** para todos los dispositivos
- **Sistema de búsqueda** y filtrado avanzado
- **Gestión de conversaciones** con estados y asignación

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: React Hooks + TanStack Query
- **Deployment**: Vercel
- **CI/CD**: GitHub + Vercel automático

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase
- Cuenta de Vercel (opcional para despliegue)

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd trueblue-chat-management
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env.local
   ```
   
   Editar `.env.local` con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

## 🌍 Entornos

### Desarrollo Local
```bash
npm run dev
```

### Staging
```bash
npm run build:staging
```

### Producción
```bash
npm run build:production
```

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes de shadcn/ui
│   ├── AppSidebar.tsx  # Barra lateral principal
│   ├── ChatWindow.tsx  # Ventana de chat
│   └── ...
├── hooks/               # Custom hooks de React
│   ├── useAuth.tsx      # Hook de autenticación
│   ├── useConversations.tsx # Hook de conversaciones
│   └── ...
├── integrations/        # Integraciones externas
│   └── supabase/       # Cliente y tipos de Supabase
├── pages/               # Páginas de la aplicación
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Agents.tsx      # Gestión de agentes
│   └── ...
├── types/               # Tipos de TypeScript
├── utils/               # Utilidades y helpers
└── lib/                 # Librerías y configuraciones
```

## 🔐 Configuración de Supabase

1. **Crear proyecto en Supabase**
2. **Configurar autenticación** con email/password
3. **Crear las tablas** usando el SQL de `database.sql`
4. **Configurar RLS** (Row Level Security)
5. **Configurar políticas** de acceso

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio** a Vercel
2. **Configurar variables de entorno** en Vercel
3. **Desplegar automáticamente** en cada push

### Manual

```bash
npm run build
# Subir contenido de /dist a tu hosting
```

## 📱 Funcionalidades Principales

### Sistema de Autenticación
- Login/Registro con email y contraseña
- Magic links para autenticación sin contraseña
- Gestión de sesiones persistentes
- Protección de rutas

### Dashboard
- Métricas en tiempo real
- Estadísticas de conversaciones
- Estado de agentes
- Alertas y notificaciones

### Gestión de Conversaciones
- Lista de conversaciones activas
- Filtros por estado y agente
- Búsqueda avanzada
- Asignación de agentes

### Chat en Tiempo Real
- Mensajes instantáneos
- Indicadores de escritura
- Historial de conversaciones
- Archivos adjuntos

### Sistema de Agentes
- Crear y gestionar agentes
- Asignar roles y permisos
- Monitorear actividad
- Estadísticas de rendimiento

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# App
VITE_APP_NAME=
VITE_APP_VERSION=
VITE_APP_ENV=

# n8n
VITE_N8N_WEBHOOK_URL=

# Features
VITE_ENABLE_DEBUG_MODE=
VITE_ENABLE_ANALYTICS=
```

### Personalización de Temas

Editar `src/index.css` para personalizar colores y estilos.

### Configuración de Base de Datos

Ver `database.sql` para la estructura completa de la base de datos.

## 🧪 Testing

```bash
# Verificar tipos
npm run type-check

# Linting
npm run lint

# Build de prueba
npm run build
```

## 📊 Monitoreo y Analytics

- **Supabase Analytics** para métricas de base de datos
- **Vercel Analytics** para métricas de rendimiento
- **Logs personalizados** para debugging

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: [Wiki del proyecto]
- **Issues**: [GitHub Issues]
- **Discord**: [Servidor de la comunidad]

## 🙏 Agradecimientos

- [Supabase](https://supabase.com) por la infraestructura backend
- [shadcn/ui](https://ui.shadcn.com) por los componentes UI
- [Vercel](https://vercel.com) por el hosting y despliegue
- [Tailwind CSS](https://tailwindcss.com) por el framework de CSS

---

**TrueBlue Chat Management** - Construido con ❤️ para equipos de soporte
