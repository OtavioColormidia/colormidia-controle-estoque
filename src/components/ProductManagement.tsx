import { useEffect, useMemo } from 'react';
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
import { Plus, Trash2, Package, Boxes } from 'lucide-react';
import { Product } from '@/types/inventory';
import { toast } from '@/components/ui/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/layout/PageHeader';

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => Promise<void>;
  onDeleteProduct: (id: string) => void;
}

const productSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Código obrigatório')
    .max(20, 'Código muito longo'),
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(120, 'Nome muito longo'),
  description: z.string().trim().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
  category: z.string().min(1, 'Selecione uma categoria'),
  minStock: z.coerce.number({ invalid_type_error: 'Informe um número' }).min(0, 'Não pode ser negativo'),
  currentStock: z.coerce.number({ invalid_type_error: 'Informe um número' }).min(0, 'Não pode ser negativo'),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductManagement({
  products,
  onAddProduct,
  onDeleteProduct,
}: ProductManagementProps) {
  const getNextProductCode = useMemo(
    () => () => {
      const existing = products.map((p) => {
        const match = p.code.match(/MAT(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });
      const max = existing.length ? Math.max(...existing) : 0;
      return `MAT${String(max + 1).padStart(3, '0')}`;
    },
    [products],
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      code: getNextProductCode(),
      name: '',
      description: '',
      category: '',
      minStock: 0,
      currentStock: 0,
    },
  });

  // Atualiza próximo código quando a lista muda (após cadastro/deleção)
  useEffect(() => {
    if (!form.formState.isDirty) {
      form.setValue('code', getNextProductCode());
    }
  }, [products.length, getNextProductCode, form]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      await onAddProduct({
        code: values.code,
        name: values.name,
        description: values.description ?? '',
        unit: 'UN',
        category: values.category,
        minStock: values.minStock,
        currentStock: values.currentStock,
        location: '',
      });
      toast({ title: 'Produto cadastrado', description: `${values.name} foi adicionado com sucesso` });
      form.reset({
        code: getNextProductCode(),
        name: '',
        description: '',
        category: '',
        minStock: 0,
        currentStock: 0,
      });
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastro de Produtos"
        description="Gerencie os produtos do almoxarifado"
        icon={Boxes}
        tone="primary"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Produto
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
                        <Input maxLength={20} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Montagem">Montagem</SelectItem>
                          <SelectItem value="Adesivagem">Adesivagem</SelectItem>
                          <SelectItem value="Serralheria">Serralheria</SelectItem>
                          <SelectItem value="EPI">EPI</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input maxLength={120} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input maxLength={300} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Mínimo</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estoque Atual</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary"
                disabled={form.formState.isSubmitting}
              >
                <Package className="h-4 w-4 mr-2" />
                {form.formState.isSubmitting ? 'Salvando...' : 'Cadastrar Produto'}
              </Button>
            </form>
          </Form>
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
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        {product.currentStock}/{product.minStock}
                      </TableCell>
                      <TableCell>
                        <ConfirmDialog
                          title="Excluir produto?"
                          description={`Tem certeza que deseja excluir "${product.name}"? Esta ação não pode ser desfeita.`}
                          confirmText="Excluir"
                          onConfirm={() => onDeleteProduct(product.id)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
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
