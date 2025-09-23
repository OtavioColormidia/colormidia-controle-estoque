import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product, Supplier, StockMovement, Purchase } from "@/types/inventory";
import { toast } from "./use-toast";

export const useSupabaseData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadAllData();
    
    // Set up real-time subscriptions
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        handleProductChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        handleSupplierChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_movements'
        },
        handleMovementChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        handlePurchaseChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const loadProducts = async () => {
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
  };

  const loadSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    const formattedSuppliers: Supplier[] = data?.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
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
  };

  const loadMovements = async () => {
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
  };

  const loadPurchases = async () => {
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
      supplierName: p.supplier?.name,
      items: p.purchase_items?.map((item: any) => ({
        productId: item.product_id,
        productName: item.product?.name || '',
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
  };

  // Real-time handlers
  const handleProductChange = (payload: any) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      loadProducts();
    } else if (payload.eventType === 'DELETE') {
      setProducts(prev => prev.filter(p => p.id !== payload.old.id));
    }
  };

  const handleSupplierChange = (payload: any) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      loadSuppliers();
    } else if (payload.eventType === 'DELETE') {
      setSuppliers(prev => prev.filter(s => s.id !== payload.old.id));
    }
  };

  const handleMovementChange = (payload: any) => {
    loadMovements();
    loadProducts(); // Reload products to update stock
  };

  const handlePurchaseChange = (payload: any) => {
    loadPurchases();
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
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        code: supplier.code,
        name: supplier.name,
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
        supplier_name: movement.supplierName || null,
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

      await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', movement.productId);
    }

    toast({
      title: "Movimento registrado",
      description: "O movimento de estoque foi salvo no banco de dados."
    });
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
    refresh: loadAllData
  };
};