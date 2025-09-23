import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import InventoryControl from '@/components/InventoryControl';
import MaterialEntry from '@/components/MaterialEntry';
import MaterialExit from '@/components/MaterialExit';
import ProductManagement from '@/components/ProductManagement';
import SupplierManagement from '@/components/SupplierManagement';
import Purchases from '@/components/Purchases';
import { Loader2 } from 'lucide-react';
import { 
  initialProducts, 
  initialSuppliers, 
  initialMovements, 
  initialPurchases 
} from '@/lib/data';
import { Product, Supplier, StockMovement, Purchase } from '@/types/inventory';

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check authorization when session changes
        if (session?.user) {
          checkAuthorization(session.user.id);
        } else {
          setIsAuthorized(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAuthorization(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthorization = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_authorized")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error checking authorization:", error);
        setIsAuthorized(false);
      } else {
        setIsAuthorized(profile?.is_authorized || false);
      }
    } catch (error) {
      console.error("Error checking authorization:", error);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to auth if not logged in or not authorized
  if (!user || !isAuthorized) {
    navigate("/auth");
    return null;
  }

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

  const handleAddPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const newPurchase: Purchase = {
      ...purchase,
      id: Date.now().toString(),
    };
    setPurchases([...purchases, newPurchase]);
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
            products={products}
            suppliers={suppliers}
            onAddPurchase={handleAddPurchase}
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
