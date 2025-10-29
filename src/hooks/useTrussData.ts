import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Truss {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  maxStock: number;
  currentStock: number;
  location?: string;
  lastUpdated: Date;
}

export interface TrussMovement {
  id: string;
  date: Date;
  createdAt?: Date;
  type: 'withdrawal' | 'return';
  trussId: string;
  trussName?: string;
  quantity: number;
  takenBy?: string;
  serviceDescription?: string;
  notes?: string;
  status: 'active' | 'returned';
}

export const useTrussData = () => {
  const [trusses, setTrusses] = useState<Truss[]>([]);
  const [trussMovements, setTrussMovements] = useState<TrussMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrusses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trusses')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedTrusses: Truss[] = (data || []).map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description || '',
        unit: item.unit,
        category: item.category,
        maxStock: Number(item.max_stock),
        currentStock: Number(item.current_stock),
        location: item.location,
        lastUpdated: new Date(item.last_updated),
      }));

      setTrusses(formattedTrusses);
    } catch (error: any) {
      console.error('Error loading trusses:', error);
      toast({
        title: "Erro ao carregar treliças",
        description: error.message,
        variant: "destructive",
      });
    }
  }, []);

  const loadTrussMovements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('truss_movements')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedMovements: TrussMovement[] = (data || []).map(item => ({
        id: item.id,
        date: new Date(item.date),
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        type: item.type as 'withdrawal' | 'return',
        trussId: item.truss_id || '',
        trussName: item.truss_name,
        quantity: Number(item.quantity),
        takenBy: item.taken_by,
        serviceDescription: item.service_description,
        notes: item.notes,
        status: item.status as 'active' | 'returned',
      }));

      setTrussMovements(formattedMovements);
    } catch (error: any) {
      console.error('Error loading truss movements:', error);
      toast({
        title: "Erro ao carregar movimentações",
        description: error.message,
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadTrusses(), loadTrussMovements()]);
      setLoading(false);
    };

    loadData();

    // Real-time subscriptions
    const trussChannel = supabase
      .channel('trusses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trusses' },
        () => loadTrusses()
      )
      .subscribe();

    const movementChannel = supabase
      .channel('truss-movements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'truss_movements' },
        () => loadTrussMovements()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(trussChannel);
      supabase.removeChannel(movementChannel);
    };
  }, [loadTrusses, loadTrussMovements]);

  const addTruss = async (truss: Omit<Truss, 'id' | 'lastUpdated'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('trusses').insert({
        code: truss.code,
        name: truss.name,
        description: truss.description,
        unit: truss.unit,
        category: truss.category,
        max_stock: truss.maxStock,
        current_stock: truss.currentStock,
        location: truss.location,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Treliça cadastrada",
        description: "Treliça cadastrada com sucesso!",
      });

      await loadTrusses();
    } catch (error: any) {
      console.error('Error adding truss:', error);
      toast({
        title: "Erro ao cadastrar treliça",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTruss = async (id: string) => {
    try {
      const { error } = await supabase.from('trusses').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: "Treliça excluída",
        description: "Treliça excluída com sucesso!",
      });

      await loadTrusses();
    } catch (error: any) {
      console.error('Error deleting truss:', error);
      toast({
        title: "Erro ao excluir treliça",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTrussMovement = async (movement: Omit<TrussMovement, 'id' | 'createdAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get current stock
      const { data: trussData, error: fetchError } = await supabase
        .from('trusses')
        .select('current_stock')
        .eq('id', movement.trussId)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = Number(trussData.current_stock);
      const newStock = movement.type === 'withdrawal' 
        ? currentStock - movement.quantity 
        : currentStock + movement.quantity;

      // Update stock
      const { error: updateError } = await supabase
        .from('trusses')
        .update({ current_stock: newStock })
        .eq('id', movement.trussId);

      if (updateError) throw updateError;

      // Add movement
      const { error: insertError } = await supabase.from('truss_movements').insert({
        date: movement.date.toISOString(),
        type: movement.type,
        truss_id: movement.trussId,
        truss_name: movement.trussName,
        quantity: movement.quantity,
        taken_by: movement.takenBy,
        service_description: movement.serviceDescription,
        notes: movement.notes,
        status: movement.status,
        created_by: user?.id,
      });

      if (insertError) throw insertError;

      toast({
        title: movement.type === 'withdrawal' ? 'Retirada registrada' : 'Devolução registrada',
        description: `Movimentação de treliça registrada com sucesso!`,
      });

      await Promise.all([loadTrusses(), loadTrussMovements()]);
    } catch (error: any) {
      console.error('Error adding truss movement:', error);
      toast({
        title: "Erro ao registrar movimentação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAsReturned = async (movementId: string, returnQuantity: number) => {
    try {
      const movement = trussMovements.find(m => m.id === movementId);
      if (!movement) throw new Error('Movimento não encontrado');

      // Update stock
      const { data: trussData, error: fetchError } = await supabase
        .from('trusses')
        .select('current_stock')
        .eq('id', movement.trussId)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = Number(trussData.current_stock);
      const newStock = currentStock + returnQuantity;

      const { error: updateError } = await supabase
        .from('trusses')
        .update({ current_stock: newStock })
        .eq('id', movement.trussId);

      if (updateError) throw updateError;

      // Mark movement as returned
      const { error: movementError } = await supabase
        .from('truss_movements')
        .update({ status: 'returned' })
        .eq('id', movementId);

      if (movementError) throw movementError;

      toast({
        title: "Devolução confirmada",
        description: "Treliça devolvida com sucesso!",
      });

      await Promise.all([loadTrusses(), loadTrussMovements()]);
    } catch (error: any) {
      console.error('Error marking as returned:', error);
      toast({
        title: "Erro ao confirmar devolução",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    trusses,
    trussMovements,
    loading,
    addTruss,
    deleteTruss,
    addTrussMovement,
    markAsReturned,
  };
};