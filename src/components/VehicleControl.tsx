import { useEffect, useMemo, useRef, useState } from 'react';
import { Car, Plus, Trash2, Camera, MapPin, Gauge, Calendar as CalendarIcon, Image as ImageIcon, X, Pencil, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string | null;
  year: number | null;
  color: string | null;
  renavam: string | null;
  notes: string | null;
  active: boolean;
}

interface VehicleTrip {
  id: string;
  vehicle_id: string | null;
  vehicle_label: string | null;
  driver_name: string;
  date: string;
  destination: string | null;
  km_start: number;
  km_end: number | null;
  km_total: number | null;
  odometer_start_url: string | null;
  odometer_end_url: string | null;
  notes: string | null;
  status: string;
}

const BUCKET = 'vehicle-odometer';

export default function VehicleControl() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<VehicleTrip[]>([]);
  const [tab, setTab] = useState<'trips' | 'vehicles'>('trips');

  const loadAll = async () => {
    const [{ data: v }, { data: t }] = await Promise.all([
      supabase.from('vehicles').select('*').order('plate'),
      supabase.from('vehicle_trips').select('*').order('date', { ascending: false }),
    ]);
    setVehicles((v ?? []) as Vehicle[]);
    setTrips((t ?? []) as VehicleTrip[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel('vehicle-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_trips' }, loadAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <LoadingState variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Car}
        title="Controle de Veículos"
        description="Registre viagens, quilometragem e gerencie a frota."
        iconAccent="primary"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'trips' | 'vehicles')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="trips">
            <MapPin className="h-4 w-4 mr-2" />
            Viagens
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Car className="h-4 w-4 mr-2" />
            Veículos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="space-y-4 mt-4">
          <TripsTab vehicles={vehicles} trips={trips} onChanged={loadAll} />
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4 mt-4">
          <VehiclesTab vehicles={vehicles} onChanged={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------- VEHICLES TAB ------------------------- */

function VehiclesTab({ vehicles, onChanged }: { vehicles: Vehicle[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ plate: '', model: '', brand: '', year: '', color: '', renavam: '', notes: '' });

    };
    if (editing) {
      const { error } = await supabase.from('vehicles').update(payload).eq('id', editing.id);
      if (error) {
        toast({ title: 'Erro ao atualizar veículo', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Veículo atualizado' });
    } else {
      const { error } = await supabase.from('vehicles').insert(payload);
      if (error) {
        toast({ title: 'Erro ao cadastrar veículo', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Veículo cadastrado' });
    }
    setOpen(false);
    resetForm();
    onChanged();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Veículo excluído' });
      onChanged();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Veículo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Veículo' : 'Cadastrar Veículo'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Placa *</Label>
                  <Input
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC-1D23"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label>Ano</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
              </div>
              <div>
                <Label>Modelo *</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Strada" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Marca</Label>
                  <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Fiat" />
                </div>
                <div>
                  <Label>Cor</Label>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Branco" />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState icon={Car} title="Nenhum veículo cadastrado" description="Cadastre o primeiro veículo da frota para começar a registrar viagens." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-sm">{v.plate}</Badge>
                      {!v.active && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <h3 className="font-semibold mt-2 truncate">{v.model}</h3>
                    <p className="text-xs text-muted-foreground">
                      {[v.brand, v.year, v.color].filter(Boolean).join(' • ') || 'Sem informações adicionais'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(v.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {v.notes && <p className="text-xs text-muted-foreground border-t pt-2">{v.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. As viagens deste veículo serão mantidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------- TRIPS TAB ------------------------- */

function TripsTab({ vehicles, trips, onChanged }: { vehicles: Vehicle[]; trips: VehicleTrip[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [finishing, setFinishing] = useState<VehicleTrip | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Viagem
        </Button>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhuma viagem registrada"
          description="Registre a primeira viagem informando motorista, veículo e KM de saída."
        />
      ) : (
        <div className="grid gap-3">
          {trips.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={t.status === 'completed' ? 'default' : 'warning'}>
                        {t.status === 'completed' ? 'Concluída' : 'Em andamento'}
                      </Badge>
                      <Badge variant="outline" className="font-mono">{t.vehicle_label || '—'}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(new Date(t.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{t.driver_name}</p>
                      {t.destination && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {t.destination}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                        Saída: <strong>{Number(t.km_start).toLocaleString('pt-BR')} km</strong>
                      </span>
                      {t.km_end != null && (
                        <>
                          <span className="flex items-center gap-1">
                            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                            Chegada: <strong>{Number(t.km_end).toLocaleString('pt-BR')} km</strong>
                          </span>
                          <span className="flex items-center gap-1 text-primary">
                            Rodado: <strong>{Number(t.km_total).toLocaleString('pt-BR')} km</strong>
                          </span>
                        </>
                      )}
                    </div>
                    {t.notes && <p className="text-xs text-muted-foreground border-t pt-2">{t.notes}</p>}
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    {t.odometer_start_url && (
                      <button
                        onClick={() => setPreviewUrl(t.odometer_start_url!)}
                        className="relative h-16 w-16 rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition"
                        title="Foto hodômetro saída"
                      >
                        <img src={t.odometer_start_url} alt="Hodômetro saída" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] py-0.5 text-center">SAÍDA</span>
                      </button>
                    )}
                    {t.odometer_end_url && (
                      <button
                        onClick={() => setPreviewUrl(t.odometer_end_url!)}
                        className="relative h-16 w-16 rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition"
                        title="Foto hodômetro chegada"
                      >
                        <img src={t.odometer_end_url} alt="Hodômetro chegada" className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] py-0.5 text-center">CHEGADA</span>
                      </button>
                    )}
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    {t.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => setFinishing(t)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Finalizar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewTripDialog open={open} onOpenChange={setOpen} vehicles={vehicles} onSaved={onChanged} />
      <FinishTripDialog trip={finishing} onOpenChange={(o) => !o && setFinishing(null)} onSaved={onChanged} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir viagem?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                const { error } = await supabase.from('vehicle_trips').delete().eq('id', deleteId);
                if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                else { toast({ title: 'Viagem excluída' }); onChanged(); }
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Foto do hodômetro</DialogTitle>
          </DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Hodômetro" className="w-full rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------- NEW TRIP DIALOG ------------------------- */

async function uploadOdometerPhoto(file: File, kind: 'start' | 'end'): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, { upsert: false, contentType: file.type });
  if (error) {
    toast({ title: 'Erro ao enviar foto', description: error.message, variant: 'destructive' });
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

function PhotoPicker({ label, file, setFile }: { label: string; file: File | null; setFile: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {preview ? (
        <div className="relative h-32 w-full rounded-md overflow-hidden border bg-muted">
          <img src={preview} alt={label} className="h-full w-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => setFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-32 w-full rounded-md border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition flex flex-col items-center justify-center gap-1 text-muted-foreground"
        >
          <Camera className="h-6 w-6" />
          <span className="text-xs">Tirar foto / Anexar</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function NewTripDialog({
  open,
  onOpenChange,
  vehicles,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicles: Vehicle[];
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driver, setDriver] = useState('');
  const [destination, setDestination] = useState('');
  const [kmStart, setKmStart] = useState('');
  const [notes, setNotes] = useState('');
  const [photoStart, setPhotoStart] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setVehicleId(''); setDriver(''); setDestination(''); setKmStart(''); setNotes(''); setPhotoStart(null);
  };

  const submit = async () => {
    if (!vehicleId || !driver.trim() || !kmStart) {
      toast({ title: 'Preencha veículo, motorista e KM de saída', variant: 'destructive' });
      return;
    }
    setSaving(true);
    let odometerUrl: string | null = null;
    if (photoStart) {
      odometerUrl = await uploadOdometerPhoto(photoStart, 'start');
      if (!odometerUrl) { setSaving(false); return; }
    }
    const v = vehicles.find((x) => x.id === vehicleId);
    const { error } = await supabase.from('vehicle_trips').insert({
      vehicle_id: vehicleId,
      vehicle_label: v ? `${v.plate} - ${v.model}` : null,
      driver_name: driver.trim(),
      destination: destination.trim() || null,
      km_start: parseFloat(kmStart),
      odometer_start_url: odometerUrl,
      notes: notes.trim() || null,
      status: 'in_progress',
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao registrar viagem', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Viagem registrada' });
    reset();
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Viagem</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label>Veículo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um veículo" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Cadastre um veículo primeiro</div>
                ) : (
                  vehicles.filter((v) => v.active).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} — {v.model}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motorista *</Label>
            <Input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Nome do motorista" />
          </div>
          <div>
            <Label>Destino</Label>
            <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Cliente / endereço / rota" />
          </div>
          <div>
            <Label>KM Saída *</Label>
            <Input type="number" step="0.1" value={kmStart} onChange={(e) => setKmStart(e.target.value)} placeholder="0" />
          </div>
          <PhotoPicker label="Foto do hodômetro (saída)" file={photoStart} setFile={setPhotoStart} />
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- FINISH TRIP DIALOG ------------------------- */

function FinishTripDialog({
  trip,
  onOpenChange,
  onSaved,
}: {
  trip: VehicleTrip | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [kmEnd, setKmEnd] = useState('');
  const [photoEnd, setPhotoEnd] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (trip) { setKmEnd(''); setPhotoEnd(null); }
  }, [trip]);

  if (!trip) return null;

  const submit = async () => {
    const kmEndNum = parseFloat(kmEnd);
    if (!kmEnd || isNaN(kmEndNum)) {
      toast({ title: 'Informe o KM de chegada', variant: 'destructive' });
      return;
    }
    if (kmEndNum < Number(trip.km_start)) {
      toast({ title: 'KM de chegada não pode ser menor que o de saída', variant: 'destructive' });
      return;
    }
    setSaving(true);
    let url: string | null = null;
    if (photoEnd) {
      url = await uploadOdometerPhoto(photoEnd, 'end');
      if (!url) { setSaving(false); return; }
    }
    const { error } = await supabase.from('vehicle_trips').update({
      km_end: kmEndNum,
      odometer_end_url: url ?? trip.odometer_end_url,
      status: 'completed',
    }).eq('id', trip.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Viagem finalizada' });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={!!trip} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Viagem</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="text-sm text-muted-foreground">
            <p><strong>Motorista:</strong> {trip.driver_name}</p>
            <p><strong>Veículo:</strong> {trip.vehicle_label}</p>
            <p><strong>KM Saída:</strong> {Number(trip.km_start).toLocaleString('pt-BR')} km</p>
          </div>
          <div>
            <Label>KM Chegada *</Label>
            <Input type="number" step="0.1" value={kmEnd} onChange={(e) => setKmEnd(e.target.value)} placeholder="0" />
          </div>
          <PhotoPicker label="Foto do hodômetro (chegada)" file={photoEnd} setFile={setPhotoEnd} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Salvando...' : 'Finalizar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
