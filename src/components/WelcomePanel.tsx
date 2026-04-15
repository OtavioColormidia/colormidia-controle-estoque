import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Package,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  Users,
  ClipboardList,
  UserCog,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Product, StockMovement, UserRole } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';

interface WelcomePanelProps {
  onTabChange: (tab: string) => void;
  products: Product[];
  movements: StockMovement[];
}

const quickAccessCards = [
  { id: 'inventory', label: 'Controle de Estoque', description: 'Estoque atual e alertas', icon: Package, allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'truss-control', label: 'Controle de Treliça', description: 'Gerenciar treliças', icon: Package, allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'entries', label: 'Entrada de Material', description: 'Registrar entradas', icon: PackagePlus, allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'exits', label: 'Saída de Material', description: 'Registrar saídas', icon: PackageMinus, allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'purchases', label: 'Compras', description: 'Pedidos e anexos', icon: ShoppingCart, allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'products', label: 'Cadastro de Produtos', description: 'Gerenciar produtos', icon: ClipboardList, allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'suppliers', label: 'Cadastro de Fornecedores', description: 'Gerenciar fornecedores', icon: Users, allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'supplier-materials', label: 'Fornecedores / Material', description: 'Materiais por fornecedor', icon: Package, allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'users', label: 'Usuários', description: 'Gestão de acessos', icon: UserCog, allowedRoles: ['admin'] as UserRole[] },
];

export default function WelcomePanel({ onTabChange, products, movements }: WelcomePanelProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    const loadRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (data) {
        setUserRoles(data.map(r => r.role as UserRole));
      }
    };
    loadRoles();
  }, []);

  const filteredCards = quickAccessCards.filter(card =>
    card.allowedRoles.some(role => userRoles.includes(role))
  );

  const recentMovements = movements
    .slice()
    .sort((a, b) => {
      const ta = (a as any).createdAt ? new Date(a.createdAt as Date).getTime() : new Date(a.date).getTime();
      const tb = (b as any).createdAt ? new Date(b.createdAt as Date).getTime() : new Date(b.date).getTime();
      return tb - ta;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Painel de Controle
        </h2>
        <p className="text-muted-foreground mt-1">
          Acesse rapidamente as áreas do sistema
        </p>
      </div>

      {/* Quick Access Cards */}
      <Card className="p-6 border shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="flex items-center gap-3 p-4 rounded-xl border bg-background hover:bg-muted/50 hover:border-primary/30 cursor-pointer transition-all duration-200 group"
                onClick={() => onTabChange(card.id)}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight truncate">{card.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Activities */}
      <Card className="p-6 border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
        <div className="space-y-3">
          {recentMovements.map((movement) => {
            const productName = movement.productName ||
              products.find(p => p.id === movement.productId)?.name ||
              'Produto não identificado';

            return (
              <div
                key={movement.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    movement.type === 'entry'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {movement.type === 'entry' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {movement.type === 'entry' ? 'Entrada' : 'Saída'} • {' '}
                      {new Date(movement.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{movement.quantity} un.</p>
                  {movement.totalValue && (
                    <p className="text-sm text-muted-foreground">
                      R$ {movement.totalValue.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {movements.length === 0 && (
            <p className="text-muted-foreground">Nenhuma atividade recente.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
