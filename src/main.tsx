import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import App from './App.tsx'
import './index.css'

// Logs para diagnóstico móvil
console.log('🔍 MOBILE DEBUG - main.tsx started');
console.log('🔍 MOBILE DEBUG - React version:', React.version);
console.log('🔍 MOBILE DEBUG - Document ready state:', document.readyState);
console.log('🔍 MOBILE DEBUG - Root element found:', !!document.getElementById('root'));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
