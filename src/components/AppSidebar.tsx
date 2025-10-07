
import { Link, useLocation } from 'react-router-dom'
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Bug,
  Menu,
  X,
  Kanban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/hooks/useAuth'
import { useClient } from '@/hooks/useClient'
import { useState, useEffect } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: MessageSquare },
  { name: 'Embudo', href: '/embudo', icon: Kanban },
  { name: 'Agentes', href: '/agents', icon: Users },
  { name: 'Métricas', href: '/metrics', icon: BarChart3 },
  // { name: 'Debug', href: '/debug', icon: Bug }, // oculto
  { name: 'Configuración', href: '/settings', icon: Settings },
]

interface AppSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const { getClientDisplayName, getClientShortName } = useClient()
  const [isMobile, setIsMobile] = useState(false)

  // Detectar si es móvil (unificado con ResponsiveLayout: 768px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        // En móviles, el estado se maneja desde el componente padre
      } else {
        // En desktop, mantener el estado del componente padre
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-background border-r">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">{getClientShortName()}</span>
          </div>
          <span className="font-semibold text-lg">{getClientDisplayName()}</span>
        </Link>
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onToggle()}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }
              `}
              onClick={() => {
                // Cerrar sidebar móvil al hacer clic en un enlace
                if (isMobile) {
                  onToggle()
                }
              }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Menu & Theme Toggle */}
      <div className="border-t p-4 space-y-4">
        <div className="flex items-center justify-between">
          <ThemeToggle />
        </div>
        
        {user && profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage src={undefined} alt={profile.name} />
                  <AvatarFallback>
                    {profile.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{profile.name}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => onToggle()}
          />
        )}
        
        {/* Mobile sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <SidebarContent />
        </div>
      </>
    )
  }

  // Desktop sidebar
  return (
    <div className={`
      hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 transition-all duration-300 ease-in-out z-30
      ${isOpen ? 'lg:w-64' : 'lg:w-0 lg:overflow-hidden'}
    `}>
      <SidebarContent />
    </div>
  )
}