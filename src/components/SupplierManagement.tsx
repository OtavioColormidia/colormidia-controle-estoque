import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Building2, Mail, Phone, Download, Trash2 } from 'lucide-react';
import { Supplier } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';
import { exportToCSV } from '@/lib/export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onDeleteSupplier: (id: string) => void;
}

export default function SupplierManagement({ suppliers, onAddSupplier, onDeleteSupplier }: SupplierManagementProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    cnpj: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSupplier(formData);
    toast({ title: 'Fornecedor cadastrado', description: `${formData.name} foi adicionado com sucesso` });
    setFormData({
      code: '', name: '', cnpj: '', contact: '', email: '', phone: '',
      address: '', city: '', state: '', zipCode: '', active: true,
    });
  };

  const handleExport = () => {
    const exportData = suppliers.map(s => ({
      'Código': s.code,
      'Razão Social': s.name,
      'CNPJ': s.cnpj,
      'Contato': s.contact || '',
      'Email': s.email || '',
      'Telefone': s.phone || '',
      'Endereço': s.address || '',
      'Cidade': s.city || '',
      'Estado': s.state || '',
      'CEP': s.zipCode || '',
      'Status': s.active ? 'Ativo' : 'Inativo'
    }));
    exportToCSV(exportData, 'fornecedores');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Cadastro de Fornecedores</h2>
          <p className="text-muted-foreground mt-1">Gerencie os fornecedores do almoxarifado</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Fornecedores
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Fornecedor
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary">
              <Building2 className="h-4 w-4 mr-2" />
              Cadastrar Fornecedor
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Fornecedores Cadastrados</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono">{supplier.code}</TableCell>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell>{supplier.cnpj}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Mail className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{supplier.email || 'Email não informado'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Phone className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{supplier.phone || 'Telefone não informado'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {supplier.active ? (
                          <span className="text-success">Ativo</span>
                        ) : (
                          <span className="text-muted-foreground">Inativo</span>
                        )}
                        <Button
                          onClick={() => {
                            onDeleteSupplier(supplier.id);
                            toast({ title: 'Fornecedor removido', description: `${supplier.name} foi removido com sucesso` });
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