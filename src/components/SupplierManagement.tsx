import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Building2, Mail, Phone, Download, Trash2, Search, Users, Loader2 } from 'lucide-react';
import { Supplier } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { exportToCSV } from '@/lib/export';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  onDeleteSupplier: (id: string) => void;
}

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, '').substring(0, 14);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.substring(0, 2)}.${numbers.substring(2)}`;
  if (numbers.length <= 8)
    return `${numbers.substring(0, 2)}.${numbers.substring(2, 5)}.${numbers.substring(5)}`;
  if (numbers.length <= 12)
    return `${numbers.substring(0, 2)}.${numbers.substring(2, 5)}.${numbers.substring(5, 8)}/${numbers.substring(8)}`;
  return `${numbers.substring(0, 2)}.${numbers.substring(2, 5)}.${numbers.substring(5, 8)}/${numbers.substring(8, 12)}-${numbers.substring(12)}`;
};

const supplierSchema = z.object({
  code: z.string().trim().min(1, 'Código obrigatório').max(20),
  cnpj: z
    .string()
    .trim()
    .min(1, 'CNPJ obrigatório')
    .refine((v) => v.replace(/\D/g, '').length === 14, 'CNPJ deve ter 14 dígitos'),
  name: z.string().trim().min(2, 'Razão social obrigatória').max(150),
  tradeName: z.string().trim().max(150).optional().or(z.literal('')),
  contact: z.string().trim().max(100).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .max(150)
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export default function SupplierManagement({
  suppliers,
  onAddSupplier,
  onDeleteSupplier,
}: SupplierManagementProps) {
  const getNextSupplierCode = useMemo(
    () => () => {
      const existing = suppliers.map((s) => {
        const match = s.code.match(/FORN(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      const max = existing.length ? Math.max(...existing) : 0;
      return `FORN${String(max + 1).padStart(3, '0')}`;
    },
    [suppliers],
  );

  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [extra, setExtra] = useState({ address: '', city: '', state: '', zipCode: '' });

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: getNextSupplierCode(),
      cnpj: '',
      name: '',
      tradeName: '',
      contact: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.setValue('code', getNextSupplierCode());
    }
  }, [suppliers.length, getNextSupplierCode, form]);

  const onSubmit = async (values: SupplierFormValues) => {
    const cnpjNumbers = values.cnpj.replace(/\D/g, '');
    const existingSupplier = suppliers.find((s) => s.cnpj.replace(/\D/g, '') === cnpjNumbers);
    if (existingSupplier) {
      toast({
        title: 'Fornecedor já cadastrado',
        description: `Já existe um fornecedor com este CNPJ: ${existingSupplier.name}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await onAddSupplier({
        code: values.code,
        name: values.name,
        tradeName: values.tradeName || '',
        cnpj: values.cnpj,
        contact: values.contact || '',
        email: values.email || '',
        phone: values.phone || '',
        address: extra.address,
        city: extra.city,
        state: extra.state,
        zipCode: extra.zipCode,
        active: true,
      });
      toast({ title: 'Fornecedor cadastrado', description: `${values.name} foi adicionado com sucesso` });
      form.reset({
        code: getNextSupplierCode(),
        cnpj: '',
        name: '',
        tradeName: '',
        contact: '',
        phone: '',
        email: '',
      });
      setExtra({ address: '', city: '', state: '', zipCode: '' });
    } catch (error) {
      console.error('Erro ao cadastrar fornecedor:', error);
    }
  };

  const searchCNPJ = async () => {
    const cnpj = form.getValues('cnpj');
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      toast({
        title: 'CNPJ inválido',
        description: 'Digite um CNPJ completo para buscar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingCNPJ(true);
    try {
      const { data, error } = await supabase.functions.invoke('cnpj-lookup', {
        body: { cnpj: cnpj.replace(/\D/g, '') },
      });

      if (error) throw error;

      if (data) {
        if (data.razao_social) form.setValue('name', data.razao_social, { shouldDirty: true });
        if (data.nome_fantasia) form.setValue('tradeName', data.nome_fantasia, { shouldDirty: true });
        if (data.email) form.setValue('email', data.email, { shouldDirty: true });
        if (data.telefone) form.setValue('phone', data.telefone, { shouldDirty: true });
        setExtra({
          address: data.logradouro ? `${data.logradouro}, ${data.numero ?? ''}`.trim() : '',
          city: data.municipio ?? '',
          state: data.uf ?? '',
          zipCode: data.cep ?? '',
        });
        toast({
          title: 'Dados encontrados',
          description: 'As informações foram preenchidas automaticamente',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar os dados do CNPJ',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleExport = () => {
    const exportData = suppliers.map((s) => ({
      Código: s.code,
      'Razão Social': s.name,
      'Nome Fantasia': s.tradeName || '',
      CNPJ: s.cnpj,
      Contato: s.contact || '',
      Email: s.email || '',
      Telefone: s.phone || '',
      Endereço: s.address || '',
      Cidade: s.city || '',
      Estado: s.state || '',
      CEP: s.zipCode || '',
      Status: s.active ? 'Ativo' : 'Inativo',
    }));
    exportToCSV(exportData, 'fornecedores');
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(q) ||
      supplier.tradeName?.toLowerCase().includes(q) ||
      supplier.code.toLowerCase().includes(q) ||
      supplier.cnpj.includes(q) ||
      supplier.contact?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastro de Fornecedores"
        description="Gerencie os fornecedores do almoxarifado"
        icon={Users}
        tone="accent"
        actions={
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Fornecedor
          </h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input disabled className="bg-muted" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="00.000.000/0000-00"
                            value={field.value}
                            onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={searchCNPJ}
                          disabled={isLoadingCNPJ}
                        >
                          {isLoadingCNPJ ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input maxLength={150} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input maxLength={150} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato</FormLabel>
                      <FormControl>
                        <Input maxLength={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input maxLength={30} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" maxLength={150} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-primary"
                disabled={form.formState.isSubmitting}
              >
                <Building2 className="h-4 w-4 mr-2" />
                {form.formState.isSubmitting ? 'Salvando...' : 'Cadastrar Fornecedor'}
              </Button>
            </form>
          </Form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 gap-4">
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor cadastrado'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
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
                          <ConfirmDialog
                            title="Excluir fornecedor?"
                            description={`Tem certeza que deseja excluir "${supplier.name}"? Esta ação não pode ser desfeita.`}
                            confirmText="Excluir"
                            onConfirm={() => {
                              onDeleteSupplier(supplier.id);
                              toast({
                                title: 'Fornecedor removido',
                                description: `${supplier.name} foi removido com sucesso`,
                              });
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
