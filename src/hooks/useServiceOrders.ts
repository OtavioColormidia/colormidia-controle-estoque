import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ChecklistStatus = 'sim' | 'nao' | 'na';

export interface ChecklistItem {
  name: string;
  status: ChecklistStatus;
}

export interface ServiceOrder {
  id: string;
  date: string;
  employee_name: string;
  client_name: string | null;
  service_type: string;
  auxiliar_name: string | null;
  tools: ChecklistItem[];
  epis: ChecklistItem[];
  notes: string | null;
  status: string;
  delivered_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_TOOLS: ChecklistItem[] = [
  { name: 'Parafusadeira', status: 'na' },
  { name: 'Furadeira', status: 'na' },
  { name: 'Máquina de Solda', status: 'na' },
];

export const DEFAULT_EPIS: ChecklistItem[] = [
  { name: 'Luva PU Multitato', status: 'na' },
  { name: 'Luva Vaqueta', status: 'na' },
  { name: 'Cinto de Segurança', status: 'na' },
  { name: 'Talabarte', status: 'na' },
  { name: 'Óculos de Segurança', status: 'na' },
  { name: 'Protetor Auricular', status: 'na' },
  { name: 'Capacete com Jugular', status: 'na' },
  { name: 'Mosquetão e Fita de Ancoragem', status: 'na' },
];

export function useServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar ordens de serviço');
      return;
    }
    setOrders((data ?? []) as unknown as ServiceOrder[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel('service-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_orders' }, fetchOrders)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addOrder = async (
    payload: Omit<ServiceOrder, 'id' | 'created_at' | 'updated_at' | 'status' | 'delivered_at' | 'returned_at'> & {
      status?: string;
    }
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('service_orders').insert({
      date: payload.date,
      employee_name: payload.employee_name,
      client_name: payload.client_name,
      service_type: payload.service_type,
      auxiliar_name: payload.auxiliar_name,
      tools: payload.tools as unknown as never,
      epis: payload.epis as unknown as never,
      notes: payload.notes,
      status: payload.status ?? 'open',
      created_by: session?.user.id,
    });
    if (error) {
      toast.error('Erro ao criar ordem de serviço: ' + error.message);
      return false;
    }
    toast.success('Ordem de serviço criada com sucesso');
    return true;
  };

  const updateOrder = async (id: string, payload: Partial<ServiceOrder>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase
      .from('service_orders')
      .update({
        ...payload,
        tools: payload.tools as unknown as never,
        epis: payload.epis as unknown as never,
        updated_by: session?.user.id,
      })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return false;
    }
    toast.success('Ordem atualizada');
    return true;
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('service_orders').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return false;
    }
    toast.success('Ordem excluída');
    return true;
  };

  return { orders, loading, addOrder, updateOrder, deleteOrder, refresh: fetchOrders };
}
