import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, AlertTriangle, CheckCircle } from 'lucide-react';
import { Product, StockMovement } from '@/types/inventory';
import { getStockStatus } from '@/lib/data';


interface InventoryControlProps {
  products: Product[];
  movements: StockMovement[];
}

export default function InventoryControl({ products, movements }: InventoryControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');

  // Calculate real entries and exits for each product
  const productMovements = useMemo(() => {
    const movementsByProduct = new Map<string, { entries: number; exits: number }>();
    
    movements.forEach((movement) => {
      if (!movement.productId) return;
      
      const current = movementsByProduct.get(movement.productId) || { entries: 0, exits: 0 };
      
      if (movement.type === 'entry') {
        current.entries += movement.quantity;
      } else {
        current.exits += movement.quantity;
      }
      
      movementsByProduct.set(movement.productId, current);
    });
    
    return movementsByProduct;
  }, [movements]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getStockStatus(product.currentStock, product.minStock);
    const matchesFilter = filterStatus === 'all' || status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (current: number, min: number) => {
    const status = getStockStatus(current, min);
    const percentage = Math.round((current / min) * 100);

    switch (status) {
      case 'critical':
        return (
          <Badge className="bg-danger text-danger-foreground">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Necessidade de Reposição ({percentage}%)
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-warning text-warning-foreground">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Estoque Baixo ({percentage}%)
          </Badge>
        );
      case 'normal':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Estoque Confortável ({percentage}%)
          </Badge>
        );
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Controle de Estoque</h2>
        <p className="text-muted-foreground mt-1">
          Visualize e gerencie o estoque do almoxarifado
        </p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por código ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Todos
            </Button>
            <Button
              variant={filterStatus === 'critical' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('critical')}
              className="flex items-center gap-2"
            >
              Crítico
            </Button>
            <Button
              variant={filterStatus === 'warning' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('warning')}
              className="flex items-center gap-2"
            >
              Atenção
            </Button>
            <Button
              variant={filterStatus === 'normal' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('normal')}
              className="flex items-center gap-2"
            >
            Normal
          </Button>
        </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Código</TableHead>
                <TableHead className="font-bold">Produtos / Material</TableHead>
                <TableHead className="font-bold text-center">Estoque Inicial</TableHead>
                <TableHead className="font-bold text-center">Entradas</TableHead>
                <TableHead className="font-bold text-center">Saídas</TableHead>
                <TableHead className="font-bold text-center">Estoque Mínimo</TableHead>
                <TableHead className="font-bold text-center">Estoque Atual</TableHead>
                <TableHead className="font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const movementData = productMovements.get(product.id) || { entries: 0, exits: 0 };
                // Calculate initial stock: current stock - entries + exits
                const initialStock = product.currentStock - movementData.entries + movementData.exits;

                return (
                  <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono">{product.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{initialStock}</TableCell>
                    <TableCell className="text-center text-success font-medium">
                      {movementData.entries || 0}
                    </TableCell>
                    <TableCell className="text-center text-warning font-medium">
                      {movementData.exits || 0}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {product.minStock}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold text-lg ${
                        getStockStatus(product.currentStock, product.minStock) === 'critical'
                          ? 'text-danger'
                          : getStockStatus(product.currentStock, product.minStock) === 'warning'
                          ? 'text-warning'
                          : 'text-success'
                      }`}>
                        {product.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(product.currentStock, product.minStock)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </div>
        )}
      </Card>
    </div>
  );
}