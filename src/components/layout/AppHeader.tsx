import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun, User as UserIcon } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types/inventory';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  estoque: 'Controle de Estoque',
  trelica: 'Controle de Treliça',
  entradas: 'Entrada de Material',
  saidas: 'Saída de Material',
  compras: 'Compras',
  requisicoes: 'Requisição de Materiais',
  produtos: 'Produtos',
  fornecedores: 'Fornecedores',
  'fornecedores-materiais': 'Fornecedores / Material',
  usuarios: 'Usuários',
};

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [primaryRole, setPrimaryRole] = useState<UserRole | ''>('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', session.user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', session.user.id),
      ]);
      if (cancelled) return;
      if (profile?.display_name) setDisplayName(profile.display_name);
      if (roles?.length) setPrimaryRole(roles[0].role as UserRole);
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) load();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (err: any) {
      toast({ title: 'Erro ao sair', description: err.message, variant: 'destructive' });
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const segments = location.pathname.split('/').filter(Boolean);
  const currentLabel = segments.length ? routeLabels[segments[segments.length - 1]] ?? '' : 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-lg px-4 lg:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Início</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {currentLabel && currentLabel !== 'Dashboard' && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="sm:hidden text-sm font-semibold truncate">{currentLabel}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema" className="h-9 w-9">
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 px-2 gap-2" aria-label="Menu do usuário">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[10px] font-semibold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-xs font-medium truncate max-w-[140px]">{displayName || 'Usuário'}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{primaryRole || ''}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm">{displayName || 'Usuário'}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{primaryRole}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
