import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, FileText, Clock, CheckCircle, XCircle, Trash2, Plus, CalendarIcon } from 'lucide-react';
import { Purchase, Product, Supplier, PurchaseItem } from '@/types/inventory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { toast } from '@/components/ui/use-toast';

interface PurchasesProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  onAddPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<void>;
  onDeletePurchase: (id: string) => Promise<void>;
  onUpdatePurchaseStatus: (id: string, status: Purchase['status']) => Promise<void>;
}

export default function Purchases({ purchases, products, suppliers, onAddPurchase, onDeletePurchase, onUpdatePurchaseStatus }: PurchasesProps) {
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    documentNumber: '',
    notes: '',
    expectedDeliveryDate: undefined as Date | undefined,
  });
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const handleAddItem = () => {
    if (productName && quantity && unitPrice) {
      const newItem: PurchaseItem = {
        productId: '',
        productName: productName,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalPrice: Number(quantity) * Number(unitPrice),
      };
      setPurchaseItems([...purchaseItems, newItem]);
      setProductName('');
      setQuantity('');
      setUnitPrice('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supplierId && purchaseItems.length > 0) {
      const totalValue = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      try {
        await onAddPurchase({
          date: new Date(),
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          items: purchaseItems,
          totalValue,
          status: 'pending',
          documentNumber: formData.documentNumber,
          notes: formData.notes,
          expectedDeliveryDate: formData.expectedDeliveryDate,
        });

        toast({ title: 'Pedido criado', description: 'Pedido de compra criado com sucesso' });
        
        // Reset form
        setFormData({ supplierId: '', supplierName: '', documentNumber: '', notes: '', expectedDeliveryDate: undefined });
        setPurchaseItems([]);
      } catch (error) {
        console.error('Erro ao criar pedido:', error);
      }
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


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Compras</h2>
        <p className="text-muted-foreground mt-1">Gerencie as compras com fornecedores</p>
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
              <Select 
                value={formData.supplierId} 
                onValueChange={(value) => {
                  const supplier = suppliers.find(s => s.id === value);
                  setFormData({ 
                    ...formData, 
                    supplierId: value,
                    supplierName: supplier?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
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

            <div className="space-y-2">
              <Label>Previsão de Entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.expectedDeliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expectedDeliveryDate ? format(formData.expectedDeliveryDate, "dd/MM/yyyy") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expectedDeliveryDate}
                    onSelect={(date) => setFormData({ ...formData, expectedDeliveryDate: date })}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-2 block">Adicionar Itens</Label>
              <div className="space-y-2">
                <Input 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Digite o nome do produto"
                />
                
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
                  <TableHead>Previsão Entrega</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono">{purchase.documentNumber}</TableCell>
                    <TableCell>{new Date(purchase.date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{purchase.supplierName || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {purchase.items.map((item, idx) => (
                          <div key={idx} className="text-xs">
                            {item.productName} - {item.quantity} un. × R$ {item.unitPrice.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">R$ {purchase.totalValue.toFixed(2)}</TableCell>
                    <TableCell>
                      {purchase.expectedDeliveryDate 
                        ? new Date(purchase.expectedDeliveryDate).toLocaleDateString('pt-BR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {purchase.notes || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {purchase.status !== 'delivered' && purchase.status !== 'cancelled' && (
                          <Button
                            onClick={async () => {
                              try {
                                await onUpdatePurchaseStatus(purchase.id, 'delivered');
                              } catch (error) {
                                console.error('Erro ao atualizar status:', error);
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="text-success hover:text-success"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          onClick={async () => {
                            try {
                              await onDeletePurchase(purchase.id);
                            } catch (error) {
                              console.error('Erro ao excluir compra:', error);
                            }
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