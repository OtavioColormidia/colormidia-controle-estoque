import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { Product } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
}

export default function ProductManagement({ products, onAddProduct, onDeleteProduct }: ProductManagementProps) {
  // Gerar próximo código automaticamente
  const getNextProductCode = () => {
    const existingCodes = products.map(p => {
      const match = p.code.match(/MAT(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `MAT${String(maxNumber + 1).padStart(3, '0')}`;
  };
  
  const [formData, setFormData] = useState({
    code: getNextProductCode(),
    name: '',
    description: '',
    category: '',
    minStock: '',
    currentStock: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddProduct({
        code: formData.code,
        name: formData.name,
        description: formData.description,
        unit: 'UN', // Default value
        category: formData.category,
        minStock: parseInt(formData.minStock),
        currentStock: parseInt(formData.currentStock),
        location: '', // Default empty
      });
      toast({ title: 'Produto cadastrado', description: `${formData.name} foi adicionado com sucesso` });
      setFormData({ 
        code: getNextProductCode(), // Gerar novo código após cadastro
        name: '', 
        description: '', 
        category: '', 
        minStock: '', 
        currentStock: '' 
      });
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Cadastro de Produtos</h2>
        <p className="text-muted-foreground mt-1">Gerencie os produtos do almoxarifado</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Produto
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Montagem">Montagem</SelectItem>
                    <SelectItem value="Adesivagem">Adesivagem</SelectItem>
                    <SelectItem value="Serralheria">Serralheria</SelectItem>
                    <SelectItem value="EPI">EPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Estoque Atual</Label>
                <Input type="number" value={formData.currentStock} onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })} required />
              </div>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary">
              <Package className="h-4 w-4 mr-2" />
              Cadastrar Produto
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Produtos Cadastrados</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.currentStock}/{product.minStock}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteProduct(product.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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