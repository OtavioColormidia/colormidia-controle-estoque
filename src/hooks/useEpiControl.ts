import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  name: string;
  cpf: string | null;
  role: string;
  hire_date: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Epi {
  id: string;
  name: string;
  ca_number: string | null;
  category: string | null;
  description: string | null;
  default_validity_months: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EpiDeliveryItem {
  id: string;
  delivery_id: string;
  epi_id: string | null;
  epi_name: string;
  ca_number: string | null;
  size: string | null;
  quantity: number;
  validity_months: number | null;
  expiration_date: string | null;
}

export interface EpiDelivery {
  id: string;
  employee_id: string | null;
  employee_name: string;
  employee_role: string | null;
  delivery_date: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  items?: EpiDeliveryItem[];
}

export function useEpiControl() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [epis, setEpis] = useState<Epi[]>([]);
  const [deliveries, setDeliveries] = useState<EpiDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [emp, epiRows, del, items] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('epis').select('*').order('name'),
      supabase.from('epi_deliveries').select('*').order('delivery_date', { ascending: false }),
      supabase.from('epi_delivery_items').select('*'),
    ]);
    if (emp.data) setEmployees(emp.data as Employee[]);
    if (epiRows.data) setEpis(epiRows.data as Epi[]);
    if (del.data) {
      const itemsByDelivery = new Map<string, EpiDeliveryItem[]>();
      (items.data ?? []).forEach((it: any) => {
        const arr = itemsByDelivery.get(it.delivery_id) ?? [];
        arr.push(it as EpiDeliveryItem);
        itemsByDelivery.set(it.delivery_id, arr);
      });
      setDeliveries(
        (del.data as any[]).map((d) => ({ ...(d as EpiDelivery), items: itemsByDelivery.get(d.id) ?? [] })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('epi-control-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epis' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epi_deliveries' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epi_delivery_items' }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // -------- Employees --------
  const addEmployee = async (payload: Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'active'> & { active?: boolean }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('employees').insert({
      name: payload.name,
      cpf: payload.cpf,
      role: payload.role,
      hire_date: payload.hire_date,
      phone: payload.phone,
      email: payload.email,
      notes: payload.notes,
      active: payload.active ?? true,
      created_by: session?.user.id,
    });
    if (error) { toast.error('Erro ao cadastrar funcionário: ' + error.message); return false; }
    toast.success('Funcionário cadastrado');
    return true;
  };

  const updateEmployee = async (id: string, payload: Partial<Employee>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('employees').update({ ...payload, updated_by: session?.user.id }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar funcionário: ' + error.message); return false; }
    toast.success('Funcionário atualizado');
    return true;
  };

  const deleteEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return false; }
    toast.success('Funcionário excluído');
    return true;
  };

  // -------- EPIs --------
  const addEpi = async (payload: Omit<Epi, 'id' | 'created_at' | 'updated_at' | 'active'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('epis').insert({
      name: payload.name,
      ca_number: payload.ca_number,
      category: payload.category,
      description: payload.description,
      default_validity_months: payload.default_validity_months ?? null,
      created_by: session?.user.id,
    });
    if (error) { toast.error('Erro ao cadastrar EPI: ' + error.message); return false; }
    toast.success('EPI cadastrado');
    return true;
  };

  const deleteEpi = async (id: string) => {
    const { error } = await supabase.from('epis').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir EPI: ' + error.message); return false; }
    toast.success('EPI excluído');
    return true;
  };

  // -------- Deliveries --------
  const addDelivery = async (
    payload: {
      employee_id: string | null;
      employee_name: string;
      employee_role: string | null;
      delivery_date: string;
      notes: string | null;
      items: { epi_id: string | null; epi_name: string; ca_number: string | null; size: string | null; quantity: number; validity_months: number | null; expiration_date: string | null }[];
    },
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('epi_deliveries')
      .insert({
        employee_id: payload.employee_id,
        employee_name: payload.employee_name,
        employee_role: payload.employee_role,
        delivery_date: payload.delivery_date,
        notes: payload.notes,
        status: 'delivered',
        created_by: session?.user.id,
      })
      .select()
      .single();
    if (error || !data) { toast.error('Erro ao registrar entrega: ' + error?.message); return false; }
    if (payload.items.length) {
      const { error: itemsErr } = await supabase.from('epi_delivery_items').insert(
        payload.items.map((it) => ({
          delivery_id: (data as any).id,
          epi_id: it.epi_id,
          epi_name: it.epi_name,
          ca_number: it.ca_number,
          size: it.size,
          quantity: it.quantity,
        })),
      );
      if (itemsErr) { toast.error('Erro ao salvar itens da entrega: ' + itemsErr.message); return false; }
    }
    toast.success('Entrega registrada');
    return true;
  };

  const deleteDelivery = async (id: string) => {
    const { error } = await supabase.from('epi_deliveries').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir entrega: ' + error.message); return false; }
    toast.success('Entrega excluída');
    return true;
  };

  return {
    employees, epis, deliveries, loading,
    addEmployee, updateEmployee, deleteEmployee,
    addEpi, deleteEpi,
    addDelivery, deleteDelivery,
    refresh: fetchAll,
  };
}
