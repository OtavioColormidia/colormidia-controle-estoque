import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, FileText, Clock, CheckCircle, XCircle, Download, Trash2, Plus } from 'lucide-react';
import { Purchase, Product, Supplier, PurchaseItem } from '@/types/inventory';
import { exportToCSV } from '@/lib/export';
import { toast } from '@/components/ui/use-toast';

interface PurchasesProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  onAddPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  onDeletePurchase: (id: string) => void;
  onUpdatePurchaseStatus: (id: string, status: Purchase['status']) => void;
}

export default function Purchases({ purchases, products, suppliers, onAddPurchase, onDeletePurchase, onUpdatePurchaseStatus }: PurchasesProps) {
  const [formData, setFormData] = useState({
    supplierId: '',
    documentNumber: '',
    notes: '',
  });
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const handleAddItem = () => {
    if (selectedProduct && quantity && unitPrice) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        const newItem: PurchaseItem = {
          productId: selectedProduct,
          productName: product.name,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
          totalPrice: Number(quantity) * Number(unitPrice),
        };
        setPurchaseItems([...purchaseItems, newItem]);
        setSelectedProduct('');
        setQuantity('');
        setUnitPrice('');
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supplierId && purchaseItems.length > 0) {
      const supplier = suppliers.find(s => s.id === formData.supplierId);
      const totalValue = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      onAddPurchase({
        date: new Date(),
        supplierId: formData.supplierId,
        supplierName: supplier?.name,
        items: purchaseItems,
        totalValue,
        status: 'pending',
        documentNumber: formData.documentNumber,
        notes: formData.notes,
      });

      toast({ title: 'Pedido criado', description: 'Pedido de compra criado com sucesso' });
      
      // Reset form
      setFormData({ supplierId: '', documentNumber: '', notes: '' });
      setPurchaseItems([]);
    }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Pedido de Compra
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.active).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nº Documento</Label>
              <Input 
                value={formData.documentNumber} 
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="PED-2024001"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações do pedido"
              />
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Adicionar Itens</Label>
              <div className="space-y-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    type="number" 
                    placeholder="Quantidade"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="Preço Unit."
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
                
                <Button type="button" onClick={handleAddItem} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </div>

            {purchaseItems.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Itens do Pedido</Label>
                {purchaseItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm p-2 bg-secondary/50 rounded">
                    <span>{item.productName}</span>
                    <div className="flex items-center gap-2">
                      <span>{item.quantity}x R$ {item.unitPrice.toFixed(2)}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="font-bold text-right">
                  Total: R$ {purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary"
              disabled={!formData.supplierId || purchaseItems.length === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Criar Pedido
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pedidos Cadastrados
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
                  <TableHead>Ações</TableHead>
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
                    <TableCell>
                      <div className="flex gap-2">
                        {purchase.status !== 'delivered' && purchase.status !== 'cancelled' && (
                          <Button
                            onClick={() => {
                              onUpdatePurchaseStatus(purchase.id, 'delivered');
                              toast({ title: 'Pedido atualizado', description: 'Pedido marcado como entregue' });
                            }}
                            variant="outline"
                            size="sm"
                            className="text-success hover:text-success"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            onDeletePurchase(purchase.id);
                            toast({ title: 'Pedido removido', description: 'Pedido de compra removido com sucesso' });
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}