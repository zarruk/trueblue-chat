import { useState } from "react";
import { User, MessageSquare, Palette, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";

export default function Settings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useMessageTemplates();
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: profile?.name || "",
    email: profile?.email || "",
  });

  // Auto messages state
  const [newMessage, setNewMessage] = useState({ title: "", message: "" });
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ title: "", message: "" });

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          email: profileData.email,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Tus datos se han actualizado correctamente.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
        variant: "destructive",
      });
    }
  };

  const handleAddAutoMessage = () => {
    if (!newMessage.title || !newMessage.message) return;
    
    const success = createTemplate(newMessage.title, newMessage.message);
    if (success) {
      setNewMessage({ title: "", message: "" });
    }
  };

  const handleEditMessage = (messageId: string) => {
    const template = templates.find(t => t.id === messageId);
    if (template) {
      setEditingData({ title: template.name, message: template.message });
      setEditingMessage(messageId);
    }
  };

  const handleSaveEdit = () => {
    if (editingMessage) {
      updateTemplate(editingMessage, editingData);
      setEditingMessage(null);
      setEditingData({ title: "", message: "" });
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditingData({ title: "", message: "" });
  };

  const handleDeleteMessage = (id: string) => {
    deleteTemplate(id);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu experiencia en Chatbot Trueblue</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensajes Automáticos
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Tema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Información del Perfil</CardTitle>
              <CardDescription>
                Actualiza tu información personal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="Tu nombre completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>

              <Button onClick={handleUpdateProfile} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agregar Nueva Plantilla</CardTitle>
                <CardDescription>
                  Crea plantillas de respuestas rápidas para usar en conversaciones.
                  <br />
                  <strong>Variables disponibles:</strong> {"{name}"} - se reemplaza por tu nombre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message-title">Título de la plantilla</Label>
                  <Input
                    id="message-title"
                    value={newMessage.title}
                    onChange={(e) => setNewMessage({ ...newMessage, title: e.target.value })}
                    placeholder="Ej: Saludo inicial"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message-content">Mensaje</Label>
                  <Textarea
                    id="message-content"
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                    placeholder="Escribe el mensaje de la plantilla..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleAddAutoMessage} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Agregar Plantilla
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plantillas Existentes</CardTitle>
                <CardDescription>
                  Gestiona tus plantillas de mensajes automáticos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {templates.map((message) => (
                    <div key={message.id} className="border rounded-lg p-4 space-y-3">
                      {editingMessage === message.id ? (
                        <div className="space-y-3">
                          <Input
                            value={editingData.title}
                            onChange={(e) => setEditingData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Título de la plantilla"
                          />
                          <Textarea
                            value={editingData.message}
                            onChange={(e) => setEditingData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Mensaje de la plantilla"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}>
                              Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{message.name}</h4>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditMessage(message.id)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteMessage(message.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{message.message}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="theme">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Tema</CardTitle>
              <CardDescription>
                Personaliza la apariencia de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Tema de la aplicación</Label>
                  <p className="text-sm text-muted-foreground">
                    Cambia entre modo claro, oscuro o automático
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}