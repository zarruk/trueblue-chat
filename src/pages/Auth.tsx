import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MessageSquare, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithMagicLink, user } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // No need for invitation token handling anymore - simplified flow

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const { error, message } = await signInWithMagicLink(email);
    
    if (error) {
      setError(error.message || 'Error al enviar el enlace mágico');
    } else if (message) {
      setSuccess(message);
      setEmail(''); // Clear email after successful send
    }
    
    setLoading(false);
  };




  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Chat Management</CardTitle>
          <CardDescription>
            Accede al sistema de gestión de conversaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acceso por Invitación</AlertTitle>
            <AlertDescription>
              Solo los usuarios invitados por un administrador pueden acceder al sistema. Ingresa tu email para recibir un enlace de acceso seguro.
            </AlertDescription>
          </Alert>
          <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu-email@ejemplo.com"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando enlace...' : 'Enviar Enlace Mágico'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}