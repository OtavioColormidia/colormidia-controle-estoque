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
import { Calendar, Package, Save, Minus, User, Plus, Trash2 } from 'lucide-react';
import { Product, StockMovement } from '@/types/inventory';
import { toast } from '@/hooks/use-toast';

interface ExitItem {
  productId: string;
  productName: string;
  quantity: number;
  currentStock: number;
}

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
  const [commonData, setCommonData] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedBy: '',
    department: '',
    reason: '',
    notes: '',
  });

  const [itemData, setItemData] = useState({
    productId: '',
    quantity: '',
  });

  const [items, setItems] = useState<ExitItem[]>([]);

  const parseLocalDate = (yyyyMmDd: string) => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
  };

  const exits = movements.filter((m) => m.type === 'exit').slice(0, 10);

  const handleAddItem = () => {
    const product = products.find(p => p.id === itemData.productId);
    
    if (!product) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um produto',
        variant: 'destructive',
      });
      return;
    }

    if (!itemData.quantity || parseInt(itemData.quantity) <= 0) {
      toast({
        title: 'Erro',
        description: 'Por favor, insira uma quantidade válida',
        variant: 'destructive',
      });
      return;
    }

    if (parseInt(itemData.quantity) > product.currentStock) {
      toast({
        title: 'Erro',
        description: 'Quantidade solicitada maior que o estoque disponível',
        variant: 'destructive',
      });
      return;
    }

    // Check if product already in list
    if (items.some(item => item.productId === itemData.productId)) {
      toast({
        title: 'Erro',
        description: 'Este produto já foi adicionado à lista',
        variant: 'destructive',
      });
      return;
    }

    const newItem: ExitItem = {
      productId: itemData.productId,
      productName: product.name,
      quantity: parseInt(itemData.quantity),
      currentStock: product.currentStock,
    };

    setItems([...items, newItem]);
    setItemData({ productId: '', quantity: '' });

    toast({
      title: 'Item adicionado',
      description: `${newItem.quantity} unidades de ${newItem.productName}`,
    });
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um item antes de registrar',
        variant: 'destructive',
      });
      return;
    }

    if (!commonData.requestedBy || !commonData.department) {
      toast({
        title: 'Erro',
        description: 'Preencha os dados do solicitante e departamento',
        variant: 'destructive',
      });
      return;
    }

    // Create a movement for each item
    items.forEach(item => {
      const movement: Omit<StockMovement, 'id'> = {
        date: parseLocalDate(commonData.date),
        type: 'exit',
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        requestedBy: commonData.requestedBy,
        department: commonData.department,
        reason: commonData.reason || undefined,
        notes: commonData.notes || undefined,
      };

      onAddMovement(movement);
    });

    toast({
      title: 'Saídas registradas',
      description: `${items.length} ${items.length === 1 ? 'item registrado' : 'itens registrados'} para ${commonData.requestedBy}`,
    });

    // Reset form
    setCommonData({
      date: new Date().toISOString().split('T')[0],
      requestedBy: '',
      department: '',
      reason: '',
      notes: '',
    });
    setItems([]);
  };

  const departments = [
    'Adesivagem',
    'Serralheria',
    'Montagem',
    'Atendimento ao Cliente',
    'Vendas',
  ];


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Saída de Material</h2>
        <p className="text-muted-foreground mt-1">
          Registre a saída de materiais do estoque
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exit Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Minus className="h-5 w-5" />
            Nova Saída
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Common Data Section */}
            <div className="space-y-4 pb-4 border-b">
              <h4 className="font-medium text-sm">Dados do Solicitante</h4>
              
              <div className="space-y-2">
                <Label htmlFor="date">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={commonData.date}
                    onChange={(e) => setCommonData({ ...commonData, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestedBy">Solicitante</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="requestedBy"
                      placeholder="Nome"
                      value={commonData.requestedBy}
                      onChange={(e) => setCommonData({ ...commonData, requestedBy: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Select
                    value={commonData.department}
                    onValueChange={(value) => setCommonData({ ...commonData, department: value })}
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
                  value={commonData.reason}
                  onChange={(e) => setCommonData({ ...commonData, reason: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais..."
                  value={commonData.notes}
                  onChange={(e) => setCommonData({ ...commonData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            {/* Add Items Section */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Adicionar Materiais</h4>
              
              <div className="space-y-2">
                <Label htmlFor="product">Produto</Label>
                <Select
                  value={itemData.productId}
                  onValueChange={(value) => setItemData({ ...itemData, productId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .sort((a, b) => {
                        const numA = parseInt(a.code.replace(/\D/g, '') || '0');
                        const numB = parseInt(b.code.replace(/\D/g, '') || '0');
                        return numA - numB;
                      })
                      .filter(p => !items.some(item => item.productId === p.id))
                      .map((product) => (
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
                  value={itemData.quantity}
                  onChange={(e) => setItemData({ ...itemData, quantity: e.target.value })}
                  min="1"
                />
                {itemData.productId && (
                  <p className="text-sm text-muted-foreground">
                    Disponível: {products.find(p => p.id === itemData.productId)?.currentStock || 0} unidades
                  </p>
                )}
              </div>

              <Button 
                type="button" 
                onClick={handleAddItem}
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Itens Adicionados ({items.length})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell className="text-sm font-medium">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-center text-warning font-medium">
                            -{item.quantity}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-secondary"
              disabled={items.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Registrar {items.length > 0 ? `${items.length} ${items.length === 1 ? 'Saída' : 'Saídas'}` : 'Saídas'}
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
                  <TableHead>Motivo</TableHead>
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
                    <TableCell className="text-sm">
                      {exit.reason || '-'}
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