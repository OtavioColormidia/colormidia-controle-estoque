import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Package, Save, Plus, Trash2 } from 'lucide-react';
import { Product, Supplier, StockMovement } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';

interface MaterialEntryProps {
  products: Product[];
  suppliers: Supplier[];
  movements: StockMovement[];
  onAddMovement: (movement: Omit<StockMovement, 'id'>) => void;
}

export default function MaterialEntry({
  products,
  suppliers,
  movements,
  onAddMovement,
}: MaterialEntryProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productId: '',
    quantity: '',
    unitPrice: '',
    supplierId: '',
    documentNumber: '',
    notes: '',
  });

  const entries = movements.filter((m) => m.type === 'entry').slice(0, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const product = products.find(p => p.id === formData.productId);
    const supplier = suppliers.find(s => s.id === formData.supplierId);
    
    if (!product) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um produto',
        variant: 'destructive',
      });
      return;
    }

    const movement: Omit<StockMovement, 'id'> = {
      date: new Date(formData.date),
      type: 'entry',
      productId: formData.productId,
      productName: product.name,
      quantity: parseInt(formData.quantity),
      unitPrice: parseFloat(formData.unitPrice) || undefined,
      totalValue: formData.unitPrice ? parseFloat(formData.unitPrice) * parseInt(formData.quantity) : undefined,
      supplierId: formData.supplierId || undefined,
      supplierName: supplier?.name,
      documentNumber: formData.documentNumber || undefined,
      notes: formData.notes || undefined,
    };

    onAddMovement(movement);

    toast({
      title: 'Entrada registrada',
      description: `${formData.quantity} unidades de ${product.name} adicionadas ao estoque`,
    });

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      productId: '',
      quantity: '',
      unitPrice: '',
      supplierId: '',
      documentNumber: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Entrada de Material</h2>
        <p className="text-muted-foreground mt-1">
          Registre a entrada de materiais no estoque
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Entrada
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentNumber">Nº Documento</Label>
                <Input
                  id="documentNumber"
                  placeholder="NF-001234"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Preço Unitário</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select
                value={formData.supplierId}
                onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Observações adicionais..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {formData.quantity && formData.unitPrice && (
              <Card className="p-4 bg-muted/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor Total:</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {(parseFloat(formData.quantity) * parseFloat(formData.unitPrice)).toFixed(2)}
                  </span>
                </div>
              </Card>
            )}

            <Button type="submit" className="w-full bg-gradient-primary">
              <Save className="h-4 w-4 mr-2" />
              Registrar Entrada
            </Button>
          </form>
        </Card>

        {/* Recent Entries */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entradas Recentes
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {new Date(entry.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{entry.productName}</p>
                      {entry.supplierName && (
                        <p className="text-xs text-muted-foreground">{entry.supplierName}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-medium text-success">
                      +{entry.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.totalValue ? (
                        <span className="font-medium">
                          R$ {entry.totalValue.toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
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