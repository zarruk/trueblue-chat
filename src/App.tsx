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
  
  // Bypass authentication for E2E tests
  if (import.meta.env.VITE_E2E === '1') {
    return <>{children}</>;
  }
  
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
                <ErrorBoundary>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/agents" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout>
                    <Agents />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/metrics" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout>
                    <Metrics />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/embudo" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout>
                    <Embudo />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/debug" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AppLayout>
                    <Debug />
                  </AppLayout>
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/auth" element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            } />
            {/* E2E Testing Route - Only available when VITE_E2E=1 */}
            {import.meta.env.VITE_E2E === '1' && (
              <Route path="/__e2e__/responsive" element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ErrorBoundary>
                </ProtectedRoute>
              } />
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
