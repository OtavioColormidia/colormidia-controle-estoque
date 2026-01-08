import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  Users,
  ClipboardList,
  Menu,
  X,
  LogOut,
  UserCog,
  AlertTriangle,
} from 'lucide-react';
import logoColorMedia from '@/assets/logo-colormedia.jpg';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  allowedRoles: UserRole[];
  group?: string;
}

const allMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedRoles: ['admin', 'compras', 'almoxarife', 'visualizador'], group: 'principal' },
  { id: 'inventory', label: 'Controle de Estoque', icon: Package, allowedRoles: ['admin', 'compras', 'almoxarife'], group: 'estoque' },
  { id: 'truss-control', label: 'Controle de Treliça', icon: Package, allowedRoles: ['admin', 'almoxarife'], group: 'estoque' },
  { id: 'entries', label: 'Entrada de Material', icon: PackagePlus, allowedRoles: ['admin', 'almoxarife'], group: 'movimentacao' },
  { id: 'exits', label: 'Saída de Material', icon: PackageMinus, allowedRoles: ['admin', 'almoxarife'], group: 'movimentacao' },
  { id: 'purchases', label: 'Compras', icon: ShoppingCart, allowedRoles: ['admin', 'compras', 'almoxarife'], group: 'compras' },
  { id: 'products', label: 'Cadastro de Produtos', icon: ClipboardList, allowedRoles: ['admin', 'almoxarife'], group: 'cadastros' },
  { id: 'suppliers', label: 'Cadastro de Fornecedores', icon: Users, allowedRoles: ['admin', 'compras', 'almoxarife'], group: 'cadastros' },
  { id: 'supplier-materials', label: 'Fornecedores / Material', icon: Package, allowedRoles: ['admin', 'compras', 'almoxarife'], group: 'cadastros' },
  { id: 'users', label: 'Usuários', icon: UserCog, allowedRoles: ['admin'], group: 'admin' },
];

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [displayName, setDisplayName] = useState<string>('');
  const [alertStockCount, setAlertStockCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      if (profile?.display_name) {
        setDisplayName(profile.display_name);
      }

      // Load roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roles) {
        setUserRoles(roles.map(r => r.role as UserRole));
      }

      // Load alert stock count (atenção + crítico)
      const { data: products } = await supabase
        .from('products')
        .select('current_stock, min_stock');
      
      if (products) {
        // Atenção: estoque <= min_stock * 1.5, Crítico: estoque <= min_stock
        const alertStock = products.filter(p => p.current_stock <= p.min_stock * 1.5).length;
        setAlertStockCount(alertStock);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const hasAccess = (allowedRoles: UserRole[]) => {
    return userRoles.some(role => allowedRoles.includes(role));
  };

  const menuItems = allMenuItems.filter(item => hasAccess(item.allowedRoles));

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 bg-gradient-sidebar text-sidebar-foreground transition-all duration-300 ease-out",
          sidebarOpen ? "w-64 translate-x-0" : "w-16 lg:translate-x-0 -translate-x-full lg:w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-3 border-b border-sidebar-border">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="h-9 w-9 rounded-lg overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-sidebar-primary/20">
                <img src={logoColorMedia} alt="ColorMídia" className="h-full w-full object-cover" />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0 overflow-hidden animate-fade-in">
                  <h1 className="text-sm font-semibold text-sidebar-foreground truncate">
                    ColorMídia
                  </h1>
                  <p className="text-[10px] text-sidebar-foreground/60 truncate">
                    Controle de Estoque
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 flex-shrink-0"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>

          {/* User Profile Section */}
          <div className={cn(
            "border-b border-sidebar-border transition-all",
            sidebarOpen ? "px-3 py-3" : "px-2 py-3"
          )}>
            <div className={cn(
              "flex items-center",
              sidebarOpen ? "gap-3" : "justify-center"
            )}>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm shadow-md flex-shrink-0">
                {getInitials(displayName || 'U')}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                    {displayName || 'Usuário'}
                  </p>
                  <p className="text-[11px] text-sidebar-foreground/50 capitalize">
                    {userRoles[0] || 'Carregando...'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const showSeparator = index > 0 && menuItems[index - 1]?.group !== item.group;
                const showBadge = item.id === 'inventory' && alertStockCount > 0;
                
                return (
                  <li key={item.id}>
                    {showSeparator && sidebarOpen && (
                      <Separator className="my-3 bg-sidebar-border" />
                    )}
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                        activeTab === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                          : "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-md transition-all",
                        activeTab === item.id 
                          ? "bg-sidebar-primary-foreground/15" 
                          : "bg-transparent group-hover:bg-sidebar-accent"
                      )}>
                        <Icon className="h-4 w-4 flex-shrink-0" />
                      </div>
                      {sidebarOpen && (
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      )}
                      {showBadge && sidebarOpen && (
                        <Badge 
                          variant="warning" 
                          className="ml-auto h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5 animate-pulse-subtle"
                        >
                          {alertStockCount}
                        </Badge>
                      )}
                      {showBadge && !sidebarOpen && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warning animate-pulse" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-all",
                !sidebarOpen && "justify-center"
              )}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md overflow-hidden">
              <img src={logoColorMedia} alt="ColorMídia" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-lg font-semibold">ColorMídia</h1>
          </div>
        </div>
        <div className="h-full p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
