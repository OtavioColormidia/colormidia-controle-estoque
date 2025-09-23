import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  DollarSign,
  Activity,
  Download,
} from 'lucide-react';
import { Product, StockMovement } from '@/types/inventory';
import { getStockStatus } from '@/lib/data';
import { exportAllData } from '@/lib/export';
import {
  LineChart,
  Line,
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

  // Prepare chart data
  const stockStatusData = [
    { name: 'Normal', value: products.filter(p => getStockStatus(p.currentStock, p.minStock) === 'normal').length, color: 'hsl(var(--success))' },
    { name: 'Atenção', value: products.filter(p => getStockStatus(p.currentStock, p.minStock) === 'warning').length, color: 'hsl(var(--warning))' },
    { name: 'Crítico', value: products.filter(p => getStockStatus(p.currentStock, p.minStock) === 'critical').length, color: 'hsl(var(--danger))' },
  ];

  const movementsByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 86400000);
    const dayMovements = movements.filter(
      (m) => new Date(m.date).toDateString() === date.toDateString()
    );
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Visão geral do controle de estoque
          </p>
        </div>
        <Button onClick={exportAllData} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Todos os Dados
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-border hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total de Produtos</p>
              <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-border hover:shadow-lg transition-all">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Itens com Estoque Baixo</p>
              <p className="text-2xl font-bold text-foreground">{lowStockItems}</p>
            </div>
            <div className="bg-warning/10 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Movimentações da Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={movementsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Legend />
              <Bar dataKey="entradas" fill="hsl(var(--success))" name="Entradas" />
              <Bar dataKey="saidas" fill="hsl(var(--warning))" name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Stock Status Pie Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status do Estoque</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stockStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {stockStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Category Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Análise por Categoria</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={Object.values(categoryData)}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
            />
            <Legend />
            <Bar dataKey="quantidade" fill="hsl(var(--primary))" name="Quantidade" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Movements */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Movimentações Recentes</h3>
        <div className="space-y-3">
          {movements.slice(0, 5).map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                {movement.type === 'entry' ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="font-medium">{movement.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {movement.type === 'entry' ? 'Entrada' : 'Saída'} -{' '}
                    {new Date(movement.date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{movement.quantity} un.</p>
                {movement.totalValue && (
                  <p className="text-sm text-muted-foreground">
                    R$ {movement.totalValue.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}