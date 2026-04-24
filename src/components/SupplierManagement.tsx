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
import { Plus, Building2, Mail, Phone, Download, Trash2, Search, Users, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Supplier } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import { supplierSchema, firstError } from '@/lib/validation/schemas';
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
  onUpdateSupplierLogo?: (supplierId: string, logoUrl: string | null) => Promise<void>;
}

export default function SupplierManagement({ suppliers, onAddSupplier, onDeleteSupplier, onUpdateSupplierLogo }: SupplierManagementProps) {
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
    logoUrl: '',
  });
  
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);

  const uploadLogoFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('supplier-logos')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from('supplier-logos').getPublicUrl(path);
    return data.publicUrl;
  };

  const validateImageFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem (PNG, JPG, SVG, WEBP).', variant: 'destructive' });
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Tamanho máximo: 2MB.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleEditExistingLogo = async (supplier: Supplier, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUpdateSupplierLogo) return;
    if (!validateImageFile(file)) return;

    setEditingLogoId(supplier.id);
    try {
      const url = await uploadLogoFile(file);
      await onUpdateSupplierLogo(supplier.id, url);
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar logo', description: err.message, variant: 'destructive' });
    } finally {
      setEditingLogoId(null);
    }
  };

  const handleRemoveExistingLogo = async (supplier: Supplier) => {
    if (!onUpdateSupplierLogo) return;
    setEditingLogoId(supplier.id);
    try {
      await onUpdateSupplierLogo(supplier.id, null);
    } catch (err: any) {
      toast({ title: 'Erro ao remover logo', description: err.message, variant: 'destructive' });
    } finally {
      setEditingLogoId(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem (PNG, JPG, SVG, WEBP).', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande', description: 'Tamanho máximo: 2MB.', variant: 'destructive' });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('supplier-logos')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('supplier-logos').getPublicUrl(path);
      setFormData(prev => ({ ...prev, logoUrl: data.publicUrl }));
      toast({ title: 'Logo carregada', description: 'A imagem foi enviada com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

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

    const parsed = supplierSchema.safeParse(formData);
    if (!parsed.success) {
      toast({
        title: 'Não foi possível salvar',
        description: firstError(parsed) ?? 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    // Verifica se já existe um fornecedor com o mesmo CNPJ
    const cnpjNumbers = formData.cnpj.replace(/\D/g, '');
    const existingSupplier = suppliers.find(s => s.cnpj.replace(/\D/g, '') === cnpjNumbers);

    if (existingSupplier) {
      toast({
        title: 'Fornecedor já cadastrado',
        description: `Já existe um fornecedor cadastrado com este CNPJ: ${existingSupplier.name}`,
        variant: 'destructive'
      });
      return;
    }

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
        logoUrl: '',
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

  // Filter suppliers by search query
  const filteredSuppliers = suppliers.filter(supplier => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.tradeName?.toLowerCase().includes(query) ||
      supplier.code.toLowerCase().includes(query) ||
      supplier.cnpj.includes(query) ||
      supplier.contact?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Cadastro de Fornecedores"
        description="Gerencie os fornecedores do almoxarifado"
      />

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
            <div className="space-y-2">
              <Label>Logo da empresa</Label>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-lg border bg-muted/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full pointer-events-none"
                      disabled={isUploadingLogo}
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploadingLogo ? 'Enviando...' : formData.logoUrl ? 'Trocar logo' : 'Enviar logo'}
                      </span>
                    </Button>
                  </label>
                  {formData.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, SVG ou WEBP. Máx 2MB.</p>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary">
              <Building2 className="h-4 w-4 mr-2" />
              Cadastrar Fornecedor
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Fornecedores Cadastrados</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>Nome Fantasia</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <label
                          className={`group relative h-10 w-10 rounded-md border bg-muted/40 flex items-center justify-center overflow-hidden ${onUpdateSupplierLogo ? 'cursor-pointer hover:border-primary' : ''}`}
                          title={onUpdateSupplierLogo ? (supplier.logoUrl ? 'Trocar logo' : 'Adicionar logo') : undefined}
                        >
                          {supplier.logoUrl ? (
                            <img src={supplier.logoUrl} alt={supplier.name} className="h-full w-full object-contain" />
                          ) : (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          )}
                          {onUpdateSupplierLogo && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              {editingLogoId === supplier.id ? (
                                <span className="text-[10px] text-white font-medium">...</span>
                              ) : (
                                <Upload className="h-4 w-4 text-white" />
                              )}
                            </div>
                          )}
                          {onUpdateSupplierLogo && (
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={editingLogoId === supplier.id}
                              onChange={(e) => handleEditExistingLogo(supplier, e)}
                            />
                          )}
                        </label>
                        {onUpdateSupplierLogo && supplier.logoUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={editingLogoId === supplier.id}
                            onClick={() => handleRemoveExistingLogo(supplier)}
                            title="Remover logo"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
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
                        <ConfirmDialog
                          title="Excluir fornecedor?"
                          description={`Tem certeza que deseja excluir "${supplier.name}"? Esta ação não pode ser desfeita.`}
                          confirmText="Excluir"
                          onConfirm={() => {
                            onDeleteSupplier(supplier.id);
                            toast({ title: 'Fornecedor removido', description: `${supplier.name} foi removido com sucesso` });
                          }}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                     </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}