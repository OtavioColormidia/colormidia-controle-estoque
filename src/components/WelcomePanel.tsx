import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  Users,
  ClipboardList,
  UserCog,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Paperclip,
  X,
} from 'lucide-react';
import { Product, StockMovement, Purchase, UserRole } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface WelcomePanelProps {
  onTabChange: (tab: string) => void;
  products: Product[];
  movements: StockMovement[];
  purchases: Purchase[];
}

const quickAccessCards = [
  { id: 'inventory', label: 'Controle de Estoque', description: 'Estoque atual e alertas', icon: Package, gradient: 'from-cyan-500 to-teal-500', allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'truss-control', label: 'Controle de Treliça', description: 'Gerenciar treliças', icon: Package, gradient: 'from-blue-500 to-indigo-500', allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'entries', label: 'Entrada de Material', description: 'Registrar entradas', icon: PackagePlus, gradient: 'from-emerald-500 to-green-500', allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'exits', label: 'Saída de Material', description: 'Registrar saídas', icon: PackageMinus, gradient: 'from-orange-500 to-amber-500', allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'purchases', label: 'Compras', description: 'Pedidos e anexos', icon: ShoppingCart, gradient: 'from-purple-500 to-violet-500', allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'products', label: 'Cadastro de Produtos', description: 'Gerenciar produtos', icon: ClipboardList, gradient: 'from-pink-500 to-rose-500', allowedRoles: ['admin', 'almoxarife'] as UserRole[] },
  { id: 'suppliers', label: 'Cadastro de Fornecedores', description: 'Gerenciar fornecedores', icon: Users, gradient: 'from-sky-500 to-blue-500', allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'supplier-materials', label: 'Fornecedores / Material', description: 'Materiais por fornecedor', icon: Package, gradient: 'from-teal-500 to-cyan-500', allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'dashboard', label: 'Dashboard', description: 'Métricas e gráficos', icon: BarChart3, gradient: 'from-indigo-500 to-purple-500', allowedRoles: ['admin', 'compras', 'almoxarife'] as UserRole[] },
  { id: 'users', label: 'Usuários', description: 'Gestão de acessos', icon: UserCog, gradient: 'from-slate-500 to-gray-600', allowedRoles: ['admin'] as UserRole[] },
];

interface RecentActivity {
  id: string;
  type: 'entry' | 'exit' | 'purchase';
  description: string;
  detail: string;
  date: Date;
  value?: number;
  purchaseId?: string;
}

export default function WelcomePanel({ onTabChange, products, movements, purchases }: WelcomePanelProps) {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [purchaseAttachments, setPurchaseAttachments] = useState<Record<string, string[]>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');

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

  // Load attachments for purchases
  useEffect(() => {
    const loadAttachments = async (purchaseId: string) => {
      try {
        const { data, error } = await supabase.storage.from("purchase-attachments").list(purchaseId);
        if (error) throw error;
        if (data) {
          setPurchaseAttachments((prev) => ({
            ...prev,
            [purchaseId]: data.map((f) => f.name),
          }));
        }
      } catch (error) {
        console.error("Erro ao carregar anexos:", error);
      }
    };
    purchases.forEach((p) => loadAttachments(p.id));
  }, [purchases.length]);

  const handlePreviewAttachment = async (purchaseId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("purchase-attachments")
        .createSignedUrl(`${purchaseId}/${fileName}`, 3600);
      if (error) throw error;
      setPreviewUrl(data.signedUrl);
      setPreviewFileName(fileName);
    } catch (error: any) {
      toast({ title: "Erro ao visualizar", description: error.message, variant: "destructive" });
    }
  };

  const filteredCards = quickAccessCards.filter(card =>
    card.allowedRoles.some(role => userRoles.includes(role))
  );

  // Merge movements + purchases into recent activities
  const recentActivities: RecentActivity[] = [
    ...movements.map(m => ({
      id: m.id,
      type: m.type as 'entry' | 'exit',
      description: m.productName || products.find(p => p.id === m.productId)?.name || 'Produto',
      detail: `${m.type === 'entry' ? 'Entrada' : 'Saída'} • ${m.quantity} un.`,
      date: new Date(m.createdAt || m.date),
      value: m.totalValue,
    })),
    ...purchases.map(p => ({
      id: p.id,
      type: 'purchase' as const,
      description: p.supplierName || 'Fornecedor não informado',
      detail: `Pedido de compra • ${p.items?.length || 0} itens`,
      date: new Date(p.date),
      value: p.totalValue,
      purchaseId: p.id,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Atalhos Rápidos
        </h2>
        <p className="text-muted-foreground mt-1">
          Acesse rapidamente as áreas do sistema
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`relative rounded-2xl bg-gradient-to-br ${card.gradient} p-6 text-white cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group min-h-[160px] flex flex-col justify-between`}
              onClick={() => onTabChange(card.id)}
            >
              <div>
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold leading-tight">{card.label}</h3>
                <p className="text-sm text-white/80 mt-1">{card.description}</p>
              </div>
              <Button
                variant="secondary"
                className="mt-4 w-full bg-black/25 hover:bg-black/40 text-white border-0 font-semibold"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabChange(card.id);
                }}
              >
                Acessar
              </Button>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <Card className="p-6 border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
        <div className="space-y-3">
          {recentActivities.map((activity) => {
            const attachments = activity.purchaseId ? (purchaseAttachments[activity.purchaseId] || []) : [];
            return (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    activity.type === 'entry'
                      ? 'bg-success/10 text-success'
                      : activity.type === 'exit'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {activity.type === 'entry' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : activity.type === 'exit' ? (
                      <TrendingDown className="h-5 w-5" />
                    ) : (
                      <ShoppingCart className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.detail} • {activity.date.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {attachments.length > 0 && (
                    <div className="flex gap-1">
                      {attachments.map((fileName) => (
                        <Button
                          key={fileName}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-primary hover:text-primary/80"
                          title={fileName}
                          onClick={() => handlePreviewAttachment(activity.purchaseId!, fileName)}
                        >
                          <Paperclip className="h-4 w-4 mr-1" />
                          <span className="text-xs max-w-[80px] truncate">{fileName}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                  {activity.value != null && activity.value > 0 && (
                    <p className="font-semibold text-foreground whitespace-nowrap">
                      R$ {activity.value.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {recentActivities.length === 0 && (
            <p className="text-muted-foreground">Nenhuma atividade recente.</p>
          )}
        </div>
      </Card>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => { setPreviewUrl(null); setPreviewFileName(''); }}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border"
                title="Visualização do anexo"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
