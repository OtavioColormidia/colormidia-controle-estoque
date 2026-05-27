import { useMemo, useState } from 'react';
import { HardHat, Plus, Users, Shield, Trash2, FileDown, Search, Pencil, X, CalendarClock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { useEpiControl, type Employee } from '@/hooks/useEpiControl';
import { EMPLOYEE_ROLES, EPI_BY_ROLE, EPI_SIZES } from '@/lib/epiCatalog';
import { exportEpiDeliveryPDF } from '@/lib/epiDeliveryPdf';
import { toast } from 'sonner';

type DeliveryDraftItem = {
  epi_id: string | null;
  epi_name: string;
  ca_number: string | null;
  size: string;
  quantity: number;
  validity_months: number | null;
  expiration_date: string | null;
};

function addMonthsISO(dateISO: string, months: number): string {
  const d = new Date(dateISO + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function EpiControl() {
  const {
    employees, epis, deliveries, loading,
    addEmployee, updateEmployee, deleteEmployee,
    addEpi, deleteEpi,
    addDelivery, deleteDelivery,
  } = useEpiControl();

  // tab + search
  const [tab, setTab] = useState<'deliveries' | 'expirations' | 'employees' | 'epis'>('deliveries');
  const [search, setSearch] = useState('');

  // ---- Delivery dialog ----
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [delEmpId, setDelEmpId] = useState<string>('');
  const [delDate, setDelDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [delNotes, setDelNotes] = useState('');
  const [delItems, setDelItems] = useState<DeliveryDraftItem[]>([]);

  const openDelivery = () => {
    setDelEmpId('');
    setDelDate(new Date().toISOString().slice(0, 10));
    setDelNotes('');
    setDelItems([]);
    setDeliveryOpen(true);
  };

  const onEmployeeSelect = (id: string) => {
    setDelEmpId(id);
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    const suggested = EPI_BY_ROLE[emp.role] ?? [];
    const items: DeliveryDraftItem[] = suggested
      .map((name) => {
        const e = epis.find((x) => x.name === name);
        if (!e) return null;
        const months = e.default_validity_months ?? null;
        return {
          epi_id: e.id,
          epi_name: e.name,
          ca_number: e.ca_number,
          size: '',
          quantity: 1,
          validity_months: months,
          expiration_date: months ? addMonthsISO(delDate, months) : null,
        } as DeliveryDraftItem;
      })
      .filter((x): x is DeliveryDraftItem => !!x);
    setDelItems(items);
  };

  const addItemRow = () => {
    setDelItems((prev) => [...prev, { epi_id: null, epi_name: '', ca_number: null, size: '', quantity: 1, validity_months: null, expiration_date: null }]);
  };
  const updateItem = (idx: number, patch: Partial<DeliveryDraftItem>) => {
    setDelItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const removeItem = (idx: number) => setDelItems((prev) => prev.filter((_, i) => i !== idx));

  const onItemEpiChange = (idx: number, epiId: string) => {
    const e = epis.find((x) => x.id === epiId);
    if (!e) return;
    const months = e.default_validity_months ?? null;
    updateItem(idx, {
      epi_id: e.id,
      epi_name: e.name,
      ca_number: e.ca_number,
      validity_months: months,
      expiration_date: months ? addMonthsISO(delDate, months) : null,
    });
  };

  const onItemValidityChange = (idx: number, monthsStr: string) => {
    const months = monthsStr === '' ? null : Number(monthsStr);
    updateItem(idx, {
      validity_months: months,
      expiration_date: months && months > 0 ? addMonthsISO(delDate, months) : null,
    });
  };

  const submitDelivery = async () => {
    const emp = employees.find((e) => e.id === delEmpId);
    if (!emp) { toast.error('Selecione um funcionário'); return; }
    if (!delItems.length) { toast.error('Adicione pelo menos um EPI'); return; }
    if (delItems.some((it) => !it.epi_name || it.quantity <= 0)) {
      toast.error('Preencha todos os EPIs e quantidades');
      return;
    }
    const ok = await addDelivery({
      employee_id: emp.id,
      employee_name: emp.name,
      employee_role: emp.role,
      delivery_date: new Date(delDate + 'T12:00:00').toISOString(),
      notes: delNotes || null,
      items: delItems.map((it) => ({
        epi_id: it.epi_id,
        epi_name: it.epi_name,
        ca_number: it.ca_number,
        size: it.size || null,
        quantity: Number(it.quantity),
        validity_months: it.validity_months,
        expiration_date: it.expiration_date,
      })),
    });
    if (ok) setDeliveryOpen(false);
  };

  // ---- Employee dialog ----
  const [empOpen, setEmpOpen] = useState(false);
  const [empEdit, setEmpEdit] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState({
    name: '', cpf: '', role: '', hire_date: '', phone: '', email: '', notes: '', active: true,
  });
  const openEmp = (emp?: Employee) => {
    if (emp) {
      setEmpEdit(emp);
      setEmpForm({
        name: emp.name, cpf: emp.cpf ?? '', role: emp.role,
        hire_date: emp.hire_date ?? '', phone: emp.phone ?? '', email: emp.email ?? '',
        notes: emp.notes ?? '', active: emp.active,
      });
    } else {
      setEmpEdit(null);
      setEmpForm({ name: '', cpf: '', role: '', hire_date: '', phone: '', email: '', notes: '', active: true });
    }
    setEmpOpen(true);
  };
  const submitEmp = async () => {
    if (!empForm.name.trim()) { toast.error('Informe o nome'); return; }
    if (!empForm.role) { toast.error('Selecione o cargo'); return; }
    const payload = {
      name: empForm.name.trim(),
      cpf: empForm.cpf.trim() || null,
      role: empForm.role,
      hire_date: empForm.hire_date || null,
      phone: empForm.phone.trim() || null,
      email: empForm.email.trim() || null,
      notes: empForm.notes.trim() || null,
      active: empForm.active,
    };
    const ok = empEdit
      ? await updateEmployee(empEdit.id, payload)
      : await addEmployee(payload as any);
    if (ok) setEmpOpen(false);
  };

  // ---- EPI dialog ----
  const [epiOpen, setEpiOpen] = useState(false);
  const [epiForm, setEpiForm] = useState({ name: '', ca_number: '', category: '', description: '', default_validity_months: '' });
  const submitEpi = async () => {
    if (!epiForm.name.trim()) { toast.error('Informe o nome do EPI'); return; }
    const ok = await addEpi({
      name: epiForm.name.trim(),
      ca_number: epiForm.ca_number.trim() || null,
      category: epiForm.category.trim() || null,
      description: epiForm.description.trim() || null,
      default_validity_months: epiForm.default_validity_months ? Number(epiForm.default_validity_months) : null,
    });
    if (ok) { setEpiOpen(false); setEpiForm({ name: '', ca_number: '', category: '', description: '', default_validity_months: '' }); }
  };

  // ---- Confirms ----
  const [confirmDel, setConfirmDel] = useState<{ kind: 'employee' | 'epi' | 'delivery'; id: string; label: string } | null>(null);

  // ---- Filtering ----
  const filteredDeliveries = useMemo(() => {
    const q = search.toLowerCase();
    return deliveries.filter((d) =>
      !q ||
      d.employee_name.toLowerCase().includes(q) ||
      (d.employee_role ?? '').toLowerCase().includes(q) ||
      (d.items ?? []).some((it) => it.epi_name.toLowerCase().includes(q)),
    );
  }, [deliveries, search]);

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter((e) =>
      !q || e.name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || (e.cpf ?? '').includes(q),
    );
  }, [employees, search]);

  const filteredEpis = useMemo(() => {
    const q = search.toLowerCase();
    return epis.filter((e) =>
      !q || e.name.toLowerCase().includes(q) || (e.category ?? '').toLowerCase().includes(q) || (e.ca_number ?? '').toLowerCase().includes(q),
    );
  }, [epis, search]);

  // ---- Expirations ----
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const expirationRows = useMemo(() => {
    const rows: {
      key: string;
      employee_name: string;
      employee_role: string | null;
      epi_name: string;
      ca_number: string | null;
      size: string | null;
      quantity: number;
      delivery_date: string;
      expiration_date: string;
      daysLeft: number;
      status: 'expired' | 'soon' | 'ok';
    }[] = [];
    deliveries.forEach((d) => {
      (d.items ?? []).forEach((it) => {
        if (!it.expiration_date) return;
        const exp = new Date(it.expiration_date + 'T12:00:00');
        const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const status: 'expired' | 'soon' | 'ok' = diff < 0 ? 'expired' : diff <= 30 ? 'soon' : 'ok';
        rows.push({
          key: it.id,
          employee_name: d.employee_name,
          employee_role: d.employee_role,
          epi_name: it.epi_name,
          ca_number: it.ca_number,
          size: it.size,
          quantity: Number(it.quantity || 0),
          delivery_date: d.delivery_date,
          expiration_date: it.expiration_date,
          daysLeft: diff,
          status,
        });
      });
    });
    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [deliveries, today]);

  const filteredExpirations = useMemo(() => {
    const q = search.toLowerCase();
    return expirationRows.filter((r) =>
      !q ||
      r.employee_name.toLowerCase().includes(q) ||
      r.epi_name.toLowerCase().includes(q) ||
      (r.employee_role ?? '').toLowerCase().includes(q),
    );
  }, [expirationRows, search]);

  const expiredCount = expirationRows.filter((r) => r.status === 'expired').length;
  const soonCount = expirationRows.filter((r) => r.status === 'soon').length;

  if (loading) return <LoadingState variant="page" />;

  const totalItems = deliveries.reduce((s, d) => s + (d.items ?? []).reduce((a, it) => a + Number(it.quantity || 0), 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HardHat}
        iconAccent="warning"
        title="Controle de EPI"
        description="Entrega de Equipamentos de Proteção Individual conforme NR-06"
        actions={
          <Button onClick={openDelivery} className="gap-2">
            <Plus className="h-4 w-4" /> Nova entrega
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Shield} label="Entregas" value={deliveries.length} accent="primary" />
        <StatCard icon={HardHat} label="Itens entregues" value={totalItems} accent="warning" />
        <StatCard icon={Users} label="Funcionários" value={employees.filter((e) => e.active).length} hint={`${employees.length} cadastrados`} accent="success" />
        <StatCard icon={Shield} label="EPIs no catálogo" value={epis.length} accent="accent" />
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="expirations" className="gap-2">
            Vencimentos
            {expiredCount + soonCount > 0 && (
              <Badge variant="outline" className={expiredCount > 0 ? 'border-destructive/40 text-destructive' : 'border-warning/40 text-warning'}>
                {expiredCount + soonCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="employees">Funcionários</TabsTrigger>
          <TabsTrigger value="epis">Catálogo de EPIs</TabsTrigger>
        </TabsList>

        {/* ---------- DELIVERIES ---------- */}
        <TabsContent value="deliveries" className="mt-4">
          <Card className="overflow-hidden">
            {filteredDeliveries.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="Nenhuma entrega registrada"
                description="Registre a entrega de EPIs para começar o histórico de controle."
                action={<Button onClick={openDelivery} className="gap-2"><Plus className="h-4 w-4" /> Nova entrega</Button>}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>EPIs</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(d.delivery_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{d.employee_name}</TableCell>
                      <TableCell><Badge variant="secondary">{d.employee_role ?? '-'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {(d.items ?? []).map((it) => (
                            <Badge key={it.id} variant="outline" className="text-xs">
                              {it.epi_name}{it.quantity > 1 ? ` ×${it.quantity}` : ''}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => exportEpiDeliveryPDF(d)} title="Gerar ficha PDF">
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDel({ kind: 'delivery', id: d.id, label: `entrega de ${d.employee_name}` })}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ---------- EXPIRATIONS ---------- */}
        <TabsContent value="expirations" className="mt-4">
          <Card className="overflow-hidden">
            {filteredExpirations.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nenhum EPI com vencimento cadastrado"
                description="Informe a validade (meses) ao registrar a entrega para acompanhar os vencimentos."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>EPI</TableHead>
                    <TableHead>CA</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpirations.map((r) => {
                    const label = r.status === 'expired'
                      ? `Vencido há ${Math.abs(r.daysLeft)} d`
                      : r.daysLeft === 0
                        ? 'Vence hoje'
                        : `${r.daysLeft} dias restantes`;
                    const cls = r.status === 'expired'
                      ? 'bg-destructive/15 text-destructive border-destructive/30'
                      : r.status === 'soon'
                        ? 'bg-warning/15 text-warning border-warning/30'
                        : 'bg-success/15 text-success border-success/30';
                    return (
                      <TableRow key={r.key}>
                        <TableCell className="font-medium">
                          <div>{r.employee_name}</div>
                          {r.employee_role && <div className="text-xs text-muted-foreground">{r.employee_role}</div>}
                        </TableCell>
                        <TableCell>
                          {r.epi_name}
                          {r.size && <span className="text-xs text-muted-foreground"> · {r.size}</span>}
                          {r.quantity > 1 && <span className="text-xs text-muted-foreground"> ×{r.quantity}</span>}
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.ca_number ?? '-'}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {new Date(r.delivery_date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(r.expiration_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge className={cls}>
                            {r.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ---------- EMPLOYEES ---------- */}
        <TabsContent value="employees" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button onClick={() => openEmp()} className="gap-2"><Plus className="h-4 w-4" /> Novo funcionário</Button>
          </div>
          <Card className="overflow-hidden">
            {filteredEmployees.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum funcionário" description="Cadastre os funcionários para vincular EPIs." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell><Badge variant="secondary">{e.role}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{e.cpf ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{e.phone ?? '-'}</TableCell>
                      <TableCell>
                        {e.active
                          ? <Badge className="bg-success/15 text-success border-success/20">Ativo</Badge>
                          : <Badge variant="outline">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEmp(e)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDel({ kind: 'employee', id: e.id, label: e.name })}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ---------- EPIS ---------- */}
        <TabsContent value="epis" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button onClick={() => setEpiOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Novo EPI</Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead>CA</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Validade padrão</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEpis.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell><Badge variant="outline">{e.ca_number ?? '-'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{e.category ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{e.default_validity_months ? `${e.default_validity_months} meses` : '-'}</TableCell>
                    <TableCell className="text-muted-foreground max-w-md">{e.description ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDel({ kind: 'epi', id: e.id, label: e.name })}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ DELIVERY DIALOG ============ */}
      <Dialog open={deliveryOpen} onOpenChange={setDeliveryOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Entrega de EPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Funcionário *</Label>
                <Select value={delEmpId} onValueChange={onEmployeeSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.active).map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name} — {e.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data da entrega *</Label>
                <Input type="date" value={delDate} onChange={(e) => {
                  const newDate = e.target.value;
                  setDelDate(newDate);
                  setDelItems((prev) => prev.map((it) => ({
                    ...it,
                    expiration_date: it.validity_months && it.validity_months > 0 ? addMonthsISO(newDate, it.validity_months) : it.expiration_date,
                  })));
                }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>EPIs entregues</Label>
                <Button variant="outline" size="sm" onClick={addItemRow} className="gap-1">
                  <Plus className="h-3 w-3" /> Adicionar EPI
                </Button>
              </div>
              {delItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
                  Selecione um funcionário para sugerir os EPIs do cargo ou adicione manualmente.
                </p>
              ) : (
                <div className="space-y-2">
                  {delItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end p-2 rounded-md border bg-muted/30">
                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-xs">EPI</Label>
                        <Select value={it.epi_id ?? ''} onValueChange={(v) => onItemEpiChange(idx, v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {epis.map((e) => (
                              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label className="text-xs">CA</Label>
                        <Input value={it.ca_number ?? ''} onChange={(e) => updateItem(idx, { ca_number: e.target.value })} />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label className="text-xs">Tamanho</Label>
                        <Select value={it.size} onValueChange={(v) => updateItem(idx, { size: v })}>
                          <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            {EPI_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 md:col-span-1">
                        <Label className="text-xs">Qtd.</Label>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <Label className="text-xs" title="Validade em meses">Val. (m)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="-"
                          value={it.validity_months ?? ''}
                          onChange={(e) => onItemValidityChange(idx, e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <Label className="text-xs">Vence em</Label>
                        <Input
                          type="date"
                          value={it.expiration_date ?? ''}
                          onChange={(e) => updateItem(idx, { expiration_date: e.target.value || null })}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={delNotes}
                onChange={(e) => setDelNotes(e.target.value)}
                placeholder="Anotações sobre a entrega..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryOpen(false)}>Cancelar</Button>
            <Button onClick={submitDelivery}>Registrar entrega</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ EMPLOYEE DIALOG ============ */}
      <Dialog open={empOpen} onOpenChange={setEmpOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{empEdit ? 'Editar funcionário' : 'Novo funcionário'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Cargo *</Label>
              <Select value={empForm.role} onValueChange={(v) => setEmpForm({ ...empForm, role: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={empForm.cpf} onChange={(e) => setEmpForm({ ...empForm, cpf: e.target.value })} />
            </div>
            <div>
              <Label>Data de admissão</Label>
              <Input type="date" value={empForm.hire_date} onChange={(e) => setEmpForm({ ...empForm, hire_date: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>E-mail</Label>
              <Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={empForm.notes} onChange={(e) => setEmpForm({ ...empForm, notes: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="emp-active"
                type="checkbox"
                checked={empForm.active}
                onChange={(e) => setEmpForm({ ...empForm, active: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="emp-active" className="cursor-pointer">Funcionário ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpOpen(false)}>Cancelar</Button>
            <Button onClick={submitEmp}>{empEdit ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ EPI DIALOG ============ */}
      <Dialog open={epiOpen} onOpenChange={setEpiOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo EPI</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={epiForm.name} onChange={(e) => setEpiForm({ ...epiForm, name: e.target.value })} />
            </div>
            <div>
              <Label>CA</Label>
              <Input value={epiForm.ca_number} onChange={(e) => setEpiForm({ ...epiForm, ca_number: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={epiForm.category} onChange={(e) => setEpiForm({ ...epiForm, category: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Validade padrão (meses)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Ex.: 6"
                value={epiForm.default_validity_months}
                onChange={(e) => setEpiForm({ ...epiForm, default_validity_months: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Sugerido automaticamente ao entregar este EPI para um funcionário.
              </p>
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={2} value={epiForm.description} onChange={(e) => setEpiForm({ ...epiForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEpiOpen(false)}>Cancelar</Button>
            <Button onClick={submitEpi}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ CONFIRM DELETE ============ */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir {confirmDel?.label}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDel) return;
                if (confirmDel.kind === 'employee') await deleteEmployee(confirmDel.id);
                if (confirmDel.kind === 'epi') await deleteEpi(confirmDel.id);
                if (confirmDel.kind === 'delivery') await deleteDelivery(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
