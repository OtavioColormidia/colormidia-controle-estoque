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
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-gradient-sidebar text-sidebar-foreground transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Box className="h-8 w-8 text-sidebar-primary" />
              {sidebarOpen && (
                <h1 className="text-lg font-bold text-sidebar-foreground">
                  Almoxarifado
                </h1>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
            {sidebarOpen && (
              <p className="text-xs text-sidebar-foreground/70 text-center">
                Sistema de Controle v1.0
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-6">{children}</div>
      </main>
    </div>
  );
}