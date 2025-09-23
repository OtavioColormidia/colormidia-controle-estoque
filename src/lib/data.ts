import { Product, Supplier, StockMovement, Purchase } from '@/types/inventory';

// Initial sample data
export const initialProducts: Product[] = [
  {
    id: '1',
    code: 'MAT001',
    name: 'Papel A4',
    description: 'Papel sulfite A4 75g/m²',
    unit: 'Resma',
    category: 'Papelaria',
    minStock: 50,
    currentStock: 45,
    location: 'A1-P01',
    lastUpdated: new Date(),
  },
  {
    id: '2',
    code: 'MAT002',
    name: 'Caneta Esferográfica Azul',
    description: 'Caneta esferográfica azul 1.0mm',
    unit: 'Caixa',
    category: 'Papelaria',
    minStock: 20,
    currentStock: 8,
    location: 'A1-P02',
    lastUpdated: new Date(),
  },
  {
    id: '3',
    code: 'MAT003',
    name: 'Toner HP 85A',
    description: 'Cartucho de toner HP CE285A',
    unit: 'Unidade',
    category: 'Informática',
    minStock: 10,
    currentStock: 15,
    location: 'B2-I01',
    lastUpdated: new Date(),
  },
  {
    id: '4',
    code: 'MAT004',
    name: 'Mouse USB',
    description: 'Mouse óptico USB com fio',
    unit: 'Unidade',
    category: 'Informática',
    minStock: 15,
    currentStock: 25,
    location: 'B2-I02',
    lastUpdated: new Date(),
  },
  {
    id: '5',
    code: 'MAT005',
    name: 'Álcool 70%',
    description: 'Álcool etílico 70% 1L',
    unit: 'Litro',
    category: 'Limpeza',
    minStock: 30,
    currentStock: 12,
    location: 'C1-L01',
    lastUpdated: new Date(),
  },
];

export const initialSuppliers: Supplier[] = [
  {
    id: '1',
    code: 'FORN001',
    name: 'Papelaria Central LTDA',
    cnpj: '12.345.678/0001-90',
    contact: 'João Silva',
    email: 'contato@papelariacentral.com.br',
    phone: '(11) 3456-7890',
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    active: true,
  },
  {
    id: '2',
    code: 'FORN002',
    name: 'Tech Suprimentos ME',
    cnpj: '98.765.432/0001-10',
    contact: 'Maria Santos',
    email: 'vendas@techsuprimentos.com.br',
    phone: '(11) 9876-5432',
    address: 'Av. Tecnologia, 456',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '02345-678',
    active: true,
  },
  {
    id: '3',
    code: 'FORN003',
    name: 'Limpeza Total EIRELI',
    cnpj: '45.678.901/0001-23',
    contact: 'Pedro Oliveira',
    email: 'comercial@limpezatotal.com.br',
    phone: '(11) 2345-6789',
    address: 'Rua da Limpeza, 789',
    city: 'Guarulhos',
    state: 'SP',
    zipCode: '03456-789',
    active: true,
  },
];

export const initialMovements: StockMovement[] = [];

export const initialPurchases: Purchase[] = [];

export function getStockStatus(current: number, min: number): 'critical' | 'warning' | 'normal' {
  // Crítico: estoque atual abaixo do mínimo
  if (current < min) return 'critical';
  
  // Atenção: estoque atual até 10 itens acima do mínimo
  const threshold = min + 10;
  if (current <= threshold) return 'warning';
  
  // Normal: estoque acima de 10 itens do mínimo
  return 'normal';
}