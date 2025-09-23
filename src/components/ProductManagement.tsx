import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Package, Download } from 'lucide-react';
import { Product } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';
import { exportToCSV } from '@/lib/export';

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => void;
  onDeleteProduct: (id: string) => void;
}

export default function ProductManagement({ products, onAddProduct, onDeleteProduct }: ProductManagementProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    minStock: '',
    currentStock: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProduct({
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
    setFormData({ code: '', name: '', description: '', category: '', minStock: '', currentStock: '' });
  };

  const handleExport = () => {
    const exportData = products.map(p => ({
      'Código': p.code,
      'Nome': p.name,
      'Descrição': p.description || '',
      'Categoria': p.category,
      'Unidade': p.unit,
      'Estoque Atual': p.currentStock,
      'Estoque Mínimo': p.minStock,
      'Localização': p.location || ''
    }));
    exportToCSV(exportData, 'produtos');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Cadastro de Produtos</h2>
          <p className="text-muted-foreground mt-1">Gerencie os produtos do almoxarifado</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Produtos
        </Button>
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
                <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
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