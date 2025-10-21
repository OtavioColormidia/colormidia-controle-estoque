import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCog, CheckCircle, XCircle } from 'lucide-react';
import type { UserRole } from '@/types/inventory';

interface UserData {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  isAuthorized: boolean;
  roles: UserRole[];
  createdAt: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('almoxarife');

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Load all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine data
      const usersData: UserData[] = profiles.map((profile) => ({
        id: profile.id,
        userId: profile.user_id,
        email: profile.email || '',
        displayName: profile.display_name,
        isAuthorized: profile.is_authorized || false,
        roles: roles
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role as UserRole),
        createdAt: profile.created_at,
      }));

      setUsers(usersData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleAuthorization = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_authorized: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Autorização atualizada',
        description: `Usuário ${!currentStatus ? 'autorizado' : 'desautorizado'} com sucesso.`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar autorização',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName || '');
    setEditRole(user.roles[0] || 'almoxarife');
  };

  const saveUserChanges = async () => {
    if (!editingUser) return;

    try {
      // Update display name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: editDisplayName })
        .eq('user_id', editingUser.userId);

      if (profileError) throw profileError;

      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editingUser.userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: editingUser.userId, role: editRole });

      if (roleError) throw roleError;

      toast({
        title: 'Usuário atualizado',
        description: 'As informações do usuário foram atualizadas com sucesso.',
      });

      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const variants: Record<UserRole, string> = {
      admin: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      compras: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      almoxarife: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
    };

    const labels: Record<UserRole, string> = {
      admin: 'Admin',
      compras: 'Compras',
      almoxarife: 'Almoxarife',
    };

    return (
      <Badge className={variants[role]}>
        {labels[role]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciamento de Usuários</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome/Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.displayName || 'Sem nome'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.roles.length > 0 ? (
                      <div className="flex gap-1">
                        {user.roles.map((role) => (
                          <span key={role}>{getRoleBadge(role)}</span>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="outline">Sem cargo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.isAuthorized ? (
                      <Badge className="bg-green-500/10 text-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Autorizado
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-500/10 text-yellow-500">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAuthorization(user.userId, user.isAuthorized)}
                    >
                      {user.isAuthorized ? 'Revogar' : 'Autorizar'}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Usuário</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nome/Usuário</Label>
                            <Input
                              value={editDisplayName}
                              onChange={(e) => setEditDisplayName(e.target.value)}
                              placeholder="Nome do usuário"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email (não editável)</Label>
                            <Input value={editingUser?.email} disabled />
                          </div>
                          <div className="space-y-2">
                            <Label>Cargo</Label>
                            <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="compras">Compras</SelectItem>
                                <SelectItem value="almoxarife">Almoxarife</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={saveUserChanges} className="w-full">
                            Salvar Alterações
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
