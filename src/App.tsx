import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useClient } from "@/hooks/useClient";
import { AppSidebar } from "@/components/AppSidebar";
import { ResponsiveLayout } from "@/components/ResponsiveLayout";
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
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Verificar y agregar la columna channel si es necesario
    checkAndAddChannelColumn();
  }, []);

  return (
    <>
      <DynamicTitle />
      <ResponsiveLayout>
        {children}
      </ResponsiveLayout>
    </>
  );
}

<<<<<<< HEAD
const App = () => {
  // Logs para diagnÃ³stico mÃ³vil
  console.log('ðŸ” MOBILE DEBUG - App component started');
  console.log('ðŸ” MOBILE DEBUG - Window dimensions:', window.innerWidth, 'x', window.innerHeight);
  console.log('ðŸ” MOBILE DEBUG - Is touch device:', 'ontouchstart' in window);
  
  return (
=======
const App = () => (
  <ErrorBoundary>
>>>>>>> main
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
<<<<<<< HEAD
    <AuthProvider>
      <TooltipProvider>
        {/* Notificaciones deshabilitadas por requerimiento */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
=======
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
>>>>>>> main
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
<<<<<<< HEAD
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  );
};
=======
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
>>>>>>> main

export default App;
