import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, FileText, Clock, CheckCircle, XCircle, Download } from 'lucide-react';
import { Purchase } from '@/types/inventory';
import { exportToCSV } from '@/lib/export';

interface PurchasesProps {
  purchases: Purchase[];
}

export default function Purchases({ purchases }: PurchasesProps) {
  const getStatusBadge = (status: Purchase['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge className="bg-primary text-primary-foreground"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'delivered':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Entregue</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive text-destructive-foreground"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
    }
  };

  const handleExport = () => {
    const exportData = purchases.map(p => ({
      'Nº Pedido': p.documentNumber,
      'Data': new Date(p.date).toLocaleDateString('pt-BR'),
      'Fornecedor': p.supplierName,
      'Qtd Itens': p.items.length,
      'Valor Total': `R$ ${p.totalValue.toFixed(2)}`,
      'Status': p.status === 'pending' ? 'Pendente' : 
                p.status === 'approved' ? 'Aprovado' : 
                p.status === 'delivered' ? 'Entregue' : 'Cancelado'
    }));
    exportToCSV(exportData, 'compras');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Compras</h2>
          <p className="text-muted-foreground mt-1">Gerencie as compras com fornecedores</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Compras
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Pedidos de Compra
        </h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-mono">{purchase.documentNumber}</TableCell>
                  <TableCell>{new Date(purchase.date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{purchase.supplierName}</TableCell>
                  <TableCell>{purchase.items.length} itens</TableCell>
                  <TableCell className="text-right font-bold">R$ {purchase.totalValue.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}