import { useMemo, useState } from 'react';
import { HardHat, Plus, FileDown, Pencil, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  useServiceOrders,
  type ServiceOrder,
  type ChecklistItem,
  type ChecklistStatus,
  DEFAULT_TOOLS,
  DEFAULT_EPIS,
} from '@/hooks/useServiceOrders';
import { exportServiceOrderPDF } from '@/lib/serviceOrderPdf';
import { toast } from 'sonner';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

interface FormState {
  date: string;
  employee_name: string;
  client_name: string;
  service_type: string;
  auxiliar_name: string;
  notes: string;
  tools: ChecklistItem[];
  epis: ChecklistItem[];
}

const todayInput = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): FormState => ({
  date: todayInput(),
  employee_name: '',
  client_name: '',
  service_type: '',
  auxiliar_name: '',
  notes: '',
  tools: DEFAULT_TOOLS.map((t) => ({ ...t })),
  epis: DEFAULT_EPIS.map((e) => ({ ...e })),
});

function ChecklistEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: ChecklistItem[];
  onChange: (next: ChecklistItem[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<ChecklistItem>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  const addItem = () => onChange([...items, { name: '', status: 'na' }]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row gap-2 sm:items-center p-2 rounded-lg border border-border/60 bg-muted/30"
          >
            <Input
              value={item.name}
              onChange={(e) => updateItem(idx, { name: e.target.value })}
              placeholder="Nome do item"
              className="flex-1 h-9"
            />
            <ToggleGroup
              type="single"
              value={item.status}
              onValueChange={(v) => v && updateItem(idx, { status: v as ChecklistStatus })}
              className="justify-start"
            >
              <ToggleGroupItem value="sim" className="h-9 px-3 data-[state=on]:bg-success data-[state=on]:text-success-foreground">
                Sim
              </ToggleGroupItem>
              <ToggleGroupItem value="nao" className="h-9 px-3 data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground">
                Não
              </ToggleGroupItem>
              <ToggleGroupItem value="na" className="h-9 px-3 data-[state=on]:bg-muted-foreground/30">
                N/A
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(idx)}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-2">Nenhum item. Clique em Adicionar.</p>
        )}
      </div>
    </div>
  );
}

function statusBadge(items: ChecklistItem[]) {
  const yes = items.filter((i) => i.status === 'sim').length;
  return (
    <Badge variant="outline" className="font-mono">
      {yes}/{items.length}
    </Badge>
  );
}

export default function ServiceOrders() {
  const { orders, loading, addOrder, updateOrder, deleteOrder } = useServiceOrders();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.employee_name.toLowerCase().includes(q) ||
        o.service_type.toLowerCase().includes(q) ||
        (o.client_name ?? '').toLowerCase().includes(q) ||
        (o.auxiliar_name ?? '').toLowerCase().includes(q)
    );
  }, [orders, search]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (o: ServiceOrder) => {
    setEditing(o);
    setForm({
      date: o.date.slice(0, 10),
      employee_name: o.employee_name,
      client_name: o.client_name ?? '',
      service_type: o.service_type,
      auxiliar_name: o.auxiliar_name ?? '',
      notes: o.notes ?? '',
      tools: o.tools.map((t) => ({ ...t })),
      epis: o.epis.map((e) => ({ ...e })),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_name.trim() || !form.service_type.trim()) {
      toast.error('Preencha Funcionário e OS / Tipo de Serviço');
      return;
    }
    setSubmitting(true);
    const payload = {
      date: new Date(form.date).toISOString(),
      employee_name: form.employee_name.trim(),
      client_name: form.client_name.trim() || null,
      service_type: form.service_type.trim(),
      auxiliar_name: form.auxiliar_name.trim() || null,
      notes: form.notes.trim() || null,
      tools: form.tools.filter((t) => t.name.trim()),
      epis: form.epis.filter((e) => e.name.trim()),
    };
    const ok = editing
      ? await updateOrder(editing.id, payload)
      : await addOrder(payload);
    setSubmitting(false);
    if (ok) setDialogOpen(false);
  };

  const handleExport = async (o: ServiceOrder) => {
    try {
      await exportServiceOrderPDF(o);
    } catch (err) {
      toast.error('Erro ao gerar PDF');
      console.error(err);
    }
  };

  if (loading) return <LoadingState variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HardHat}
        title="Controle de Serviço"
        description="Checklist de Ferramentas e EPIs entregues por ordem de serviço"
        iconAccent="warning"
        actions={
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Serviço
          </Button>
        }
      />

      <Card className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por funcionário, cliente, OS..."
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={HardHat}
            title={orders.length === 0 ? 'Nenhuma ordem de serviço cadastrada' : 'Nenhum resultado encontrado'}
            description={orders.length === 0 ? 'Clique em "Novo Serviço" para criar a primeira.' : undefined}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>OS / Tipo de Serviço</TableHead>
                  <TableHead>Auxiliar</TableHead>
                  <TableHead className="text-center">Ferramentas</TableHead>
                  <TableHead className="text-center">EPIs</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{fmtDate(o.date)}</TableCell>
                    <TableCell className="font-medium">{o.employee_name}</TableCell>
                    <TableCell>{o.client_name || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{o.service_type}</TableCell>
                    <TableCell>{o.auxiliar_name || '-'}</TableCell>
                    <TableCell className="text-center">{statusBadge(o.tools)}</TableCell>
                    <TableCell className="text-center">{statusBadge(o.epis)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExport(o)}
                          title="Exportar PDF"
                          className="h-8 w-8"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(o)}
                          title="Editar"
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(o.id)}
                          title="Excluir"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do serviço e marque as ferramentas e EPIs entregues.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="employee">Funcionário *</Label>
                <Input
                  id="employee"
                  value={form.employee_name}
                  onChange={(e) => setForm({ ...form, employee_name: e.target.value })}
                  placeholder="Nome do funcionário"
                  required
                />
              </div>
              <div>
                <Label htmlFor="client">Cliente</Label>
                <Input
                  id="client"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <Label htmlFor="auxiliar">Auxiliar</Label>
                <Input
                  id="auxiliar"
                  value={form.auxiliar_name}
                  onChange={(e) => setForm({ ...form, auxiliar_name: e.target.value })}
                  placeholder="Nome do auxiliar"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="service">OS / Tipo de Serviço *</Label>
                <Input
                  id="service"
                  value={form.service_type}
                  onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                  placeholder="Ex: Instalação treliça evento XYZ"
                  required
                />
              </div>
            </div>

            {/* Ferramentas */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <ChecklistEditor
                title="Ferramentas"
                items={form.tools}
                onChange={(tools) => setForm({ ...form, tools })}
              />
            </div>

            {/* EPIs */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <ChecklistEditor
                title="EPI's"
                items={form.epis}
                onChange={(epis) => setForm({ ...form, epis })}
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações adicionais (opcional)"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar Ordem de Serviço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir Ordem de Serviço"
        description="Esta ação não pode ser desfeita. Tem certeza?"
        confirmText="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await deleteOrder(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
