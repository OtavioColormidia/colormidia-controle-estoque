export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  minStock: number;
  currentStock: number;
  location?: string;
  lastUpdated: Date;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  active: boolean;
}

export interface StockMovement {
  id: string;
  date: Date;
  createdAt?: Date;
  type: 'entry' | 'exit';
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  supplierId?: string;
  supplierName?: string;
  documentNumber?: string;
  requestedBy?: string;
  department?: string;
  reason?: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  date: Date;
  supplierId?: string;
  supplierName?: string;
  items: PurchaseItem[];
  totalValue: number;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  documentNumber?: string;
  notes?: string;
  expectedDeliveryDate?: Date;
}

export interface PurchaseItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type StockStatus = 'critical' | 'warning' | 'normal';

export interface DashboardMetrics {
  totalProducts: number;
  lowStockItems: number;
  totalValue: number;
  recentMovements: number;
  pendingPurchases: number;
  activeSuppliers: number;
}

export type UserRole = 'admin' | 'compras' | 'almoxarife';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  isAuthorized: boolean;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}