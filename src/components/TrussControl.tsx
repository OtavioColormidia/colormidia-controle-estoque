import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Package, ArrowDownToLine, ArrowUpFromLine, CheckCircle } from 'lucide-react';
import { useTrussData, Truss, TrussMovement } from '@/hooks/useTrussData';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const TrussControl = () => {
  const { trusses, trussMovements, loading, addTruss, deleteTruss, addTrussMovement, markAsReturned } = useTrussData();

  // Truss registration form
  const [trussForm, setTrussForm] = useState({
    code: '',
    name: '',
    unit: 'unidade',
    category: '',
    maxStock: 0,
    currentStock: 0,
  });

  // Withdrawal form
  const [withdrawalItems, setWithdrawalItems] = useState<Array<{ trussId: string; trussName: string; quantity: number }>>([]);
  const [selectedTruss, setSelectedTruss] = useState('');
  const [quantity, setQuantity] = useState('');
  const [takenBy, setTakenBy] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  const handleAddTruss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trussForm.code || !trussForm.name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o código e nome da treliça.",
        variant: "destructive",
      });
      return;
    }

    await addTruss(trussForm);
    setTrussForm({
      code: '',
      name: '',
      unit: 'unidade',
      category: '',
      maxStock: 0,
      currentStock: 0,
    });
  };

  const handleAddToWithdrawal = () => {
    if (!selectedTruss || !quantity) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma treliça e informe a quantidade.",
        variant: "destructive",
      });
      return;
    }

    const truss = trusses.find(t => t.id === selectedTruss);
    if (!truss) return;

    if (Number(quantity) > truss.currentStock) {
      toast({
        title: "Estoque insuficiente",
        description: `Estoque disponível: ${truss.currentStock} ${truss.unit}`,
        variant: "destructive",
      });
      return;
    }

    setWithdrawalItems([
      ...withdrawalItems,
      {
        trussId: truss.id,
        trussName: truss.name,
        quantity: Number(quantity),
      },
    ]);

    setSelectedTruss('');
    setQuantity('');
  };

  const handleConfirmWithdrawal = async () => {
    if (withdrawalItems.length === 0) {
      toast({
        title: "Nenhum item",
        description: "Adicione pelo menos um item para retirada.",
        variant: "destructive",
      });
      return;
    }

    if (!takenBy) {
      toast({
        title: "Campo obrigatório",
        description: "Informe quem retirou as treliças.",
        variant: "destructive",
      });
      return;
    }

    for (const item of withdrawalItems) {
      await addTrussMovement({
        date: new Date(),
        type: 'withdrawal',
        trussId: item.trussId,
        trussName: item.trussName,
        quantity: item.quantity,
        takenBy,
        serviceDescription,
        notes: withdrawalNotes,
        status: 'active',
      });
    }

    setWithdrawalItems([]);
    setTakenBy('');
    setServiceDescription('');
    setWithdrawalNotes('');
  };

  const handleReturn = async (movementId: string) => {
    const movement = trussMovements.find(m => m.id === movementId);
    if (!movement) return;

    await markAsReturned(movementId, movement.quantity);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Controle de Treliças</h1>

      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register">
            <Package className="h-4 w-4 mr-2" />
            Cadastrar
          </TabsTrigger>
          <TabsTrigger value="withdrawal">
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Retirada
          </TabsTrigger>
          <TabsTrigger value="movements">
            <ArrowUpFromLine className="h-4 w-4 mr-2" />
            Movimentações
          </TabsTrigger>
        </TabsList>

        {/* Register Tab */}
        <TabsContent value="register" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Cadastrar Nova Treliça</h2>
            <form onSubmit={handleAddTruss} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    value={trussForm.code}
                    onChange={(e) => setTrussForm({ ...trussForm, code: e.target.value })}
                    placeholder="Ex: TRL-001"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={trussForm.name}
                    onChange={(e) => setTrussForm({ ...trussForm, name: e.target.value })}
                    placeholder="Ex: Treliça 2mts"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <Select value={trussForm.unit} onValueChange={(value) => setTrussForm({ ...trussForm, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unidade">Unidade</SelectItem>
                      <SelectItem value="metro">Metro</SelectItem>
                      <SelectItem value="peça">Peça</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={trussForm.category}
                    onChange={(e) => setTrussForm({ ...trussForm, category: e.target.value })}
                    placeholder="Ex: Estrutura"
                  />
                </div>
                <div>
                  <Label htmlFor="maxStock">Quantidade Máxima</Label>
                  <Input
                    id="maxStock"
                    type="number"
                    value={trussForm.maxStock}
                    onChange={(e) => setTrussForm({ ...trussForm, maxStock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="currentStock">Estoque Atual</Label>
                  <Input
                    id="currentStock"
                    type="number"
                    value={trussForm.currentStock}
                    onChange={(e) => setTrussForm({ ...trussForm, currentStock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Treliça
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Treliças Cadastradas</h3>
            <ScrollArea className="h-[400px] w-full">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Máximo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trusses.map((truss) => (
                    <TableRow key={truss.id}>
                      <TableCell>{truss.code}</TableCell>
                      <TableCell>{truss.name}</TableCell>
                      <TableCell>{truss.category}</TableCell>
                      <TableCell>
                        {truss.currentStock} {truss.unit}
                      </TableCell>
                      <TableCell>
                        {truss.maxStock} {truss.unit}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTruss(truss.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Withdrawal Tab */}
        <TabsContent value="withdrawal" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Adicionar Item para Retirada</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="truss">Treliça</Label>
                <Select value={selectedTruss} onValueChange={setSelectedTruss}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma treliça" />
                  </SelectTrigger>
                  <SelectContent>
                    {trusses.map((truss) => (
                      <SelectItem key={truss.id} value={truss.id}>
                        {truss.name} - Disponível: {truss.currentStock} {truss.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantidade a retirar"
                />
              </div>
            </div>
            <Button onClick={handleAddToWithdrawal}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar à Lista
            </Button>
          </Card>

          {withdrawalItems.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Itens para Retirada</h3>
              <div className="space-y-2 mb-4">
                {withdrawalItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-md">
                    <span>
                      {item.trussName} - {item.quantity} unidades
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWithdrawalItems(withdrawalItems.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="takenBy">Retirado por *</Label>
                  <Input
                    id="takenBy"
                    value={takenBy}
                    onChange={(e) => setTakenBy(e.target.value)}
                    placeholder="Nome da pessoa que está retirando"
                  />
                </div>
                <div>
                  <Label htmlFor="serviceDescription">Para qual serviço</Label>
                  <Input
                    id="serviceDescription"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Ex: Evento XYZ, Obra ABC"
                  />
                </div>
                <div>
                  <Label htmlFor="withdrawalNotes">Observações</Label>
                  <Textarea
                    id="withdrawalNotes"
                    value={withdrawalNotes}
                    onChange={(e) => setWithdrawalNotes(e.target.value)}
                    placeholder="Informações adicionais"
                  />
                </div>
                <Button onClick={handleConfirmWithdrawal} className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Retirada
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Histórico de Movimentações</h2>
            <ScrollArea className="h-[600px] w-full">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Treliça</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Retirado por</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trussMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{movement.date.toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{movement.trussName}</TableCell>
                      <TableCell>
                        <Badge variant={movement.type === 'withdrawal' ? 'destructive' : 'default'}>
                          {movement.type === 'withdrawal' ? 'Retirada' : 'Devolução'}
                        </Badge>
                      </TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.takenBy || '-'}</TableCell>
                      <TableCell>{movement.serviceDescription || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={movement.status === 'returned' ? 'default' : 'secondary'}>
                          {movement.status === 'returned' ? 'Devolvida' : 'Ativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.type === 'withdrawal' && movement.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturn(movement.id)}
                          >
                            <ArrowUpFromLine className="h-4 w-4 mr-1" />
                            Devolver
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrussControl;