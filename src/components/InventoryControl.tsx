import { useState } from 'react';
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
import { Search, Filter, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Product } from '@/types/inventory';
import { getStockStatus } from '@/lib/data';

interface InventoryControlProps {
  products: Product[];
}

export default function InventoryControl({ products }: InventoryControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');

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

  const handleExport = () => {
    const csvContent = [
      ['Código', 'Produto/Material', 'Estoque Inicial', 'Estoque Atual', 'Estoque Mínimo', 'Status', 'Localização'],
      ...filteredProducts.map(p => [
        p.code,
        p.name,
        p.currentStock + 10, // Simulating initial stock
        p.currentStock,
        p.minStock,
        getStockStatus(p.currentStock, p.minStock),
        p.location || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
          <Button
            onClick={handleExport}
            className="bg-gradient-secondary hover:opacity-90"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
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
                <TableHead className="font-bold">Localização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const initialStock = product.currentStock + 10; // Simulating initial stock
                const entries = 7; // Simulated entries
                const exits = initialStock + entries - product.currentStock; // Calculate exits

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
                      {entries}
                    </TableCell>
                    <TableCell className="text-center text-warning font-medium">
                      {exits}
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
                    <TableCell className="text-sm">{product.location || '-'}</TableCell>
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