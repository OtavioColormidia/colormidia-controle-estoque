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
import { Plus, Building2, Mail, Phone, Download, Trash2, Search } from 'lucide-react';
import { Supplier } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';
import { exportToCSV } from '@/lib/export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  onDeleteSupplier: (id: string) => void;
}

export default function SupplierManagement({ suppliers, onAddSupplier, onDeleteSupplier }: SupplierManagementProps) {
  // Gerar próximo código automaticamente
  const getNextSupplierCode = () => {
    const existingCodes = suppliers.map(s => {
      const match = s.code.match(/FORN(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxNumber = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    return `FORN${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState({
    code: getNextSupplierCode(),
    name: '',
    tradeName: '',
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
  
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);

  const formatCNPJ = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 14 dígitos
    const truncated = numbers.substring(0, 14);
    
    // Aplica a formatação
    if (truncated.length <= 2) {
      return truncated;
    } else if (truncated.length <= 5) {
      return `${truncated.substring(0, 2)}.${truncated.substring(2)}`;
    } else if (truncated.length <= 8) {
      return `${truncated.substring(0, 2)}.${truncated.substring(2, 5)}.${truncated.substring(5)}`;
    } else if (truncated.length <= 12) {
      return `${truncated.substring(0, 2)}.${truncated.substring(2, 5)}.${truncated.substring(5, 8)}/${truncated.substring(8)}`;
    } else {
      return `${truncated.substring(0, 2)}.${truncated.substring(2, 5)}.${truncated.substring(5, 8)}/${truncated.substring(8, 12)}-${truncated.substring(12)}`;
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAddSupplier(formData);
      toast({ title: 'Fornecedor cadastrado', description: `${formData.name} foi adicionado com sucesso` });
      setFormData({
        code: getNextSupplierCode(), 
        name: '', 
        tradeName: '',
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
    } catch (error) {
      console.error('Erro ao cadastrar fornecedor:', error);
    }
  };
  
  const searchCNPJ = async () => {
    if (!formData.cnpj || formData.cnpj.length < 14) {
      toast({ 
        title: 'CNPJ inválido', 
        description: 'Digite um CNPJ completo para buscar',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoadingCNPJ(true);
    try {
      const { data, error } = await supabase.functions.invoke('cnpj-lookup', {
        body: { cnpj: formData.cnpj.replace(/\D/g, '') }
      });
      
      if (error) throw error;
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.razao_social || prev.name,
          tradeName: data.nome_fantasia || prev.tradeName,
          email: data.email || prev.email,
          phone: data.telefone || prev.phone,
          address: data.logradouro ? `${data.logradouro}, ${data.numero}` : prev.address,
          city: data.municipio || prev.city,
          state: data.uf || prev.state,
          zipCode: data.cep || prev.zipCode,
        }));
        toast({ 
          title: 'Dados encontrados', 
          description: 'As informações foram preenchidas automaticamente' 
        });
      }
    } catch (error) {
      toast({ 
        title: 'Erro na busca', 
        description: 'Não foi possível buscar os dados do CNPJ',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleExport = () => {
    const exportData = suppliers.map(s => ({
      'Código': s.code,
      'Razão Social': s.name,
      'Nome Fantasia': s.tradeName || '',
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
      <div>
        <h2 className="text-3xl font-bold text-foreground">Cadastro de Fornecedores</h2>
        <p className="text-muted-foreground mt-1">Gerencie os fornecedores do almoxarifado</p>
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
                <Input value={formData.code} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cnpj} 
                    onChange={handleCNPJChange} 
                    placeholder="00.000.000/0000-00"
                    required 
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="icon"
                    onClick={searchCNPJ}
                    disabled={isLoadingCNPJ}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={formData.tradeName} onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })} />
              </div>
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
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
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
                    <TableCell>{supplier.tradeName || '-'}</TableCell>
                    <TableCell>{supplier.cnpj}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{supplier.contact || '-'}</div>
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