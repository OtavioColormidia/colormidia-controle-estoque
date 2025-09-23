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
import { Calendar, Package, Save, Minus, User, Download } from 'lucide-react';
import { Product, StockMovement } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/export';

interface MaterialExitProps {
  products: Product[];
  movements: StockMovement[];
  onAddMovement: (movement: Omit<StockMovement, 'id'>) => void;
}

export default function MaterialExit({
  products,
  movements,
  onAddMovement,
}: MaterialExitProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    productId: '',
    quantity: '',
    requestedBy: '',
    department: '',
    reason: '',
    notes: '',
  });

  const exits = movements.filter((m) => m.type === 'exit').slice(0, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const product = products.find(p => p.id === formData.productId);
    
    if (!product) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um produto',
        variant: 'destructive',
      });
      return;
    }

    if (parseInt(formData.quantity) > product.currentStock) {
      toast({
        title: 'Erro',
        description: 'Quantidade solicitada maior que o estoque disponível',
        variant: 'destructive',
      });
      return;
    }

    const movement: Omit<StockMovement, 'id'> = {
      date: new Date(formData.date),
      type: 'exit',
      productId: formData.productId,
      productName: product.name,
      quantity: parseInt(formData.quantity),
      requestedBy: formData.requestedBy,
      department: formData.department,
      reason: formData.reason || undefined,
      notes: formData.notes || undefined,
    };

    onAddMovement(movement);

    toast({
      title: 'Saída registrada',
      description: `${formData.quantity} unidades de ${product.name} retiradas do estoque`,
    });

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      productId: '',
      quantity: '',
      requestedBy: '',
      department: '',
      reason: '',
      notes: '',
    });
  };

  const departments = [
    'Administrativo',
    'Financeiro',
    'RH',
    'TI',
    'Operacional',
    'Manutenção',
    'Vendas',
    'Marketing',
  ];

  const handleExport = () => {
    const exportData = exits.map(e => ({
      'Data': new Date(e.date).toLocaleDateString('pt-BR'),
      'Produto': e.productName,
      'Quantidade': e.quantity,
      'Solicitante': e.requestedBy || '',
      'Departamento': e.department || '',
      'Motivo': e.reason || '',
      'Observações': e.notes || ''
    }));
    exportToCSV(exportData, 'saidas');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Saída de Material</h2>
          <p className="text-muted-foreground mt-1">
            Registre a saída de materiais do estoque
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Saídas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exit Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Minus className="h-5 w-5" />
            Nova Saída
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                      {product.code} - {product.name} (Estoque: {product.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              {formData.productId && (
                <p className="text-sm text-muted-foreground">
                  Disponível: {products.find(p => p.id === formData.productId)?.currentStock || 0} unidades
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedBy">Solicitante</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="requestedBy"
                    placeholder="Nome do solicitante"
                    value={formData.requestedBy}
                    onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                placeholder="Motivo da retirada"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
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

            <Button type="submit" className="w-full bg-gradient-secondary">
              <Save className="h-4 w-4 mr-2" />
              Registrar Saída
            </Button>
          </form>
        </Card>

        {/* Recent Exits */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Saídas Recentes
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exits.map((exit) => (
                  <TableRow key={exit.id}>
                    <TableCell className="text-sm">
                      {new Date(exit.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{exit.productName}</p>
                      {exit.department && (
                        <p className="text-xs text-muted-foreground">{exit.department}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {exit.requestedBy || '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium text-warning">
                      -{exit.quantity}
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