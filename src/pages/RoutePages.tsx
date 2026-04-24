import { useNavigate } from 'react-router-dom';
import Dashboard from '@/components/Dashboard';
import InventoryControl from '@/components/InventoryControl';
import TrussControl from '@/components/TrussControl';
import MaterialEntry from '@/components/MaterialEntry';
import MaterialExit from '@/components/MaterialExit';
import ProductManagement from '@/components/ProductManagement';
import SupplierManagement from '@/components/SupplierManagement';
import Purchases from '@/components/Purchases';
import SupplierMaterials from '@/components/SupplierMaterials';
import UserManagement from '@/components/UserManagement';
import FormResponses from '@/components/FormResponses';
import LoadingState from '@/components/shared/LoadingState';
import { useSupabaseDataContext } from '@/contexts/SupabaseDataContext';

const tabToRoute: Record<string, string> = {
  dashboard: '/dashboard',
  inventory: '/estoque',
  'truss-control': '/trelica',
  entries: '/entradas',
  exits: '/saidas',
  purchases: '/compras',
  'form-responses': '/requisicoes',
  products: '/produtos',
  suppliers: '/fornecedores',
  'supplier-materials': '/fornecedores-materiais',
  users: '/usuarios',
};

function Pending() {
  return <LoadingState variant="page" />;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { products, movements, purchases, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return (
    <Dashboard
      products={products}
      movements={movements}
      purchases={purchases}
      onTabChange={(tab) => navigate(tabToRoute[tab] ?? '/dashboard')}
    />
  );
}

export function InventoryPage() {
  const { products, movements, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return <InventoryControl products={products} movements={movements} />;
}

export function TrussPage() {
  const { trusses, trussMovements, addTruss, deleteTruss, addTrussMovement, markAsReturned, loading } =
    useSupabaseDataContext();
  if (loading) return <Pending />;
  return (
    <TrussControl
      trusses={trusses}
      trussMovements={trussMovements}
      addTruss={addTruss}
      deleteTruss={deleteTruss}
      addTrussMovement={addTrussMovement}
      markAsReturned={markAsReturned}
    />
  );
}

export function EntriesPage() {
  const { products, suppliers, movements, addMovement, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return <MaterialEntry products={products} suppliers={suppliers} movements={movements} onAddMovement={addMovement} />;
}

export function ExitsPage() {
  const { products, movements, addMovement, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return <MaterialExit products={products} movements={movements} onAddMovement={addMovement} />;
}

export function ProductsPage() {
  const { products, addProduct, deleteProduct, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return <ProductManagement products={products} onAddProduct={addProduct} onDeleteProduct={deleteProduct} />;
}

export function SuppliersPage() {
  const { suppliers, addSupplier, deleteSupplier, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return <SupplierManagement suppliers={suppliers} onAddSupplier={addSupplier} onDeleteSupplier={deleteSupplier} />;
}

export function PurchasesPage() {
  const {
    purchases,
    products,
    suppliers,
    addPurchase,
    deletePurchase,
    updatePurchaseStatus,
    updatePurchase,
    loading,
  } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return (
    <Purchases
      purchases={purchases}
      products={products}
      suppliers={suppliers}
      onAddPurchase={addPurchase}
      onDeletePurchase={deletePurchase}
      onUpdatePurchaseStatus={updatePurchaseStatus}
      onUpdatePurchase={updatePurchase}
    />
  );
}

export function SupplierMaterialsPage() {
  const { suppliers, supplierMaterials, addSupplierMaterial, deleteSupplierMaterial, loading } =
    useSupabaseDataContext();
  if (loading) return <Pending />;
  return (
    <SupplierMaterials
      suppliers={suppliers}
      supplierMaterials={supplierMaterials}
      onAddSupplierMaterial={addSupplierMaterial}
      onDeleteSupplierMaterial={deleteSupplierMaterial}
    />
  );
}

export function FormResponsesPage() {
  const { suppliers, addPurchase, loading } = useSupabaseDataContext();
  if (loading) return <Pending />;
  return <FormResponses suppliers={suppliers} onAddPurchase={addPurchase} />;
}

export function UsersPage() {
  return <UserManagement />;
}
