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
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Purchase } from '@/types/inventory';

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Use Supabase data hook
  const {
    products,
    suppliers,
    movements,
    purchases,
    loading: dataLoading,
    addProduct,
    deleteProduct,
    addSupplier,
    deleteSupplier,
    addMovement,
    addPurchase
  } = useSupabaseData();

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
          setAuthLoading(false);
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
        setAuthLoading(false);
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
      setAuthLoading(false);
    }
  };

  // Show loading state
  if (authLoading || dataLoading) {
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
            onAddMovement={addMovement}
          />
        );
      case 'exits':
        return (
          <MaterialExit
            products={products}
            movements={movements}
            onAddMovement={addMovement}
          />
        );
      case 'products':
        return (
          <ProductManagement
            products={products}
            onAddProduct={addProduct}
            onDeleteProduct={deleteProduct}
          />
        );
      case 'suppliers':
        return (
          <SupplierManagement
            suppliers={suppliers}
            onAddSupplier={addSupplier}
            onDeleteSupplier={deleteSupplier}
          />
        );
      case 'purchases':
        return (
          <Purchases 
            purchases={purchases} 
            products={products}
            suppliers={suppliers}
            onAddPurchase={addPurchase}
            onDeletePurchase={(id: string) => {
              // Delete functionality will be handled in the backend
              console.log('Delete purchase:', id);
            }}
            onUpdatePurchaseStatus={(id: string, status: Purchase['status']) => {
              // Status update will be handled in the backend
              console.log('Update purchase status:', id, status);
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
