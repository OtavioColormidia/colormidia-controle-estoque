import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarIcon,
  Camera,
  Check,
  ChevronsUpDown,
  FileText,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  ShoppingCart,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Purchase, PurchaseItem, Supplier } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  initialMaterials?: string;
  initialDocumentNumber?: string;
  requesterName?: string;
  onAddPurchase: (purchase: Omit<Purchase, "id">) => Promise<string | void>;
  onCreated?: (info?: { items: PurchaseItem[] }) => void | Promise<void>;
}

// Parse free-text materials (one per line) into rough items
const parseMaterialsToItems = (text: string): PurchaseItem[] => {
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // Try to extract leading quantity like "2 chapas..." or "2x chapas..."
      const m = line.match(/^(\d+(?:[.,]\d+)?)\s*x?\s*(.+)$/i);
      let qty = 1;
      let name = line;
      if (m) {
        const parsed = parseFloat(m[1].replace(",", "."));
        if (!Number.isNaN(parsed) && parsed > 0) {
          qty = parsed;
          name = m[2].trim();
        }
      }
      return {
        productId: "",
        productName: name,
        quantity: qty,
        unitPrice: 0,
        totalPrice: 0,
        discountValue: 0,
        discountType: "value" as const,
        discountInput: 0,
      };
    });
};

export default function PurchaseOrderDialog({
  open,
  onOpenChange,
  suppliers,
  initialMaterials,
  initialDocumentNumber,
  requesterName,
  onAddPurchase,
  onCreated,
}: PurchaseOrderDialogProps) {
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [receiveMode, setReceiveMode] = useState<string>("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | undefined>();
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState("");
  const [itemDiscountType, setItemDiscountType] = useState<"percent" | "value">("value");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [ipi, setIpi] = useState("");
  const [frete, setFrete] = useState("");
  const [orderDiscount, setOrderDiscount] = useState("");
  const [orderDiscountType, setOrderDiscountType] = useState<"percent" | "value">("value");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [entryMode, setEntryMode] = useState<"manual" | "nf">("manual");
  const [nfProcessing, setNfProcessing] = useState(false);
  const nfFileInputRef = useRef<HTMLInputElement | null>(null);
  const nfCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize when opening with new data
  useEffect(() => {
    if (open) {
      setItems(parseMaterialsToItems(initialMaterials || ""));
      setSupplierId("");
      setSupplierName("");
      setDocumentNumber(initialDocumentNumber || "");
      setReceiveMode("");
      setExpectedDeliveryDate(undefined);
      setProductName("");
      setQuantity("");
      setUnitPrice("");
      setItemDiscount("");
      setItemDiscountType("value");
      setEditingItemIndex(null);
      setIpi("");
      setFrete("");
      setOrderDiscount("");
      setOrderDiscountType("value");
      setFormFiles([]);
      setSupplierSearch("");
      setEntryMode("manual");
      setNfProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleNfFile = async (file: File | null) => {
    if (!file) return;
    setNfProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-nf-invoice", {
        body: { fileBase64: base64, mimeType: file.type || "application/octet-stream" },
      });
      if (error) throw new Error(error.message || "Falha ao processar NF");
      const nf: any = data || {};

      // Match supplier
      const nfCnpjDigits = onlyDigits(nf.supplierCnpj || "");
      let matched: Supplier | undefined;
      if (nfCnpjDigits) {
        matched = suppliers.find((s) => onlyDigits(s.cnpj) === nfCnpjDigits);
      }
      if (!matched && nf.supplierName) {
        const nfName = String(nf.supplierName).toLowerCase();
        matched = suppliers.find(
          (s) =>
            s.name.toLowerCase().includes(nfName) ||
            nfName.includes(s.name.toLowerCase()) ||
            (s.tradeName && s.tradeName.toLowerCase().includes(nfName)),
        );
      }
      if (matched) {
        setSupplierId(matched.id);
        setSupplierName(matched.name);
      } else if (nf.supplierName) {
        toast({
          title: "Fornecedor não encontrado",
          description: `Cadastre "${nf.supplierName}" ou selecione manualmente.`,
        });
      }

      if (nf.expectedDeliveryDate) {
        const d = new Date(nf.expectedDeliveryDate + "T00:00:00");
        if (!isNaN(d.getTime())) setExpectedDeliveryDate(d);
      }

      if (Array.isArray(nf.items) && nf.items.length > 0) {
        const newItems: PurchaseItem[] = nf.items.map((it: any) => {
          const qty = Number(it.quantity) || 0;
          const price = Number(it.unitPrice) || 0;
          return {
            productId: "",
            productName: String(it.productName || "").trim(),
            quantity: qty,
            unitPrice: price,
            totalPrice: qty * price,
            discountValue: 0,
            discountType: "value" as const,
            discountInput: 0,
          };
        }).filter((it: PurchaseItem) => it.productName);
        setItems((prev) => [...prev, ...newItems]);
      }

      if (typeof nf.ipi === "number" && nf.ipi > 0) setIpi((prev) => String((Number(prev) || 0) + nf.ipi));
      if (typeof nf.frete === "number" && nf.frete > 0) setFrete((prev) => String((Number(prev) || 0) + nf.frete));
      if (typeof nf.discount === "number" && nf.discount > 0) {
        setOrderDiscount((prev) => String((Number(prev) || 0) + nf.discount));
        setOrderDiscountType("value");
      }

      toast({
        title: "NF processada",
        description: "Confira os campos preenchidos antes de criar o pedido.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao processar NF",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setNfProcessing(false);
      if (nfFileInputRef.current) nfFileInputRef.current.value = "";
      if (nfCameraInputRef.current) nfCameraInputRef.current.value = "";
    }
  };

  const filteredActiveSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!s.active) return false;
      if (!supplierSearch.trim()) return true;
      const q = supplierSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) || s.tradeName?.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    });
  }, [suppliers, supplierSearch]);

  const handleAddItem = () => {
    if (!productName || !quantity) return;
    const qty = Number(quantity);
    const price = Number(unitPrice) || 0;
    const subtotal = qty * price;
    const discInput = Number(itemDiscount) || 0;
    const discValue = itemDiscountType === "percent" ? subtotal * (discInput / 100) : discInput;
    const newItem: PurchaseItem = {
      productId: "",
      productName,
      quantity: qty,
      unitPrice: price,
      totalPrice: subtotal - discValue,
      discountValue: discValue,
      discountType: itemDiscountType,
      discountInput: discInput,
    };
    if (editingItemIndex !== null) {
      const updated = [...items];
      updated[editingItemIndex] = newItem;
      setItems(updated);
      setEditingItemIndex(null);
    } else {
      setItems([...items, newItem]);
    }
    setProductName("");
    setQuantity("");
    setUnitPrice("");
    setItemDiscount("");
    setItemDiscountType("value");
  };

  const handleEditItem = (index: number) => {
    const it = items[index];
    setProductName(it.productName);
    setQuantity(it.quantity.toString());
    setUnitPrice(it.unitPrice.toString());
    setItemDiscount((it.discountInput || 0).toString());
    setItemDiscountType(it.discountType || "value");
    setEditingItemIndex(index);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const itemsTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const itemsDiscountTotal = items.reduce((s, i) => s + (i.discountValue || 0), 0);
  const ipiValue = Number(ipi) || 0;
  const freteValue = Number(frete) || 0;
  const orderDiscountInput = Number(orderDiscount) || 0;
  const orderDiscountValue =
    orderDiscountType === "percent" ? itemsTotal * (orderDiscountInput / 100) : orderDiscountInput;
  const totalDiscount = itemsDiscountTotal + orderDiscountValue;
  const finalTotal = Math.max(0, itemsTotal - orderDiscountValue + ipiValue + freteValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) return;
    setSubmitting(true);
    try {
      const trimmedDoc = documentNumber.trim();
      const newId = await onAddPurchase({
        date: new Date(),
        supplierId,
        supplierName,
        items,
        totalValue: finalTotal,
        discount: totalDiscount,
        ipi: ipiValue,
        frete: freteValue,
        status: "pending",
        documentNumber: trimmedDoc || undefined,
        notes: receiveMode,
        expectedDeliveryDate,
      });
      if (newId && formFiles.length > 0) {
        const sanitize = (n: string) => {
          const dot = n.lastIndexOf(".");
          const base = dot > 0 ? n.slice(0, dot) : n;
          const ext = dot > 0 ? n.slice(dot) : "";
          const clean = base.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
          return (clean || "arquivo") + ext.toLowerCase();
        };
        for (const file of formFiles) {
          await supabase.storage.from("purchase-attachments").upload(`${newId}/${sanitize(file.name)}`, file, { upsert: true });
        }
      }
      toast({
        title: "Pedido criado",
        description: "Pedido de compra criado com sucesso",
      });
      await onCreated?.({ items });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao criar pedido",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Pedido de Compra
          </DialogTitle>
          <DialogDescription>
            {requesterName
              ? `Criando pedido a partir da requisição de ${requesterName}`
              : "Criando pedido a partir da requisição"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant={entryMode === "manual" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setEntryMode("manual")}
              >
                <Pencil className="h-4 w-4" />
                Preencher manualmente
              </Button>
              <Button
                type="button"
                variant={entryMode === "nf" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setEntryMode("nf")}
              >
                <Sparkles className="h-4 w-4" />
                Enviar NF (IA)
              </Button>
            </div>
            {entryMode === "nf" && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Anexe ou tire foto da NF. A IA preencherá fornecedor, itens, IPI, frete e desconto. OS e Forma de Recebimento continuam manuais.
                </p>
                <input
                  ref={nfFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => handleNfFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={nfCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleNfFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => nfFileInputRef.current?.click()}
                    disabled={nfProcessing}
                  >
                    <FileUp className="h-4 w-4" />
                    Anexar arquivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => nfCameraInputRef.current?.click()}
                    disabled={nfProcessing}
                  >
                    <Camera className="h-4 w-4" />
                    Tirar foto
                  </Button>
                </div>
                {nfProcessing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processando NF com IA...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {supplierId ? suppliers.find((s) => s.id === supplierId)?.name : "Selecione um fornecedor"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar fornecedor..."
                    value={supplierSearch}
                    onValueChange={setSupplierSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                    <CommandGroup>
                      {filteredActiveSuppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          value={supplier.id}
                          onSelect={(currentValue) => {
                            setSupplierId(currentValue);
                            setSupplierName(supplier.name);
                            setSupplierOpen(false);
                            setSupplierSearch("");
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", supplierId === supplier.id ? "opacity-100" : "opacity-0")}
                          />
                          <div className="flex flex-col">
                            <span>{supplier.name}</span>
                            {supplier.tradeName && (
                              <span className="text-xs text-muted-foreground">{supplier.tradeName}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Nº de OS</Label>
            <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="OS-86816" />
          </div>

          <div className="space-y-2">
            <Label>Forma de Recebimento</Label>
            <Select
              value={receiveMode}
              onValueChange={(value) => {
                setReceiveMode(value);
                if (value === "RETIRADA") setExpectedDeliveryDate(undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTREGA">Entrega</SelectItem>
                <SelectItem value="RETIRADA">Retirada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {receiveMode && (
            <div className="space-y-2">
              <Label>Previsão de {receiveMode === "ENTREGA" ? "Entrega" : "Retirada"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expectedDeliveryDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expectedDeliveryDate ? format(expectedDeliveryDate, "dd/MM/yyyy") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expectedDeliveryDate}
                    onSelect={setExpectedDeliveryDate}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Adicionar Itens</Label>
              {editingItemIndex !== null && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingItemIndex(null);
                    setProductName("");
                    setQuantity("");
                    setUnitPrice("");
                    setItemDiscount("");
                    setItemDiscountType("value");
                  }}
                  className="text-xs h-6"
                >
                  Cancelar edição
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Digite o nome do produto"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Quantidade"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço Unit."
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddItem}
                variant="outline"
                className={cn(
                  "w-full",
                  editingItemIndex !== null && "bg-primary/10 border-primary text-primary hover:bg-primary/20",
                )}
              >
                {editingItemIndex !== null ? (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Atualizar Item
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </>
                )}
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <Label>Itens do Pedido</Label>
              {items.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "text-sm p-2 rounded transition-colors space-y-1",
                    editingItemIndex === index ? "bg-primary/20 ring-1 ring-primary" : "bg-secondary/50",
                  )}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="flex-1 break-words">{item.productName}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs whitespace-nowrap">
                        {item.quantity}x R$ {item.unitPrice.toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEditItem(index)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {(item.discountValue || 0) > 0 && (
                    <div className="flex justify-between text-xs text-destructive">
                      <span>
                        Desconto (
                        {item.discountType === "percent"
                          ? `${item.discountInput}%`
                          : `R$ ${item.discountInput?.toFixed(2)}`}
                        )
                      </span>
                      <span>- R$ {item.discountValue?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-xs text-right text-muted-foreground">
                    Subtotal: R$ {item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}

              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">IPI (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={ipi}
                    onChange={(e) => setIpi(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Frete (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={frete}
                    onChange={(e) => setFrete(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Desconto Total</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex rounded-md border border-input overflow-hidden">
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        orderDiscountType === "value"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                      onClick={() => setOrderDiscountType("value")}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "px-3 py-2 text-sm font-medium transition-colors",
                        orderDiscountType === "percent"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                      onClick={() => setOrderDiscountType("percent")}
                    >
                      %
                    </button>
                  </div>
                </div>

                {itemsDiscountTotal > 0 && (
                  <div className="flex justify-between items-center text-sm p-2 bg-destructive/10 rounded">
                    <span>DESCONTOS DOS ITENS</span>
                    <span className="text-destructive font-medium">- R$ {itemsDiscountTotal.toFixed(2)}</span>
                  </div>
                )}
                {orderDiscountValue > 0 && (
                  <div className="flex justify-between items-center text-sm p-2 bg-destructive/10 rounded">
                    <span>
                      DESCONTO NO TOTAL
                      {orderDiscountType === "percent" ? ` (${orderDiscountInput}%)` : ""}
                    </span>
                    <span className="text-destructive font-medium">- R$ {orderDiscountValue.toFixed(2)}</span>
                  </div>
                )}
                {ipiValue > 0 && (
                  <div className="flex justify-between items-center text-sm p-2 bg-warning/20 rounded">
                    <span>IPI</span>
                    <span>+ R$ {ipiValue.toFixed(2)}</span>
                  </div>
                )}
                {freteValue > 0 && (
                  <div className="flex justify-between items-center text-sm p-2 bg-warning/20 rounded">
                    <span>FRETE</span>
                    <span>+ R$ {freteValue.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-2 mt-2 space-y-1">
                {(totalDiscount > 0 || ipiValue > 0 || freteValue > 0) && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal dos itens:</span>
                    <span>R$ {itemsTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="font-bold text-right text-lg">Total: R$ {finalTotal.toFixed(2)}</div>
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Anexar Arquivos
            </Label>
            {formFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                <FileText className="h-3 w-3 text-primary" />
                <span className="truncate flex-1">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-destructive"
                  onClick={() => setFormFiles(formFiles.filter((_, i) => i !== idx))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <input
              type="file"
              multiple
              className="hidden"
              ref={formFileInputRef}
              onChange={(e) => {
                if (e.target.files?.length) {
                  setFormFiles([...formFiles, ...Array.from(e.target.files)]);
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={() => formFileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Selecionar Arquivos
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-primary"
              disabled={!supplierId || items.length === 0 || submitting}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Criar Pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
