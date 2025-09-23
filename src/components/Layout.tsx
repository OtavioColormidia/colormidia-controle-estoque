import { useState } from 'react';
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
} from 'lucide-react';
import logoColorMedia from '@/assets/logo-colormedia.jpg';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Controle de Estoque', icon: Package },
  { id: 'entries', label: 'Entrada de Material', icon: PackagePlus },
  { id: 'exits', label: 'Saída de Material', icon: PackageMinus },
  { id: 'purchases', label: 'Compras', icon: ShoppingCart },
  { id: 'products', label: 'Cadastro de Produtos', icon: ClipboardList },
  { id: 'suppliers', label: 'Cadastro de Fornecedores', icon: Users },
];

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 bg-gradient-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarOpen ? "w-64 translate-x-0" : "w-16 lg:translate-x-0 -translate-x-full lg:w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={logoColorMedia} alt="ColorMídia" className="h-7 sm:h-8 w-7 sm:w-8 object-contain" />
              {sidebarOpen && (
                <h1 className="text-base sm:text-lg font-bold text-sidebar-foreground">
                  Almoxarifado
                </h1>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 sm:h-10 sm:w-10"
            >
              {sidebarOpen ? <X className="h-4 sm:h-5 w-4 sm:w-5" /> : <Menu className="h-4 sm:h-5 w-4 sm:w-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                        activeTab === item.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                          : "hover:bg-sidebar-accent text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <span className="text-sm font-medium">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent",
                !sidebarOpen && "justify-center"
              )}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Sair</span>}
            </Button>
            {sidebarOpen && (
              <p className="text-xs text-sidebar-foreground/70 text-center mt-4">
                Sistema de Controle v1.0
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Controle de Estoque</h1>
        </div>
        <div className="h-full p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}