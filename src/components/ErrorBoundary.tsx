import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualiza el state para mostrar la UI de error
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error para debugging
    console.error('🚨 ErrorBoundary capturó un error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Log específico para errores de DOM
    if (error.message.includes('removeChild') || error.message.includes('NotFoundError')) {
      console.error('🚨 Error de DOM detectado - posible condición de carrera:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  handleRetry = () => {
    // Limpiar el estado de error y reintentar
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    
    // Recargar la página como último recurso para errores críticos
    if (this.state.error?.message.includes('removeChild')) {
      console.log('🔄 Recargando página debido a error crítico de DOM')
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // UI de error personalizada
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                ¡Ups! Algo salió mal
              </h1>
              <p className="text-muted-foreground">
                Se produjo un error inesperado. Esto puede deberse a un problema temporal.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="text-left bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Detalles del error:</h3>
                <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
                className="w-full"
              >
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook para usar el ErrorBoundary en componentes funcionales
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('🚨 Error capturado por useErrorHandler:', error, errorInfo)
    
    // Para errores críticos de DOM, recargar la página
    if (error.message.includes('removeChild') || error.message.includes('NotFoundError')) {
      console.log('🔄 Error crítico de DOM detectado, recargando página...')
      setTimeout(() => window.location.reload(), 1000)
    }
  }
}
