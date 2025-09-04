
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAgents } from "@/hooks/useAgents";
import { useAuth } from "@/hooks/useAuth";
import { Profile } from "@/types/database";
import { Plus, Mail, User, Edit, UserCheck, UserX, RefreshCw, Trash2 } from "lucide-react";

export default function AgentManagement() {
  const { agents, loading, createAgent, updateAgent, deleteAgent, toggleAgentStatus, resendInvitation } = useAgents();
  const { profile } = useAuth();

  // Debug logs
  console.log('🔍 AgentManagement: Component rendered');
  console.log('🔍 AgentManagement: Loading state:', loading);
  console.log('🔍 AgentManagement: Agents array:', agents);
  console.log('🔍 AgentManagement: Agents length:', agents?.length);
  console.log('🔍 AgentManagement: Profile:', profile);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Profile | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'agent'>('agent');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'agent'>('agent');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-muted-foreground">Solo los administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const handleInviteAgent = async () => {
    if (!inviteEmail || !inviteName) return;
    
    await createAgent(inviteEmail, inviteName, inviteRole);
    setInviteEmail('');
    setInviteName('');
    setInviteRole('agent');
    setIsInviteOpen(false);
  };

  const handleEditAgent = (agent: Profile) => {
    setSelectedAgent(agent);
    setEditName(agent.name);
    setEditRole(agent.role as 'admin' | 'agent');
    setIsEditOpen(true);
  };

  const handleUpdateAgent = async () => {
    if (!selectedAgent) return;
    
    await updateAgent(selectedAgent.id, {
      name: editName,
      role: editRole
    });
    
    setIsEditOpen(false);
    setSelectedAgent(null);
  };

  const handleToggleStatus = async (agent: Profile) => {
    await toggleAgentStatus(agent);
  };

  const handleResendInvitation = async (agent: Profile) => {
    await resendInvitation(agent);
  };

  const handleDeleteAgent = async (agent: Profile) => {
    await deleteAgent(agent.id);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestión de Agentes</h1>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Invitar Agente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Nuevo Agente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-name">Nombre</Label>
                <Input
                  id="invite-name"
                  type="text"
                  placeholder="Nombre del agente"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="agente@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Rol</Label>
                <Select value={inviteRole} onValueChange={(value: 'admin' | 'agent') => setInviteRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInviteAgent} className="flex-1">
                  Enviar Invitación
                </Button>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{agent.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {agent.email}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={agent.role === 'admin' ? 'default' : 'secondary'}>
                    {agent.role === 'admin' ? 'Administrador' : 'Agente'}
                  </Badge>
                  
                  <Badge variant="default">
                    Activo
                  </Badge>
                  
                  {agent.id === profile?.id && (
                    <Badge variant="outline">Tú</Badge>
                  )}
                  
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAgent(agent)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    {agent.id !== profile?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(agent)}
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {agent.id !== profile?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará permanentemente al agente "{agent.name}" de la plataforma. 
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteAgent(agent)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editRole} onValueChange={(value: 'admin' | 'agent') => setEditRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateAgent} className="flex-1">
                Guardar Cambios
              </Button>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
