import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Product, StockMovement } from '@/types/inventory';
import { getStockStatus } from '@/lib/data';
import { exportAllData } from '@/lib/export';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardProps {
  products: Product[];
  movements: StockMovement[];
}

export default function Dashboard({ products, movements }: DashboardProps) {

  // Calculate metrics
  const totalProducts = products.length;
  const lowStockItems = products.filter(
    (p) => getStockStatus(p.currentStock, p.minStock) !== 'normal'
  ).length;

  // Prepare chart data - filter out zero values
  const stockStatusData = [
    { name: 'Normal', value: products.filter(p => getStockStatus(p.currentStock, p.minStock) === 'normal').length, color: 'hsl(var(--success))' },
    { name: 'Atenção', value: products.filter(p => getStockStatus(p.currentStock, p.minStock) === 'warning').length, color: 'hsl(var(--warning))' },
    { name: 'Crítico', value: products.filter(p => getStockStatus(p.currentStock, p.minStock) === 'critical').length, color: 'hsl(var(--danger))' },
  ].filter(item => item.value > 0);

  const movementsByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    
    // Ensure we're working with local Brazil time
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    const dayMovements = movements.filter((m) => {
      const movementDate = new Date(m.date);
      return movementDate >= startOfDay && movementDate <= endOfDay;
    });
    
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      entradas: dayMovements.filter((m) => m.type === 'entry').length,
      saidas: dayMovements.filter((m) => m.type === 'exit').length,
    };
  });

  const categoryData = products.reduce((acc, product) => {
    const category = product.category;
    if (!acc[category]) {
      acc[category] = { name: category, quantidade: 0, valor: 0 };
    }
    acc[category].quantidade += product.currentStock;
    acc[category].valor += product.currentStock * 50;
    return acc;
  }, {} as Record<string, { name: string; quantidade: number; valor: number }>);


  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Visão geral do controle de estoque
          </p>
        </div>
        <Button 
          onClick={exportAllData} 
          variant="outline" 
          className="gap-2 shadow-sm hover:shadow-md transition-all"
        >
          <Download className="h-4 w-4" />
          Exportar Dados
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-6 card-hover border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Total de Produtos</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{totalProducts}</p>
                <span className="text-xs text-success font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                  Ativos
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 card-hover border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-foreground">{lowStockItems}</p>
                {lowStockItems > 0 && (
                  <span className="text-xs text-warning font-medium flex items-center gap-0.5">
                    <ArrowDownRight className="h-3 w-3" />
                    Atenção
                  </span>
                )}
              </div>
            </div>
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${lowStockItems > 0 ? 'bg-warning/10' : 'bg-success/10'}`}>
              <AlertTriangle className={`h-6 w-6 ${lowStockItems > 0 ? 'text-warning' : 'text-success'}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Movement Chart */}
        <Card className="p-6 border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-lg font-semibold mb-6">Movimentações da Semana</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={movementsByDay} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
              />
              <Bar 
                dataKey="entradas" 
                fill="hsl(var(--success))" 
                name="Entradas" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="saidas" 
                fill="hsl(var(--warning))" 
                name="Saídas" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Stock Status Pie Chart */}
        <Card className="p-6 border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-lg font-semibold mb-6">Status do Estoque</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stockStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {stockStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-lg)',
                }}
                formatter={(value, name) => [`${value} itens`, name]}
              />
              <Legend 
                verticalAlign="bottom"
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Category Analysis */}
      <Card className="p-6 border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-lg font-semibold mb-6">Análise por Categoria</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={Object.values(categoryData)} layout="vertical" barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-lg)',
              }}
            />
            <Bar 
              dataKey="quantidade" 
              fill="hsl(var(--primary))" 
              name="Quantidade" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Movements */}
      <Card className="p-6 border-0 shadow-card animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <h3 className="text-lg font-semibold mb-6">Movimentações Recentes</h3>
        <div className="space-y-3">
          {movements
            .slice()
            .sort((a, b) => {
              const ta = (a as any).createdAt ? new Date(a.createdAt as Date).getTime() : new Date(a.date).getTime();
              const tb = (b as any).createdAt ? new Date(b.createdAt as Date).getTime() : new Date(b.date).getTime();
              return tb - ta;
            })
            .slice(0, 5)
            .map((movement, index) => {
            const productName = movement.productName || 
              products.find(p => p.id === movement.productId)?.name || 
              'Produto não identificado';
              
            return (
              <div
                key={movement.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                style={{ animationDelay: `${0.7 + index * 0.1}s` }}
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
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação registrada
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
