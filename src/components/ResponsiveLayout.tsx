import React, { useState, useEffect } from 'react';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useClient } from '@/hooks/useClient';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { getClientDisplayName } = useClient();

  // Detectar cambios de tamaÃ±o de pantalla
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // breakpoint tablet
      setIsMobile(mobile);
      
      // En desktop, mantener sidebar abierto por defecto
      if (!mobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
      
      // En mÃ³vil, cerrar sidebar al cambiar a mÃ³vil
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen w-full overflow-hidden">
      {/* CSS Grid Layout */}
      <div className="h-full grid grid-cols-1 grid-rows-[auto_1fr] tablet:grid-cols-[256px_1fr] tablet:grid-rows-[auto_1fr] desktop:grid-cols-[256px_1fr_0] desktop:grid-rows-[auto_1fr] transition-all duration-300">
        
        {/* Header - Ocupa toda la fila */}
        <header className="col-span-full tablet:col-span-2 desktop:col-span-3 h-12 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0 px-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar}
              className="mr-2"
              title={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-lg font-semibold">{getClientDisplayName()}</div>
          </div>
          <div className="mr-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Sidebar - Solo visible en tablet+ */}
        <aside className={`
          hidden tablet:flex tablet:flex-col tablet:col-start-1 tablet:col-end-2 tablet:row-start-2 tablet:row-end-3
          desktop:col-start-1 desktop:col-end-2 desktop:row-start-2 desktop:row-end-3
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>
          <AppSidebar isOpen={true} onToggle={toggleSidebar} />
        </aside>

        {/* Main Content */}
        <main className="
          col-span-full row-start-2 row-end-3
          tablet:col-start-2 tablet:col-end-3 tablet:row-start-2 tablet:row-end-3
          desktop:col-start-2 desktop:col-end-3 desktop:row-start-2 desktop:row-end-3
          overflow-hidden flex flex-col
        ">
          {children}
        </main>

        {/* Mobile Sidebar Overlay */}
        {isMobile && (
          <AppSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        )}
      </div>
    </div>
  );
}
