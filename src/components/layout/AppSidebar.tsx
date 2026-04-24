import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  LayoutGrid,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  FileText,
  Tag,
  Building2,
  Truck,
  UserCog,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import logoColorMedia from '@/assets/logo-colormedia.jpg';
import type { UserRole } from '@/types/inventory';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  /** Tailwind classes that paint the icon container in the sidebar */
  iconClass: string;
}

interface NavSection {
  label: string;
  /** Accent color used in the section label dot */
  accent: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'Principal',
    accent: 'hsl(217 91% 60%)',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'compras', 'almoxarife', 'visualizador'], iconClass: 'bg-blue-500/15 text-blue-300 group-hover:bg-blue-500/25 group-hover:text-blue-200' },
    ],
  },
  {
    label: 'Estoque',
    accent: 'hsl(152 69% 45%)',
    items: [
      { title: 'Controle de Estoque', url: '/estoque', icon: Boxes, roles: ['admin', 'compras', 'almoxarife'], iconClass: 'bg-emerald-500/15 text-emerald-300 group-hover:bg-emerald-500/25 group-hover:text-emerald-200' },
      { title: 'Controle de Treliça', url: '/trelica', icon: LayoutGrid, roles: ['admin', 'almoxarife'], iconClass: 'bg-cyan-500/15 text-cyan-300 group-hover:bg-cyan-500/25 group-hover:text-cyan-200' },
    ],
  },
  {
    label: 'Movimentações',
    accent: 'hsl(24 95% 55%)',
    items: [
      { title: 'Entrada de Material', url: '/entradas', icon: PackagePlus, roles: ['admin', 'almoxarife'], iconClass: 'bg-green-500/15 text-green-300 group-hover:bg-green-500/25 group-hover:text-green-200' },
      { title: 'Saída de Material', url: '/saidas', icon: PackageMinus, roles: ['admin', 'almoxarife'], iconClass: 'bg-orange-500/15 text-orange-300 group-hover:bg-orange-500/25 group-hover:text-orange-200' },
    ],
  },
  {
    label: 'Compras',
    accent: 'hsl(280 80% 65%)',
    items: [
      { title: 'Compras', url: '/compras', icon: ShoppingCart, roles: ['admin', 'compras', 'almoxarife'], iconClass: 'bg-purple-500/15 text-purple-300 group-hover:bg-purple-500/25 group-hover:text-purple-200' },
      { title: 'Requisição de Materiais', url: '/requisicoes', icon: FileText, roles: ['admin', 'compras', 'almoxarife'], iconClass: 'bg-pink-500/15 text-pink-300 group-hover:bg-pink-500/25 group-hover:text-pink-200' },
    ],
  },
  {
    label: 'Cadastros',
    accent: 'hsl(190 90% 55%)',
    items: [
      { title: 'Produtos', url: '/produtos', icon: Tag, roles: ['admin', 'almoxarife'], iconClass: 'bg-sky-500/15 text-sky-300 group-hover:bg-sky-500/25 group-hover:text-sky-200' },
      { title: 'Fornecedores', url: '/fornecedores', icon: Building2, roles: ['admin', 'compras', 'almoxarife'], iconClass: 'bg-teal-500/15 text-teal-300 group-hover:bg-teal-500/25 group-hover:text-teal-200' },
      { title: 'Fornecedores / Material', url: '/fornecedores-materiais', icon: Truck, roles: ['admin', 'compras', 'almoxarife'], iconClass: 'bg-indigo-500/15 text-indigo-300 group-hover:bg-indigo-500/25 group-hover:text-indigo-200' },
    ],
  },
  {
    label: 'Administração',
    accent: 'hsl(0 72% 58%)',
    items: [
      { title: 'Usuários', url: '/usuarios', icon: UserCog, roles: ['admin'], iconClass: 'bg-rose-500/15 text-rose-300 group-hover:bg-rose-500/25 group-hover:text-rose-200' },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [alertStockCount, setAlertStockCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('ordered', false);
      if (!cancelled) setPendingRequestsCount(count ?? 0);
    };

    const fetchAlertStock = async () => {
      const { data } = await supabase.from('products').select('current_stock, min_stock');
      if (!cancelled && data) {
        setAlertStockCount(data.filter((p) => p.current_stock <= p.min_stock * 1.5).length);
      }
    };

    const loadRoles = async (userId: string) => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
      if (!cancelled && data) setUserRoles(data.map((r) => r.role as UserRole));
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await Promise.all([loadRoles(session.user.id), fetchAlertStock(), fetchPendingCount()]);
        if (!channel) {
          channel = supabase
            .channel('sidebar-counts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'form_responses' }, fetchPendingCount)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchAlertStock)
            .subscribe();
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) init();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const hasAccess = (roles: UserRole[]) => userRoles.some((r) => roles.includes(r));
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-sidebar-primary/30 shadow-md">
            <img src={logoColorMedia} alt="ColorMídia" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-sidebar-foreground truncate">ColorMídia</h1>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Controle de Estoque</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => {
          const visible = section.items.filter((i) => hasAccess(i.roles));
          if (!visible.length) return null;
          return (
            <SidebarGroup key={section.label}>
              {!collapsed && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.url);
                    const showStockBadge = item.url === '/estoque' && alertStockCount > 0;
                    const showPendingBadge = item.url === '/requisicoes' && pendingRequestsCount > 0;
                    const showBadge = showStockBadge || showPendingBadge;
                    const badgeValue = showPendingBadge ? pendingRequestsCount : alertStockCount;

                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <NavLink to={item.url} className="relative">
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.title}</span>
                            {showBadge && !collapsed && (
                              <Badge
                                variant="warning"
                                className="ml-auto h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5 animate-pulse-subtle"
                              >
                                {badgeValue}
                              </Badge>
                            )}
                            {showBadge && collapsed && (
                              <span className={cn('absolute top-1 right-1 h-2 w-2 rounded-full bg-warning animate-pulse')} />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
