import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, FileText, Clock, CheckCircle, XCircle, Trash2, Plus, CalendarIcon, Pencil, Filter, ChevronsUpDown, Check } from 'lucide-react';
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
  onUpdatePurchase: (id: string, purchase: Omit<Purchase, 'id' | 'date'>) => Promise<void>;
}

export default function Purchases({ purchases, products, suppliers, onAddPurchase, onDeletePurchase, onUpdatePurchaseStatus, onUpdatePurchase }: PurchasesProps) {
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [filterSupplierId, setFilterSupplierId] = useState<string>('all');
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    documentNumber: '',
    notes: '',
    expectedDeliveryDate: undefined as Date | undefined,
    status: 'pending' as Purchase['status'],
  });
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  // Filter active suppliers based on search
  const filteredActiveSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      if (!s.active) return false;
      if (!supplierSearch.trim()) return true;
      const search = supplierSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(search) ||
        s.tradeName?.toLowerCase().includes(search) ||
        s.code.toLowerCase().includes(search)
      );
    });
  }, [suppliers, supplierSearch]);

  const handleAddItem = () => {
    if (productName && quantity && unitPrice) {
      const newItem: PurchaseItem = {
        productId: '',
        productName: productName,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        totalPrice: Number(quantity) * Number(unitPrice),
      };
      
      if (editingItemIndex !== null) {
        // Update existing item
        const updatedItems = [...purchaseItems];
        updatedItems[editingItemIndex] = newItem;
        setPurchaseItems(updatedItems);
        setEditingItemIndex(null);
      } else {
        // Add new item
        setPurchaseItems([...purchaseItems, newItem]);
      }
      
      setProductName('');
      setQuantity('');
      setUnitPrice('');
    }
  };

  const handleEditItem = (index: number) => {
    const item = purchaseItems[index];
    setProductName(item.productName);
    setQuantity(item.quantity.toString());
    setUnitPrice(item.unitPrice.toString());
    setEditingItemIndex(index);
  };

  const handleCancelItemEdit = () => {
    setProductName('');
    setQuantity('');
    setUnitPrice('');
    setEditingItemIndex(null);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchaseId(purchase.id);
    setFormData({
      supplierId: purchase.supplierId || '',
      supplierName: purchase.supplierName || '',
      documentNumber: purchase.documentNumber || '',
      notes: purchase.notes || '',
      expectedDeliveryDate: purchase.expectedDeliveryDate,
      status: purchase.status,
    });
    setPurchaseItems(purchase.items);
  };

  const handleCancelEdit = () => {
    setEditingPurchaseId(null);
    setFormData({ 
      supplierId: '', 
      supplierName: '', 
      documentNumber: '', 
      notes: '', 
      expectedDeliveryDate: undefined,
      status: 'pending',
    });
    setPurchaseItems([]);
    setDiscount('');
    setEditingItemIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.supplierId && purchaseItems.length > 0) {
      const itemsTotal = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const discountValue = Number(discount) || 0;
      const totalValue = itemsTotal - discountValue;
      
      try {
        if (editingPurchaseId) {
          // Update existing purchase
          await onUpdatePurchase(editingPurchaseId, {
            supplierId: formData.supplierId,
            supplierName: formData.supplierName,
            items: purchaseItems,
            totalValue,
            status: formData.status,
            documentNumber: formData.documentNumber,
            notes: formData.notes,
            expectedDeliveryDate: formData.expectedDeliveryDate,
          });
          toast({ title: 'Pedido atualizado', description: 'Pedido de compra atualizado com sucesso' });
          setEditingPurchaseId(null);
        } else {
          // Create new purchase
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
        }
        
        // Reset form
        setFormData({ 
          supplierId: '', 
          supplierName: '', 
          documentNumber: '', 
          notes: '', 
          expectedDeliveryDate: undefined,
          status: 'pending',
        });
        setPurchaseItems([]);
        setDiscount('');
        setEditingItemIndex(null);
      } catch (error) {
        console.error('Erro ao salvar pedido:', error);
      }
    }
  };

  // Calculate totals
  const itemsTotal = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountValue = Number(discount) || 0;
  const finalTotal = itemsTotal - discountValue;

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

  // Filter purchases by supplier
  const filteredPurchases = filterSupplierId === 'all' 
    ? purchases 
    : purchases.filter(p => p.supplierId === filterSupplierId);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Compras</h2>
        <p className="text-muted-foreground mt-1">Gerencie as compras com fornecedores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {editingPurchaseId ? (
                <>
                  <Pencil className="h-5 w-5" />
                  Editar Pedido de Compra
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Novo Pedido de Compra
                </>
              )}
            </h3>
            {editingPurchaseId && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={supplierOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {formData.supplierId
                        ? suppliers.find((s) => s.id === formData.supplierId)?.name
                        : "Selecione um fornecedor"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Buscar fornecedor..." 
                      value={supplierSearch}
                      onValueChange={setSupplierSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                      <CommandGroup>
                        {filteredActiveSuppliers.map((supplier) => (
                          <CommandItem
                            key={supplier.id}
                            value={supplier.id}
                            onSelect={(currentValue) => {
                              setFormData({
                                ...formData,
                                supplierId: currentValue,
                                supplierName: supplier.name
                              });
                              setSupplierOpen(false);
                              setSupplierSearch('');
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.supplierId === supplier.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{supplier.name}</span>
                              {supplier.tradeName && (
                                <span className="text-xs text-muted-foreground">{supplier.tradeName}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              <div className="flex items-center justify-between mb-2">
                <Label>Adicionar Itens</Label>
                {editingItemIndex !== null && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancelItemEdit} className="text-xs h-6">
                    Cancelar edição
                  </Button>
                )}
              </div>
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
                
                <Button 
                  type="button" 
                  onClick={handleAddItem} 
                  variant="outline" 
                  className={cn(
                    "w-full",
                    editingItemIndex !== null && "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                  )}
                >
                  {editingItemIndex !== null ? (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Atualizar Item
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </>
                  )}
                </Button>
              </div>
            </div>

            {purchaseItems.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Itens do Pedido</Label>
                {purchaseItems.map((item, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex justify-between items-center text-sm p-2 rounded transition-colors",
                      editingItemIndex === index 
                        ? "bg-primary/20 ring-1 ring-primary" 
                        : "bg-secondary/50"
                    )}
                  >
                    <span className="truncate flex-1 mr-2">{item.productName}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs whitespace-nowrap">
                        {item.quantity}x R$ {item.unitPrice.toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEditItem(index)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Discount Section */}
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Desconto (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  {discountValue > 0 && (
                    <div className="flex justify-between items-center text-sm p-2 bg-success/20 rounded text-success-foreground">
                      <span>DESCONTO</span>
                      <span>- R$ {discountValue.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-2 mt-2 space-y-1">
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>R$ {itemsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="font-bold text-right text-lg">
                    Total: R$ {finalTotal.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary"
              disabled={!formData.supplierId || purchaseItems.length === 0}
            >
              {editingPurchaseId ? (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Atualizar Pedido
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Criar Pedido
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pedidos Cadastrados
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterSupplierId} onValueChange={setFilterSupplierId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filtrar por fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.filter(s => s.active).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ScrollArea className="h-[600px] w-full">
            <Table className="min-w-[1200px]">
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
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      {filterSupplierId === 'all' 
                        ? 'Nenhum pedido cadastrado' 
                        : 'Nenhum pedido encontrado para este fornecedor'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
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
                        <Button
                          onClick={() => handleEditPurchase(purchase)}
                          variant="outline"
                          size="sm"
                          className="text-primary hover:text-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}