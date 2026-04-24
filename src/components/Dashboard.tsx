import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  Boxes,
  DollarSign,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Product, StockMovement, Purchase } from '@/types/inventory';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';

interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
  purchases: Purchase[];
  onTabChange: (tab: string) => void;
}

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function Dashboard({ products, movements, purchases, onTabChange }: DashboardProps) {
  const [pendingRequests, setPendingRequests] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from('form_responses')
        .select('*', { count: 'exact', head: true })
        .eq('ordered', false);
      if (!cancelled) setPendingRequests(count ?? 0);
    };
    load();
    const channel = supabase
      .channel('dashboard-form-responses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_responses' }, load)
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // ===== KPIs =====
  const totalProducts = products.length;
  const criticalStock = products.filter((p) => p.currentStock <= p.minStock).length;
  const warningStock = products.filter(
    (p) => p.currentStock > p.minStock && p.currentStock <= p.minStock * 1.5,
  ).length;
  const stockValue = useMemo(() => {
    // estimate via average unit cost from latest entry
    const avg: Record<string, number> = {};
    movements
      .filter((m) => m.type === 'entry' && m.unitPrice)
      .forEach((m) => {
        if (!avg[m.productId]) avg[m.productId] = m.unitPrice ?? 0;
      });
    return products.reduce((sum, p) => sum + p.currentStock * (avg[p.id] ?? 0), 0);
  }, [products, movements]);

  const pendingPurchases = purchases.filter((p) => p.status === 'pending').length;

  // ===== 14-day movement chart =====
  const chartData = useMemo(() => {
    const days = 14;
    const buckets: { date: string; entradas: number; saidas: number; raw: Date }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.push({ date: fmtDate(d), entradas: 0, saidas: 0, raw: d });
    }
    movements.forEach((m) => {
      const md = new Date(m.createdAt || m.date);
      md.setHours(0, 0, 0, 0);
      const idx = buckets.findIndex((b) => b.raw.getTime() === md.getTime());
      if (idx === -1) return;
      if (m.type === 'entry') buckets[idx].entradas += m.quantity;
      else buckets[idx].saidas += m.quantity;
    });
    return buckets;
  }, [movements]);

  // ===== Category distribution =====
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const k = p.category || 'Sem categoria';
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products]);

  const PIE_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(217 91% 70%)',
    'hsl(var(--muted-foreground))',
  ];

  // ===== Critical products list =====
  const criticalList = useMemo(
    () =>
      products
        .filter((p) => p.currentStock <= p.minStock * 1.5)
        .sort((a, b) => a.currentStock / Math.max(a.minStock, 1) - b.currentStock / Math.max(b.minStock, 1))
        .slice(0, 6),
    [products],
  );

  // ===== Recent activities =====
  const recentActivities = useMemo(
    () =>
      [
        ...movements.map((m) => ({
          id: `m-${m.id}`,
          type: m.type as 'entry' | 'exit',
          title: m.productName || products.find((p) => p.id === m.productId)?.name || 'Produto',
          subtitle: `${m.type === 'entry' ? 'Entrada' : 'Saída'} • ${m.quantity} un.${m.requestedBy ? ` • ${m.requestedBy}` : ''}`,
          date: new Date(m.createdAt || m.date),
          value: m.totalValue,
        })),
        ...purchases.map((p) => ({
          id: `p-${p.id}`,
          type: 'purchase' as const,
          title: p.supplierName || 'Fornecedor não informado',
          subtitle: `Pedido • ${p.items?.length || 0} itens${p.createdByName ? ` • ${p.createdByName}` : ''}`,
          date: new Date(p.date),
          value: p.totalValue,
        })),
      ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 7),
    [movements, purchases, products],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Visão Geral</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Indicadores em tempo real do estoque, compras e movimentações
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => onTabChange('entries')}>
            <PackagePlus className="h-4 w-4 mr-2" /> Nova Entrada
          </Button>
          <Button variant="outline" size="sm" onClick={() => onTabChange('exits')}>
            <PackageMinus className="h-4 w-4 mr-2" /> Nova Saída
          </Button>
          <Button size="sm" onClick={() => onTabChange('purchases')}>
            <ShoppingCart className="h-4 w-4 mr-2" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Produtos cadastrados"
          value={totalProducts}
          hint={`${products.reduce((s, p) => s + p.currentStock, 0).toLocaleString('pt-BR')} unidades em estoque`}
          icon={Boxes}
          tone="primary"
          onClick={() => onTabChange('inventory')}
        />
        <StatCard
          label="Estoque crítico"
          value={criticalStock}
          hint={`${warningStock} em alerta`}
          icon={AlertTriangle}
          tone={criticalStock > 0 ? 'danger' : 'success'}
          onClick={() => onTabChange('inventory')}
        />
        <StatCard
          label="Valor estimado"
          value={BRL(stockValue)}
          hint="Baseado no último custo de entrada"
          icon={DollarSign}
          tone="success"
        />
        <StatCard
          label="Pendências"
          value={pendingPurchases + pendingRequests}
          hint={`${pendingPurchases} compras • ${pendingRequests} requisições`}
          icon={ClipboardList}
          tone="warning"
          onClick={() => onTabChange(pendingRequests > 0 ? 'form-responses' : 'purchases')}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 border shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Movimentações (últimos 14 dias)</h3>
              <p className="text-xs text-muted-foreground">Entradas vs. Saídas em unidades</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#gEntradas)"
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  name="Saídas"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2}
                  fill="url(#gSaidas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border shadow-sm">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-foreground">Produtos por categoria</h3>
            <p className="text-xs text-muted-foreground">Top 6 categorias</p>
          </div>
          <div className="h-[260px] w-full">
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Critical stock */}
        <Card className="p-5 border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Atenção no estoque
              </h3>
              <p className="text-xs text-muted-foreground">Produtos abaixo ou próximos do mínimo</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onTabChange('inventory')}>
              Ver tudo <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {criticalList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum produto em situação crítica. ✨
              </p>
            ) : (
              criticalList.map((p) => {
                const isCritical = p.currentStock <= p.minStock;
                const ratio = p.minStock > 0 ? Math.min(100, (p.currentStock / p.minStock) * 100) : 100;
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                      <Badge variant={isCritical ? 'destructive' : 'warning'} className="flex-shrink-0">
                        {p.currentStock} / mín {p.minStock}
                      </Badge>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCritical ? 'bg-destructive' : 'bg-warning'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Atividades recentes</h3>
              <p className="text-xs text-muted-foreground">Últimas movimentações e compras</p>
            </div>
          </div>
          <div className="space-y-2">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Sem atividades recentes.</p>
            ) : (
              recentActivities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.type === 'entry'
                        ? 'bg-success/10 text-success'
                        : a.type === 'exit'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {a.type === 'entry' ? (
                      <PackagePlus className="h-4 w-4" />
                    ) : a.type === 'exit' ? (
                      <PackageMinus className="h-4 w-4" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                      {a.value != null && a.value > 0 && (
                        <p className="text-sm font-semibold text-foreground whitespace-nowrap tabular-nums">
                          {BRL(a.value)}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.subtitle} • {a.date.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
