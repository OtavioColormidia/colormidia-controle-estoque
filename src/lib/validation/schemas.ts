import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Produto                                                             */
/* ------------------------------------------------------------------ */
export const productSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Código é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres'),
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres'),
  description: z.string().trim().max(500, 'Descrição muito longa').optional().or(z.literal('')),
  category: z.string().trim().min(1, 'Selecione uma categoria'),
  minStock: z
    .number({ message: 'Estoque mínimo inválido' })
    .int('Use um número inteiro')
    .min(0, 'Estoque mínimo não pode ser negativo'),
  currentStock: z
    .number({ message: 'Estoque atual inválido' })
    .int('Use um número inteiro')
    .min(0, 'Estoque atual não pode ser negativo'),
});
export type ProductInput = z.infer<typeof productSchema>;

/* ------------------------------------------------------------------ */
/* Fornecedor                                                          */
/* ------------------------------------------------------------------ */
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export const supplierSchema = z.object({
  code: z.string().trim().min(1, 'Código é obrigatório').max(50),
  name: z
    .string()
    .trim()
    .min(2, 'Razão social deve ter no mínimo 2 caracteres')
    .max(150, 'Razão social muito longa'),
  tradeName: z.string().trim().max(150).optional().or(z.literal('')),
  cnpj: z
    .string()
    .trim()
    .regex(cnpjRegex, 'CNPJ deve estar no formato 00.000.000/0000-00'),
  contact: z.string().trim().max(100).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .max(255)
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(2).optional().or(z.literal('')),
  zipCode: z.string().trim().max(10).optional().or(z.literal('')),
  active: z.boolean().default(true),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

/* ------------------------------------------------------------------ */
/* Pedido de compra (cabeçalho)                                        */
/* ------------------------------------------------------------------ */
export const purchaseHeaderSchema = z.object({
  supplierId: z.string().min(1, 'Selecione um fornecedor'),
  supplierName: z.string().min(1),
  documentNumber: z.string().trim().max(50).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const purchaseItemSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(1, 'Informe o nome do produto')
    .max(200, 'Nome do produto muito longo'),
  quantity: z
    .number({ message: 'Quantidade inválida' })
    .positive('Quantidade deve ser maior que zero'),
  unitPrice: z
    .number({ message: 'Preço unitário inválido' })
    .min(0, 'Preço não pode ser negativo'),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
/**
 * Returns first validation error message from a Zod safeParse result, or null.
 */
export function firstError(result: z.ZodSafeParseResult<unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? 'Dados inválidos';
}
