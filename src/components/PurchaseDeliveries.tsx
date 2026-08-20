import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { PackageCheck, Search, ShieldAlert, Undo2, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import LoadingState from '@/components/shared/LoadingState';
import EmptyState from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeliveryPurchase {
  id: string;
  date: string;
  delivered_at: string | null;
  status: string;
  supplier_name: string | null;
  document_number: string | null;
  total_value: number;
  creator_name: string | null;
  items: { name: string; quantity: number }[];
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PurchaseDeliveries() {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<DeliveryPurchase[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'pending' | 'delivered'>('pending');
  const [target, setTarget] = useState<DeliveryPurchase | null>(null);
  const [when, setWhen] = useState(toLocalInput(new Date()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setIsAdmin(false);
      setCurrentUserId(user.id);
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      setIsAdmin(!!data?.some((r) => r.role === 'admin'));
    })();
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        id, date, delivered_at, status, supplier_name, document_number, total_value,
        supplier:suppliers(name),
        creator:profiles!purchases_created_by_fkey(display_name, email),
        purchase_items(quantity, product_name, product:products(name))
      `)
      .order('date', { ascending: false })
      .limit(300);

    if (error) {
      toast({ title: 'Erro ao carregar compras', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setPurchases(
      (data as any[])?.map((p) => ({
        id: p.id,
        date: p.date,
        delivered_at: p.delivered_at,
        status: p.status,
        supplier_name: p.supplier?.name || p.supplier_name || null,
        document_number: p.document_number,
        total_value: Number(p.total_value) || 0,
        creator_name: p.creator?.display_name || p.creator?.email?.split('@')[0] || null,
        items: (p.purchase_items ?? []).map((i: any) => ({
          name: i.product?.name || i.product_name || 'Item',
          quantity: Number(i.quantity) || 0,
        })),
      })) ?? []
    );
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAdmin) load();
    else if (isAdmin === false) setLoading(false);
  }, [isAdmin, load]);

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('purchase-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return purchases
      .filter((p) => (tab === 'delivered' ? !!p.delivered_at : !p.delivered_at))
      .filter((p) =>
        !term ||
        [p.supplier_name, p.creator_name, p.document_number, ...p.items.map((i) => i.name)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      );
  }, [purchases, tab, search]);

  const openMark = (p: DeliveryPurchase) => {
    setTarget(p);
    setWhen(toLocalInput(new Date()));
  };

  const confirmMark = async () => {
    if (!target) return;
    setSaving(true);
    const { error } = await supabase
      .from('purchases')
      .update({ delivered_at: new Date(when).toISOString(), status: 'delivered' })
      .eq('id', target.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao marcar entrega', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Pedido marcado como entregue' });
    setTarget(null);
    load();
  };

  const undo = async (p: DeliveryPurchase) => {
    const { error } = await supabase
      .from('purchases')
      .update({ delivered_at: null, status: 'approved' })
      .eq('id', p.id);
    if (error) {
      toast({ title: 'Erro ao desfazer', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Entrega desfeita' });
    load();
  };

  if (isAdmin === null || loading) return <LoadingState variant="page" />;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader icon={ShieldAlert} title="Recebimento de Pedidos" iconAccent="destructive" />
        <EmptyState
          icon={ShieldAlert}
          title="Acesso restrito"
          description="Somente administradores podem marcar pedidos como recebidos."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PackageCheck}
        title="Recebimento de Pedidos"
        description="Marque quando os pedidos da aba Compras chegaram"
        iconAccent="success"
      />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'pending' | 'delivered')}>
          <TabsList>
            <TabsTrigger value="pending">Aguardando ({purchases.filter((p) => !p.delivered_at).length})</TabsTrigger>
            <TabsTrigger value="delivered">Entregues ({purchases.filter((p) => !!p.delivered_at).length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fornecedor, item, NF ou usuário"
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={tab === 'pending' ? 'Nenhum pedido aguardando' : 'Nenhum pedido entregue'}
          description="Os pedidos criados na aba Compras aparecem aqui."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-semibold break-words min-w-0">{p.supplier_name || 'Fornecedor não informado'}</span>

                    {p.creator_name && <Badge variant="outline">{p.creator_name}</Badge>}
                    {p.document_number && <Badge variant="secondary">NF {p.document_number}</Badge>}
                    {p.delivered_at && (
                      <Badge className="bg-success/15 text-success hover:bg-success/15">
                        Entregue em {format(new Date(p.delivered_at), 'dd/MM/yyyy HH:mm')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pedido em {format(new Date(p.date), 'dd/MM/yyyy HH:mm')} ·{' '}
                    {p.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <ul className="text-sm text-muted-foreground">
                    {p.items.slice(0, 4).map((i, idx) => (
                      <li key={idx} className="break-words">
                        {i.quantity}x {i.name}
                      </li>
                    ))}
                    {p.items.length > 4 && <li className="text-xs">+{p.items.length - 4} item(ns)</li>}
                  </ul>
                </div>
                <div className="flex-shrink-0 w-full md:w-auto">
                  {p.delivered_at ? (
                    <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={() => undo(p)}>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Desfazer
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full md:w-auto" onClick={() => openMark(p)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Marcar como entregue
                    </Button>
                  )}
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar recebimento</DialogTitle>
            <DialogDescription>{target?.supplier_name || 'Pedido'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delivered-at">Data e hora da entrega</Label>
            <Input id="delivered-at" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button onClick={confirmMark} disabled={saving}>Confirmar entrega</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
