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
import { Search, Filter, AlertTriangle, CheckCircle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, StockMovement } from '@/types/inventory';
import { getStockStatus } from '@/lib/data';


interface InventoryControlProps {
  products: Product[];
  movements: StockMovement[];
}

export default function InventoryControl({ products, movements }: InventoryControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');

  // Calculate real entries and exits for each product, plus average cost and last purchase price
  const productMovements = useMemo(() => {
    const movementsByProduct = new Map<string, { 
      entries: number; 
      exits: number;
      averageCost: number;
      lastPurchasePrice: number;
    }>();
    
    movements.forEach((movement) => {
      if (!movement.productId) return;
      
      const current = movementsByProduct.get(movement.productId) || { 
        entries: 0, 
        exits: 0,
        averageCost: 0,
        lastPurchasePrice: 0
      };
      
      if (movement.type === 'entry') {
        current.entries += movement.quantity;
      } else {
        current.exits += movement.quantity;
      }
      
      movementsByProduct.set(movement.productId, current);
    });
    
    // Calculate average cost and last purchase price for each product
    products.forEach((product) => {
      const entryMovements = movements
        .filter(m => m.productId === product.id && m.type === 'entry' && m.unitPrice)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (entryMovements.length > 0) {
        // Calculate average cost
        const totalCost = entryMovements.reduce((sum, m) => sum + (m.unitPrice! * m.quantity), 0);
        const totalQuantity = entryMovements.reduce((sum, m) => sum + m.quantity, 0);
        const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        
        // Get last purchase price
        const lastPurchasePrice = entryMovements[0].unitPrice || 0;
        
        const current = movementsByProduct.get(product.id);
        if (current) {
          current.averageCost = averageCost;
          current.lastPurchasePrice = lastPurchasePrice;
        }
      }
    });
    
    return movementsByProduct;
  }, [movements, products]);

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

    switch (status) {
      case 'critical':
        return (
          <Badge className="bg-danger text-danger-foreground">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Necessidade de Reposição
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-warning text-warning-foreground">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Estoque Baixo
          </Badge>
        );
      case 'normal':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Estoque Confortável
          </Badge>
        );
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Relatório de Controle de Estoque', 14, 15);
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
    
    const tableData = filteredProducts.map((product) => {
      const movementData = productMovements.get(product.id) || { 
        entries: 0, 
        exits: 0, 
        averageCost: 0, 
        lastPurchasePrice: 0 
      };
      const initialStock = product.currentStock - movementData.entries + movementData.exits;
      const status = getStockStatus(product.currentStock, product.minStock);
      
      return [
        product.code,
        product.name,
        initialStock.toString(),
        movementData.entries.toString(),
        movementData.exits.toString(),
        product.minStock.toString(),
        product.currentStock.toString(),
        `R$ ${movementData.averageCost.toFixed(2)}`,
        `R$ ${movementData.lastPurchasePrice.toFixed(2)}`,
        status === 'critical' ? 'Reposição' : status === 'warning' ? 'Baixo' : 'Confortável'
      ];
    });
    
    autoTable(doc, {
      startY: 28,
      head: [['Código', 'Produto', 'Est. Inicial', 'Entradas', 'Saídas', 'Est. Mín.', 'Est. Atual', 'Custo Médio', 'Últ. Compra', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 15 },
        7: { cellWidth: 20 },
        8: { cellWidth: 20 },
        9: { cellWidth: 20 }
      }
    });
    
    doc.save(`estoque_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Controle de Estoque</h2>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie o estoque do almoxarifado
          </p>
        </div>
        <Button onClick={exportToPDF} className="bg-gradient-primary">
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
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
                <TableHead className="font-bold text-right">Custo Médio</TableHead>
                <TableHead className="font-bold text-right">Preço Últ. Compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const movementData = productMovements.get(product.id) || { 
                  entries: 0, 
                  exits: 0, 
                  averageCost: 0, 
                  lastPurchasePrice: 0 
                };
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
                    <TableCell className="text-right font-medium">
                      R$ {movementData.averageCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {movementData.lastPurchasePrice.toFixed(2)}
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