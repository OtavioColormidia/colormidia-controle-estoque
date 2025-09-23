import { useState } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import InventoryControl from '@/components/InventoryControl';
import MaterialEntry from '@/components/MaterialEntry';
import MaterialExit from '@/components/MaterialExit';
import ProductManagement from '@/components/ProductManagement';
import SupplierManagement from '@/components/SupplierManagement';
import Purchases from '@/components/Purchases';
import { 
  initialProducts, 
  initialSuppliers, 
  initialMovements, 
  initialPurchases 
} from '@/lib/data';
import { Product, Supplier, StockMovement, Purchase } from '@/types/inventory';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);

  const handleAddProduct = (product: Omit<Product, 'id' | 'lastUpdated'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      lastUpdated: new Date(),
    };
    setProducts([...products, newProduct]);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleAddSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: Date.now().toString(),
    };
    setSuppliers([...suppliers, newSupplier]);
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
  };

  const handleAddMovement = (movement: Omit<StockMovement, 'id'>) => {
    const newMovement: StockMovement = {
      ...movement,
      id: Date.now().toString(),
    };
    setMovements([newMovement, ...movements]);

    // Update product stock
    const productIndex = products.findIndex(p => p.id === movement.productId);
    if (productIndex !== -1) {
      const updatedProducts = [...products];
      if (movement.type === 'entry') {
        updatedProducts[productIndex].currentStock += movement.quantity;
      } else {
        updatedProducts[productIndex].currentStock -= movement.quantity;
      }
      updatedProducts[productIndex].lastUpdated = new Date();
      setProducts(updatedProducts);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard products={products} movements={movements} />;
      case 'inventory':
        return <InventoryControl products={products} />;
      case 'entries':
        return (
          <MaterialEntry
            products={products}
            suppliers={suppliers}
            movements={movements}
            onAddMovement={handleAddMovement}
          />
        );
      case 'exits':
        return (
          <MaterialExit
            products={products}
            movements={movements}
            onAddMovement={handleAddMovement}
          />
        );
      case 'products':
        return (
          <ProductManagement
            products={products}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        );
      case 'suppliers':
        return (
          <SupplierManagement
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        );
      case 'purchases':
        return (
          <Purchases 
            purchases={purchases} 
            onDeletePurchase={(id: string) => setPurchases(purchases.filter(p => p.id !== id))}
            onUpdatePurchaseStatus={(id: string, status: Purchase['status']) => {
              setPurchases(purchases.map(p => 
                p.id === id ? { ...p, status } : p
              ));
            }}
          />
        );
      default:
        return <Dashboard products={products} movements={movements} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
