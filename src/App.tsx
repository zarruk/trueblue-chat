import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useClient } from "@/hooks/useClient";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";
import Placeholder from "./pages/Placeholder";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Debug from "./pages/Debug";
import Metrics from "./pages/Metrics";
import Embudo from "./pages/Embudo";
import { BarChart3, Bug, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { checkAndAddChannelColumn } from "@/utils/databaseStructureCheck";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DynamicTitle } from "@/components/DynamicTitle";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getClientDisplayName } = useClient();
  
  useEffect(() => {
    // Verificar y agregar la columna channel si es necesario
    checkAndAddChannelColumn();
  }, []);

  return (
    <>
      <DynamicTitle />
      <div className="h-screen flex w-full overflow-hidden">
      <AppSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className={`flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <header className="h-12 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      </div>
    </>
  );
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange
  >
    <AuthProvider>
      <TooltipProvider>
        {/* Notificaciones deshabilitadas por requerimiento */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/agents" element={
              <ProtectedRoute>
                <AppLayout>
                  <Agents />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/metrics" element={
              <ProtectedRoute>
                <AppLayout>
                  <Metrics />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/embudo" element={
              <ProtectedRoute>
                <AppLayout>
                  <Embudo />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/debug" element={
              <ProtectedRoute>
                <AppLayout>
                  <Debug />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
