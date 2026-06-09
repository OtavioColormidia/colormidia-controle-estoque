import { useState, useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShoppingCart,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  CalendarIcon,
  Pencil,
  Filter,
  ChevronsUpDown,
  Check,
  Upload,
  Download,
  X,
  Loader2,
  Eye,
  Camera,
  Sparkles,
  FileUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Purchase, Product, Supplier, PurchaseItem } from "@/types/inventory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ConfirmDialog from "@/components/ConfirmDialog";
import PageHeader from "@/components/shared/PageHeader";
import { purchaseHeaderSchema, purchaseItemSchema, firstError } from "@/lib/validation/schemas";

import { toast } from "@/components/ui/use-toast";

interface PurchasesProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  onAddPurchase: (purchase: Omit<Purchase, "id">) => Promise<string | void>;
  onDeletePurchase: (id: string) => Promise<void>;
  onUpdatePurchaseStatus: (id: string, status: Purchase["status"]) => Promise<void>;
  onUpdatePurchase: (id: string, purchase: Omit<Purchase, "id" | "date">) => Promise<void>;
}

export default function Purchases({
  purchases,
  products,
  suppliers,
  onAddPurchase,
  onDeletePurchase,
  onUpdatePurchaseStatus,
  onUpdatePurchase,
}: PurchasesProps) {
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [filterSupplierId, setFilterSupplierId] = useState<string>("all");
  const [formData, setFormData] = useState({
    supplierId: "",
    supplierName: "",
    documentNumber: "",
    notes: "",
    expectedDeliveryDate: undefined as Date | undefined,
    status: "pending" as Purchase["status"],
  });
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [itemDiscount, setItemDiscount] = useState("");
  const [itemDiscountType, setItemDiscountType] = useState<"percent" | "value">("value");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "value">("value");
  const [ipi, setIpi] = useState("");
  const [frete, setFrete] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [purchaseAttachments, setPurchaseAttachments] = useState<Record<string, string[]>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const [entryMode, setEntryMode] = useState<"manual" | "nf">("manual");
  const [nfProcessing, setNfProcessing] = useState(false);
  const nfFileInputRef = useRef<HTMLInputElement | null>(null);
  const nfCameraInputRef = useRef<HTMLInputElement | null>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleNfFile = async (file: File) => {
    setNfProcessing(true);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-nf-invoice", {
        body: { fileBase64: base64, mimeType: file.type || "image/jpeg" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const nf: any = data;

      // Match supplier by CNPJ (digits) or name
      const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
      const nfCnpjDigits = onlyDigits(nf.supplierCnpj || "");
      let matched: Supplier | undefined;
      if (nfCnpjDigits) {
        matched = suppliers.find((s) => onlyDigits(s.cnpj) === nfCnpjDigits);
      }
      if (!matched && nf.supplierName) {
        const nfName = String(nf.supplierName).toLowerCase().trim();
        matched = suppliers.find(
          (s) =>
            s.name.toLowerCase().includes(nfName) ||
            nfName.includes(s.name.toLowerCase()) ||
            (s.tradeName && s.tradeName.toLowerCase().includes(nfName)),
        );
      }

      setFormData((prev) => ({
        ...prev,
        supplierId: matched?.id || prev.supplierId,
        supplierName: matched?.name || nf.supplierName || prev.supplierName,
        expectedDeliveryDate: nf.expectedDeliveryDate
          ? new Date(nf.expectedDeliveryDate + "T00:00:00")
          : prev.expectedDeliveryDate,
      }));

      if (Array.isArray(nf.items)) {
        const parsedItems: PurchaseItem[] = nf.items
          .filter((it: any) => it && it.productName)
          .map((it: any) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.unitPrice) || 0;
            return {
              productId: "",
              productName: String(it.productName),
              quantity: qty,
              unitPrice: price,
              totalPrice: qty * price,
              discountValue: 0,
              discountType: "value" as const,
              discountInput: 0,
            };
          });
        if (parsedItems.length > 0) setPurchaseItems((prev) => [...prev, ...parsedItems]);
      }

      if (nf.ipi != null) setIpi((prev) => String((Number(prev) || 0) + (Number(nf.ipi) || 0)));
      if (nf.frete != null) setFrete((prev) => String((Number(prev) || 0) + (Number(nf.frete) || 0)));
      if (nf.discount != null) {
        setDiscount((prev) => String((Number(prev) || 0) + (Number(nf.discount) || 0)));
        setDiscountType("value");
      }

      // Keep the NF file as attachment
      setFormFiles((prev) => [...prev, file]);

      toast({
        title: "NF processada",
        description: matched
          ? "Dados preenchidos automaticamente."
          : "Dados preenchidos. Confirme/selecione o fornecedor.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao processar NF",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setNfProcessing(false);
    }
  };

  // Load attachments for all purchases
  const loadAttachments = async (purchaseId: string) => {
    try {
      const { data, error } = await supabase.storage.from("purchase-attachments").list(purchaseId);
      if (error) throw error;
      if (data) {
        setPurchaseAttachments((prev) => ({
          ...prev,
          [purchaseId]: data.map((f) => f.name),
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar anexos:", error);
    }
  };

  // Load attachments on mount and when purchases change
  useEffect(() => {
    purchases.forEach((p) => loadAttachments(p.id));
  }, [purchases.length]);

  const sanitizeFileName = (name: string) => {
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    const clean = base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return (clean || "arquivo") + ext.toLowerCase();
  };

  const handleFileUpload = async (purchaseId: string, files: FileList) => {
    setUploadingFiles((prev) => ({ ...prev, [purchaseId]: true }));
    try {
      for (const file of Array.from(files)) {
        const safeName = sanitizeFileName(file.name);
        const { error } = await supabase.storage
          .from("purchase-attachments")
          .upload(`${purchaseId}/${safeName}`, file, { upsert: true });
        if (error) throw error;
      }
      toast({ title: "Anexo(s) enviado(s)", description: `${files.length} arquivo(s) enviado(s) com sucesso` });
      await loadAttachments(purchaseId);
    } catch (error: any) {
      toast({ title: "Erro ao enviar anexo", description: error.message, variant: "destructive" });
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [purchaseId]: false }));
    }
  };

  const handleDownloadAttachment = async (purchaseId: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("purchase-attachments").download(`${purchaseId}/${fileName}`);
    if (error) {
      toast({ title: "Erro ao baixar", description: error.message, variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAttachment = async (purchaseId: string, fileName: string) => {
    const { error } = await supabase.storage.from("purchase-attachments").remove([`${purchaseId}/${fileName}`]);
    if (error) {
      toast({ title: "Erro ao excluir anexo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Anexo excluído" });
    await loadAttachments(purchaseId);
  };

  const handlePreviewAttachment = async (purchaseId: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("purchase-attachments")
        .createSignedUrl(`${purchaseId}/${fileName}`, 3600);
      if (error) throw error;
      setPreviewUrl(data.signedUrl);
      setPreviewFileName(fileName);
    } catch (error: any) {
      toast({ title: "Erro ao visualizar", description: error.message, variant: "destructive" });
    }
  };

  // Filter active suppliers based on search
  const filteredActiveSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!s.active) return false;
      if (!supplierSearch.trim()) return true;
      const search = supplierSearch.toLowerCase();
      return (
        s.name.toLowerCase().includes(search) ||
        s.tradeName?.toLowerCase().includes(search) ||
        s.code.toLowerCase().includes(search)
      );
    });
  }, [suppliers, supplierSearch]);

  const handleAddItem = () => {
    const qty = Number(quantity);
    const price = Number(unitPrice);

    const parsed = purchaseItemSchema.safeParse({
      productName,
      quantity: Number.isFinite(qty) ? qty : NaN,
      unitPrice: Number.isFinite(price) ? price : NaN,
    });

    if (!parsed.success) {
      toast({
        title: 'Item inválido',
        description: firstError(parsed) ?? 'Verifique os dados do item.',
        variant: 'destructive',
      });
      return;
    }

    const subtotal = parsed.data.quantity * parsed.data.unitPrice;
    const discInput = Number(itemDiscount) || 0;
    const discValue =
      itemDiscountType === 'percent' ? subtotal * (discInput / 100) : discInput;

    const newItem: PurchaseItem = {
      productId: '',
      productName: parsed.data.productName,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      totalPrice: subtotal - discValue,
      discountValue: discValue,
      discountType: itemDiscountType,
      discountInput: discInput,
    };

    if (editingItemIndex !== null) {
      const updatedItems = [...purchaseItems];
      updatedItems[editingItemIndex] = newItem;
      setPurchaseItems(updatedItems);
      setEditingItemIndex(null);
    } else {
      setPurchaseItems([...purchaseItems, newItem]);
    }

    setProductName('');
    setQuantity('');
    setUnitPrice('');
    setItemDiscount('');
    setItemDiscountType('value');
  };

  const handleEditItem = (index: number) => {
    const item = purchaseItems[index];
    setProductName(item.productName);
    setQuantity(item.quantity.toString());
    setUnitPrice(item.unitPrice.toString());
    setItemDiscount((item.discountInput || 0).toString());
    setItemDiscountType(item.discountType || "value");
    setEditingItemIndex(index);
  };

  const handleCancelItemEdit = () => {
    setProductName("");
    setQuantity("");
    setUnitPrice("");
    setItemDiscount("");
    setItemDiscountType("value");
    setEditingItemIndex(null);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchaseId(purchase.id);
    setFormData({
      supplierId: purchase.supplierId || "",
      supplierName: purchase.supplierName || "",
      documentNumber: purchase.documentNumber || "",
      notes: purchase.notes || "",
      expectedDeliveryDate: purchase.expectedDeliveryDate,
      status: purchase.status,
    });
    setPurchaseItems(purchase.items);
    setDiscount((purchase.discount || 0).toString());
    setDiscountType("value");
    setIpi((purchase.ipi || 0).toString());
    setFrete((purchase.frete || 0).toString());
  };

  const handleCancelEdit = () => {
    setEditingPurchaseId(null);
    setFormData({
      supplierId: "",
      supplierName: "",
      documentNumber: "",
      notes: "",
      expectedDeliveryDate: undefined,
      status: "pending",
    });
    setPurchaseItems([]);
    setDiscount("");
    setDiscountType("value");
    setIpi("");
    setFrete("");
    setEditingItemIndex(null);
    setFormFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const headerCheck = purchaseHeaderSchema.safeParse({
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      documentNumber: formData.documentNumber,
      notes: formData.notes,
    });

    if (!headerCheck.success) {
      toast({
        title: 'Não foi possível salvar',
        description: firstError(headerCheck) ?? 'Verifique o cabeçalho do pedido.',
        variant: 'destructive',
      });
      return;
    }

    if (purchaseItems.length === 0) {
      toast({
        title: 'Adicione pelo menos um item',
        description: 'Um pedido de compra precisa ter ao menos um item.',
        variant: 'destructive',
      });
      return;
    }

    {
      const itemsTotalLocal = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const itemsDiscountLocal = purchaseItems.reduce((sum, item) => sum + (item.discountValue || 0), 0);
      const ipiValue = Number(ipi) || 0;
      const freteValue = Number(frete) || 0;
      const discInput = Number(discount) || 0;
      const orderDiscLocal = discountType === "percent" ? itemsTotalLocal * (discInput / 100) : discInput;
      const totalDiscount = itemsDiscountLocal + orderDiscLocal;
      const totalValue = Math.max(0, itemsTotalLocal - orderDiscLocal + ipiValue + freteValue);

      try {
        if (editingPurchaseId) {
          await onUpdatePurchase(editingPurchaseId, {
            supplierId: formData.supplierId,
            supplierName: formData.supplierName,
            items: purchaseItems,
            totalValue,
            discount: totalDiscount,
            ipi: ipiValue,
            frete: freteValue,
            status: formData.status,
            documentNumber: formData.documentNumber,
            notes: formData.notes,
            expectedDeliveryDate: formData.expectedDeliveryDate,
          });
          toast({ title: "Pedido atualizado", description: "Pedido de compra atualizado com sucesso" });
          setEditingPurchaseId(null);
        } else {
          const newId = await onAddPurchase({
            date: new Date(),
            supplierId: formData.supplierId,
            supplierName: formData.supplierName,
            items: purchaseItems,
            totalValue,
            discount: totalDiscount,
            ipi: ipiValue,
            frete: freteValue,
            status: "pending",
            documentNumber: formData.documentNumber,
            notes: formData.notes,
            expectedDeliveryDate: formData.expectedDeliveryDate,
          });
          // Upload form files if any
          if (newId && formFiles.length > 0) {
            for (const file of formFiles) {
              await supabase.storage
                .from("purchase-attachments")
                .upload(`${newId}/${sanitizeFileName(file.name)}`, file, { upsert: true });
            }
            await loadAttachments(newId);
          }
          toast({ title: "Pedido criado", description: "Pedido de compra criado com sucesso" });
        }

        setFormData({
          supplierId: "",
          supplierName: "",
          documentNumber: "",
          notes: "",
          expectedDeliveryDate: undefined,
          status: "pending",
        });
        setPurchaseItems([]);
        setDiscount("");
        setDiscountType("value");
        setIpi("");
        setFrete("");
        setEditingItemIndex(null);
        setFormFiles([]);
      } catch (error) {
        console.error("Erro ao salvar pedido:", error);
      }
    }
  };

  // Calculate totals
  const itemsTotal = purchaseItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemsDiscountTotal = purchaseItems.reduce((sum, item) => sum + (item.discountValue || 0), 0);
  const ipiValue = Number(ipi) || 0;
  const freteValue = Number(frete) || 0;
  const discountInput = Number(discount) || 0;
  const orderDiscountValue =
    discountType === "percent" ? itemsTotal * (discountInput / 100) : discountInput;
  const totalDiscount = itemsDiscountTotal + orderDiscountValue;
  const finalTotal = Math.max(0, itemsTotal - orderDiscountValue + ipiValue + freteValue);
  

  // Filter purchases by supplier and product
  const filteredPurchases = useMemo(() => {
    let filtered = purchases;
    if (filterSupplierId !== "all") {
      filtered = filtered.filter((p) => p.supplierId === filterSupplierId);
    }
    if (filterProductName.trim()) {
      const search = filterProductName.toLowerCase();
      filtered = filtered.filter((p) => p.items.some((item) => item.productName.toLowerCase().includes(search)));
    }
    return filtered;
  }, [purchases, filterSupplierId, filterProductName]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShoppingCart}
        title="Compras"
        description="Gerencie as compras com fornecedores"
        iconAccent="primary"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {editingPurchaseId ? (
                <>
                  <Pencil className="h-5 w-5" />
                  Editar Pedido de Compra
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Novo Pedido de Compra
                </>
              )}
            </h3>
            {editingPurchaseId && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingPurchaseId && (
              <div className="space-y-2">
                <Label>Modo de cadastro</Label>
                <div className="flex rounded-md border border-input overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEntryMode("manual")}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium transition-colors",
                      entryMode === "manual"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Preencher manualmente
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("nf")}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
                      entryMode === "nf"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Enviar NF (IA)
                  </button>
                </div>

                {entryMode === "nf" && (
                  <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Anexe a foto ou PDF da NF. A IA preencherá fornecedor, itens, IPI, frete, desconto e previsão.
                      <br />
                      <strong>Nº de OS</strong> e <strong>Forma de Recebimento</strong> devem ser informados manualmente.
                    </p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={nfFileInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleNfFile(f);
                        e.target.value = "";
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      ref={nfCameraInputRef}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleNfFile(f);
                        e.target.value = "";
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={nfProcessing}
                        onClick={() => nfFileInputRef.current?.click()}
                        className="gap-1"
                      >
                        <FileUp className="h-3.5 w-3.5" />
                        Anexar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={nfProcessing}
                        onClick={() => nfCameraInputRef.current?.click()}
                        className="gap-1"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Tirar foto
                      </Button>
                    </div>
                    {nfProcessing && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Lendo NF com IA...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={supplierOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {formData.supplierId
                        ? suppliers.find((s) => s.id === formData.supplierId)?.name
                        : "Selecione um fornecedor"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
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
                              setFormData({
                                ...formData,
                                supplierId: currentValue,
                                supplierName: supplier.name,
                              });
                              setSupplierOpen(false);
                              setSupplierSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.supplierId === supplier.id ? "opacity-100" : "opacity-0",
                              )}
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
              <Input
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="OS-86816"
              />
            </div>

            <div className="space-y-2">
              <Label>Forma de Recebimento</Label>
              <Select
                value={formData.notes}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    notes: value,
                    expectedDeliveryDate: value === "RETIRADA" ? undefined : formData.expectedDeliveryDate,
                  });
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

            {formData.notes && (
              <div className="space-y-2">
                <Label>Previsão de {formData.notes === "ENTREGA" ? "Entrega" : "Retirada"}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expectedDeliveryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expectedDeliveryDate ? (
                        format(formData.expectedDeliveryDate, "dd/MM/yyyy")
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.expectedDeliveryDate}
                      onSelect={(date) => setFormData({ ...formData, expectedDeliveryDate: date })}
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
                    onClick={handleCancelItemEdit}
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

            {purchaseItems.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Itens do Pedido</Label>
                {purchaseItems.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-sm p-2 rounded transition-colors space-y-1",
                      editingItemIndex === index ? "bg-primary/20 ring-1 ring-primary" : "bg-secondary/50",
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate flex-1 mr-2">{item.productName}</span>
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

                {/* IPI, Frete Section */}
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
                    <Label className="text-sm whitespace-nowrap">Desconto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex rounded-md border border-input overflow-hidden">
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-2 text-sm font-medium transition-colors",
                          discountType === "value"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => setDiscountType("value")}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-2 text-sm font-medium transition-colors",
                          discountType === "percent"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => setDiscountType("percent")}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  {orderDiscountValue > 0 && (
                    <div className="flex justify-between items-center text-sm p-2 bg-destructive/10 rounded">
                      <span>
                        DESCONTO{discountType === "percent" ? ` (${discountInput}%)` : ""}
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

            {/* Anexar arquivos no formulário */}
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
            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={!formData.supplierId || purchaseItems.length === 0}
            >
              {editingPurchaseId ? (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Atualizar Pedido
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Criar Pedido
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pedidos Cadastrados
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterSupplierId} onValueChange={setFilterSupplierId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers
                    .filter((s) => s.active)
                    .map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Filtrar por produto..."
                value={filterProductName}
                onChange={(e) => setFilterProductName(e.target.value)}
                className="w-[200px]"
              />
            </div>
          </div>
          <ScrollArea className="h-[600px] w-full">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nº de OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">IPI</TableHead>
                  <TableHead className="text-right">Frete</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Previsão de Recebimento</TableHead>
                  <TableHead>Forma de Recebimento</TableHead>
                  <TableHead>NF / Pedido</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      {filterSupplierId === "all" && !filterProductName.trim()
                        ? "Nenhum pedido cadastrado"
                        : "Nenhum pedido encontrado com os filtros aplicados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => {
                    const subtotal = purchase.items.reduce((sum, item) => sum + item.totalPrice, 0);
                    const pDiscount = purchase.discount || 0;
                    const pIpi = purchase.ipi || 0;
                    const pFrete = purchase.frete || 0;
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono">{purchase.documentNumber}</TableCell>
                        <TableCell>{new Date(purchase.date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{purchase.supplierName || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {purchase.items.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                {item.productName} - {item.quantity} un. × R$ {item.unitPrice.toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">R$ {subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {pDiscount > 0 ? (
                            <span className="text-destructive font-medium">- R$ {pDiscount.toFixed(2)}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pIpi > 0 ? <span className="text-warning font-medium">+ R$ {pIpi.toFixed(2)}</span> : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {pFrete > 0 ? (
                            <span className="text-warning font-medium">+ R$ {pFrete.toFixed(2)}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">R$ {purchase.totalValue.toFixed(2)}</TableCell>
                        <TableCell>
                          {purchase.expectedDeliveryDate
                            ? new Date(purchase.expectedDeliveryDate).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{purchase.notes || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[180px]">
                            {(purchaseAttachments[purchase.id] || []).map((fileName) => (
                              <div
                                key={fileName}
                                className="flex items-center gap-1 text-xs bg-muted/50 rounded px-2 py-1"
                              >
                                <FileText className="h-3 w-3 flex-shrink-0 text-primary" />
                                <span className="truncate max-w-[100px]" title={fileName}>
                                  {fileName}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-blue-500 hover:text-blue-600"
                                  onClick={() => handlePreviewAttachment(purchase.id, fileName)}
                                  title="Visualizar"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleDownloadAttachment(purchase.id, fileName)}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                <ConfirmDialog
                                  title="Excluir anexo?"
                                  description={`Excluir "${fileName}"?`}
                                  confirmText="Excluir"
                                  onConfirm={() => handleDeleteAttachment(purchase.id, fileName)}
                                  trigger={
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive">
                                      <X className="h-3 w-3" />
                                    </Button>
                                  }
                                />
                              </div>
                            ))}
                            <div>
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                ref={(el) => {
                                  fileInputRefs.current[purchase.id] = el;
                                }}
                                onChange={(e) => {
                                  if (e.target.files?.length) {
                                    handleFileUpload(purchase.id, e.target.files);
                                    e.target.value = "";
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                disabled={uploadingFiles[purchase.id]}
                                onClick={() => fileInputRefs.current[purchase.id]?.click()}
                              >
                                {uploadingFiles[purchase.id] ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                                Anexar
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditPurchase(purchase)}
                              variant="outline"
                              size="sm"
                              className="text-primary hover:text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <ConfirmDialog
                              title="Excluir pedido?"
                              description={`Tem certeza que deseja excluir o pedido ${purchase.documentNumber || ""}? Esta ação não pode ser desfeita.`}
                              confirmText="Excluir"
                              onConfirm={async () => {
                                try {
                                  await onDeletePurchase(purchase.id);
                                } catch (error) {
                                  console.error("Erro ao excluir compra:", error);
                                }
                              }}
                              trigger={
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUrl(null);
            setPreviewFileName("");
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {previewFileName}
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(previewFileName) ? (
              <div className="flex-1 min-h-0">
                <ZoomableImage src={previewUrl} alt={previewFileName} />
              </div>
            ) : (
              <iframe
                src={previewUrl}
                className="w-full flex-1 rounded border"
                title={previewFileName}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
