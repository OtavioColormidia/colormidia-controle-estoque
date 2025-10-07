import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Supplier, StockMovement, Purchase } from "@/types/inventory";
import { toast } from "./use-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const useSupabaseData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    const formattedProducts: Product[] = data?.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description || '',
      unit: p.unit,
      category: p.category,
      minStock: Number(p.min_stock),
      currentStock: Number(p.current_stock),
      location: p.location || undefined,
      lastUpdated: new Date(p.last_updated)
    })) || [];
    
    setProducts(formattedProducts);
  }, []);

  const loadSuppliers = useCallback(async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    const formattedSuppliers: Supplier[] = data?.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      tradeName: s.trade_name || '',
      cnpj: s.cnpj,
      contact: s.contact || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      zipCode: s.zip_code || '',
      active: s.active
    })) || [];
    
    setSuppliers(formattedSuppliers);
  }, []);

  const loadMovements = useCallback(async () => {
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(name),
        supplier:suppliers(name)
      `)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    const formattedMovements: StockMovement[] = data?.map(m => ({
      id: m.id,
      date: new Date(m.date),
      type: m.type as 'entry' | 'exit',
      productId: m.product_id,
      productName: m.product?.name,
      quantity: Number(m.quantity),
      unitPrice: m.unit_price ? Number(m.unit_price) : undefined,
      totalValue: m.total_value ? Number(m.total_value) : undefined,
      supplierId: m.supplier_id || undefined,
      supplierName: m.supplier?.name,
      documentNumber: m.document_number || undefined,
      requestedBy: m.requested_by || undefined,
      department: m.department || undefined,
      reason: m.reason || undefined,
      notes: m.notes || undefined
    })) || [];
    
    setMovements(formattedMovements);
  }, []);

  const loadPurchases = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        supplier:suppliers(name),
        purchase_items(
          *,
          product:products(name)
        )
      `)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    const formattedPurchases: Purchase[] = data?.map(p => ({
      id: p.id,
      date: new Date(p.date),
      supplierId: p.supplier_id,
      supplierName: p.supplier?.name || p.supplier_name,
      items: p.purchase_items?.map((item: any) => ({
        productId: item.product_id,
        productName: item.product?.name || item.product_name || '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price)
      })) || [],
      totalValue: Number(p.total_value),
      status: p.status as 'pending' | 'approved' | 'delivered' | 'cancelled',
      documentNumber: p.document_number || undefined,
      notes: p.notes || undefined
    })) || [];
    
    setPurchases(formattedPurchases);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadProducts(),
          loadSuppliers(),
          loadMovements(),
          loadPurchases()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Verifique sua conexão e tente novamente.",
          variant: "destructive"
        });
      }
      setLoading(false);
    };

    loadAllData();

    // Set up real-time subscriptions with stable handlers + broadcast sync
    const channel = supabase.channel('inventory-changes');
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Real-time: products changed');
          loadProducts();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers' },
        () => {
          console.log('Real-time: suppliers changed');
          loadSuppliers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_movements' },
        () => {
          console.log('Real-time: stock_movements changed');
          loadMovements();
          loadProducts(); // Update stock
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        () => {
          console.log('Real-time: purchases changed');
          loadPurchases();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_items' },
        () => {
          console.log('Real-time: purchase_items changed');
          loadPurchases();
        }
      )
      .on('broadcast', { event: 'refresh-data' }, () => {
        console.log('Broadcast: refresh-data received');
        // Fallback: ensure all lists reload
        loadProducts();
        loadSuppliers();
        loadMovements();
        loadPurchases();
      })
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [loadProducts, loadSuppliers, loadMovements, loadPurchases]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadSuppliers(),
        loadMovements(),
        loadPurchases()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Verifique sua conexão e tente novamente.",
        variant: "destructive"
      });
    }
    setLoading(false);
  }, [loadProducts, loadSuppliers, loadMovements, loadPurchases]);
  const broadcastRefresh = () => {
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'refresh-data',
        payload: { ts: Date.now() }
      });
    } catch (e) {
      console.error('Broadcast send error', e);
    }
  };

  // CRUD Operations
  const addProduct = async (product: Omit<Product, 'id' | 'lastUpdated'>) => {
    const { data, error } = await supabase
      .from('products')
      .insert({
        code: product.code,
        name: product.name,
        description: product.description,
        unit: product.unit,
        category: product.category,
        min_stock: product.minStock,
        current_stock: product.currentStock,
        location: product.location,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao adicionar produto",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "Produto adicionado",
      description: "O produto foi salvo no banco de dados."
    });
    await loadProducts();
    broadcastRefresh();
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "Produto excluído",
      description: "O produto foi removido do banco de dados."
    });
    await loadProducts();
    broadcastRefresh();
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        code: supplier.code,
        name: supplier.name,
        trade_name: supplier.tradeName,
        cnpj: supplier.cnpj,
        contact: supplier.contact,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        zip_code: supplier.zipCode,
        active: supplier.active,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao adicionar fornecedor",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "Fornecedor adicionado",
      description: "O fornecedor foi salvo no banco de dados."
    });
    await loadSuppliers();
    broadcastRefresh();
  };

  const deleteSupplier = async (supplierId: string) => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId);

    if (error) {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "Fornecedor excluído",
      description: "O fornecedor foi removido do banco de dados."
    });
    await loadSuppliers();
    broadcastRefresh();
  };

  const addMovement = async (movement: Omit<StockMovement, 'id'>) => {
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        date: movement.date.toISOString(),
        type: movement.type,
        product_id: movement.productId || null,
        product_name: movement.productName || null,
        quantity: movement.quantity,
        unit_price: movement.unitPrice,
        total_value: movement.totalValue,
        supplier_id: movement.supplierId || null,
        // supplier_name removed - this column doesn't exist in the database
        document_number: movement.documentNumber,
        requested_by: movement.requestedBy,
        department: movement.department,
        reason: movement.reason,
        notes: movement.notes,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro ao adicionar movimento",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    // Update product stock
    const product = products.find(p => p.id === movement.productId);
    if (product) {
      const newStock = movement.type === 'entry' 
        ? product.currentStock + movement.quantity 
        : product.currentStock - movement.quantity;

      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', movement.productId);
      
      if (updateError) {
        toast({
          title: "Erro ao atualizar estoque",
          description: updateError.message,
          variant: "destructive"
        });
        throw updateError;
      }
    }

    toast({
      title: "Movimento registrado",
      description: "O movimento de estoque foi salvo no banco de dados."
    });
    await loadMovements();
    await loadProducts();
    broadcastRefresh();
  };

  const addPurchase = async (purchase: Omit<Purchase, 'id'>) => {
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        date: purchase.date.toISOString(),
        supplier_id: purchase.supplierId || null,
        supplier_name: purchase.supplierName || null,
        total_value: purchase.totalValue,
        status: purchase.status,
        document_number: purchase.documentNumber,
        notes: purchase.notes,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (purchaseError) {
      toast({
        title: "Erro ao adicionar compra",
        description: purchaseError.message,
        variant: "destructive"
      });
      throw purchaseError;
    }

    // Add purchase items
    if (purchaseData && purchase.items.length > 0) {
      const items = purchase.items.map(item => ({
        purchase_id: purchaseData.id,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(items);

      if (itemsError) {
        toast({
          title: "Erro ao adicionar itens da compra",
          description: itemsError.message,
          variant: "destructive"
        });
        throw itemsError;
      }
    }

    toast({
      title: "Compra adicionada",
      description: "A compra foi salva no banco de dados."
    });
    await loadPurchases();
    broadcastRefresh();
  };

  const deletePurchase = async (purchaseId: string) => {
    // First delete the purchase items
    const { error: itemsError } = await supabase
      .from('purchase_items')
      .delete()
      .eq('purchase_id', purchaseId);

    if (itemsError) {
      toast({
        title: "Erro ao excluir itens da compra",
        description: itemsError.message,
        variant: "destructive"
      });
      throw itemsError;
    }

    // Then delete the purchase
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', purchaseId);

    if (error) {
      toast({
        title: "Erro ao excluir compra",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    toast({
      title: "Compra excluída",
      description: "A compra foi removida do banco de dados."
    });
    await loadPurchases();
    broadcastRefresh();
  };

  const updatePurchaseStatus = async (purchaseId: string, status: Purchase['status']) => {
    const { error } = await supabase
      .from('purchases')
      .update({ 
        status,
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', purchaseId);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }

    // Reload purchases to update the UI
    await loadPurchases();

    toast({
      title: "Status atualizado",
      description: "O status da compra foi atualizado com sucesso."
    });
    broadcastRefresh();
  };

  return {
    products,
    suppliers,
    movements,
    purchases,
    loading,
    addProduct,
    deleteProduct,
    addSupplier,
    deleteSupplier,
    addMovement,
    addPurchase,
    deletePurchase,
    updatePurchaseStatus,
    refresh
  };
};