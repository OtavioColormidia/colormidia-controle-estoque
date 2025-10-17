import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
import { Package, Plus, Trash2, FileText } from 'lucide-react';
import { Supplier } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';

interface SupplierMaterialsProps {
  suppliers: Supplier[];
}

interface SupplierMaterial {
  id: string;
  supplierId: string;
  supplierName: string;
  materials: string[];
}

export default function SupplierMaterials({ suppliers }: SupplierMaterialsProps) {
  const [supplierMaterials, setSupplierMaterials] = useState<SupplierMaterial[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [currentMaterials, setCurrentMaterials] = useState<string[]>([]);

  const handleAddMaterial = () => {
    if (materialName.trim()) {
      setCurrentMaterials([...currentMaterials, materialName.trim()]);
      setMaterialName('');
    }
  };

  const handleRemoveMaterial = (index: number) => {
    setCurrentMaterials(currentMaterials.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupplierId && currentMaterials.length > 0) {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      if (!supplier) return;

      const existingIndex = supplierMaterials.findIndex(sm => sm.supplierId === selectedSupplierId);
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...supplierMaterials];
        updated[existingIndex] = {
          ...updated[existingIndex],
          materials: currentMaterials
        };
        setSupplierMaterials(updated);
        toast({ title: 'Materiais atualizados', description: 'Lista de materiais atualizada com sucesso' });
      } else {
        // Add new
        setSupplierMaterials([
          ...supplierMaterials,
          {
            id: Date.now().toString(),
            supplierId: selectedSupplierId,
            supplierName: supplier.name,
            materials: currentMaterials
          }
        ]);
        toast({ title: 'Materiais cadastrados', description: 'Materiais do fornecedor cadastrados com sucesso' });
      }

      // Reset form
      setSelectedSupplierId('');
      setCurrentMaterials([]);
    }
  };

  const handleEditSupplierMaterials = (supplierMaterial: SupplierMaterial) => {
    setSelectedSupplierId(supplierMaterial.supplierId);
    setCurrentMaterials([...supplierMaterial.materials]);
  };

  const handleDeleteSupplierMaterials = (id: string) => {
    setSupplierMaterials(supplierMaterials.filter(sm => sm.id !== id));
    toast({ title: 'Materiais removidos', description: 'Materiais do fornecedor removidos com sucesso' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Fornecedores / Material</h2>
        <p className="text-muted-foreground mt-1">Gerencie os materiais fornecidos por cada fornecedor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Cadastrar Materiais
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
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

            <div className="border-t pt-4">
              <Label className="mb-2 block">Adicionar Material</Label>
              <div className="space-y-2">
                <Input 
                  value={materialName} 
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="Digite o nome do material"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMaterial();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddMaterial} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar à Lista
                </Button>
              </div>
            </div>

            {currentMaterials.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Materiais Cadastrados</Label>
                {currentMaterials.map((material, index) => (
                  <div key={index} className="flex justify-between items-center text-sm p-2 bg-secondary/50 rounded">
                    <span>{material}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMaterial(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary"
              disabled={!selectedSupplierId || currentMaterials.length === 0}
            >
              <Package className="h-4 w-4 mr-2" />
              Salvar Materiais
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fornecedores Cadastrados
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierMaterials.map((sm) => (
                  <TableRow key={sm.id}>
                    <TableCell className="font-medium">{sm.supplierName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sm.materials.map((material, idx) => (
                          <span 
                            key={idx} 
                            className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                          >
                            {material}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditSupplierMaterials(sm)}
                          variant="outline"
                          size="sm"
                        >
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDeleteSupplierMaterials(sm.id)}
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

          {supplierMaterials.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum fornecedor com materiais cadastrados</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
