import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  Search,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  Undo2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import PurchaseOrderDialog from "@/components/PurchaseOrderDialog";
import { Purchase, Supplier } from "@/types/inventory";

interface FormResponsesProps {
  suppliers: Supplier[];
  onAddPurchase: (purchase: Omit<Purchase, "id">) => Promise<string | void>;
}

interface FormResponse {
  id: string;
  form_name: string;
  submitted_at: string;
  data: Record<string, any>;
  sheet_row: number | null;
  created_at: string;
  ordered: boolean;
  ordered_by: string | null;
  ordered_at: string | null;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const formatValue = (v: any): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

// Keys to hide from the JSON data (already shown elsewhere or duplicated)
const HIDDEN_KEY_PATTERNS = [
  "carimbo de data",
  "carimbo data",
  "timestamp",
];

const isHiddenKey = (k: string) => {
  const lower = k.toLowerCase().trim();
  return HIDDEN_KEY_PATTERNS.some((p) => lower.includes(p));
};

// Heuristic: identify the materials column to render without truncation
const isMaterialsKey = (k: string) => {
  const lower = k.toLowerCase();
  return (
    lower.includes("material") ||
    lower.includes("materiais") ||
    lower.includes("descri") ||
    lower.includes("pedido") ||
    lower.includes("itens") ||
    lower.includes("item")
  );
};

export default function FormResponses({ suppliers, onAddPurchase }: FormResponsesProps) {
  const { toast } = useToast();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [requesterFilter, setRequesterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [activeResponse, setActiveResponse] = useState<FormResponse | null>(null);

  const loadResponses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("form_responses")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(1000);

    if (error) {
      toast({
        title: "Erro ao carregar respostas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResponses((data ?? []) as FormResponse[]);
    }
    setLoading(false);
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, email");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => {
        map[p.user_id] = p.display_name || p.email || "Usuário";
      });
      setProfilesById(map);
    }
  };

  useEffect(() => {
    loadResponses();
    loadProfiles();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin((data ?? []).some((r) => r.role === "admin"));
    });

    const channel = supabase
      .channel("form-responses-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "form_responses" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setResponses((prev) => [payload.new as FormResponse, ...prev]);
            toast({
              title: "Nova resposta recebida",
              description: "Uma nova requisição chegou agora.",
            });
          } else if (payload.eventType === "UPDATE") {
            setResponses((prev) =>
              prev.map((r) =>
                r.id === (payload.new as FormResponse).id
                  ? (payload.new as FormResponse)
                  : r
              )
            );
          } else if (payload.eventType === "DELETE") {
            setResponses((prev) =>
              prev.filter((r) => r.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Discover all column keys across responses, excluding hidden ones
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    responses.forEach((r) => {
      Object.keys(r.data ?? {}).forEach((k) => {
        if (!isHiddenKey(k)) keys.add(k);
      });
    });
    return Array.from(keys);
  }, [responses]);

  const findKey = (needle: string) =>
    allKeys.find((k) => k.toLowerCase().includes(needle.toLowerCase()));

  const typeKey = findKey("tipo");
  const requesterKey =
    findKey("solicitante") || findKey("nome") || findKey("requisitante");

  const typeOptions = useMemo(() => {
    if (!typeKey) return [];
    const set = new Set<string>();
    responses.forEach((r) => {
      const v = r.data?.[typeKey];
      if (v) set.add(String(v));
    });
    return Array.from(set).sort();
  }, [responses, typeKey]);

  const requesterOptions = useMemo(() => {
    if (!requesterKey) return [];
    const set = new Set<string>();
    responses.forEach((r) => {
      const v = r.data?.[requesterKey];
      if (v) set.add(String(v));
    });
    return Array.from(set).sort();
  }, [responses, requesterKey]);

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      if (statusFilter === "pending" && r.ordered) return false;
      if (statusFilter === "done" && !r.ordered) return false;
      if (typeKey && typeFilter !== "all") {
        if (String(r.data?.[typeKey] ?? "") !== typeFilter) return false;
      }
      if (requesterKey && requesterFilter !== "all") {
        if (String(r.data?.[requesterKey] ?? "") !== requesterFilter)
          return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = JSON.stringify(r.data).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    responses,
    search,
    typeFilter,
    requesterFilter,
    statusFilter,
    typeKey,
    requesterKey,
  ]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("form_responses")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Resposta excluída" });
    }
  };

  const markOrdered = async (r: FormResponse, newOrdered: boolean) => {
    if (!currentUserId) return;
    setUpdatingId(r.id);
    const { error } = await supabase
      .from("form_responses")
      .update({
        ordered: newOrdered,
        ordered_by: newOrdered ? currentUserId : null,
        ordered_at: newOrdered ? new Date().toISOString() : null,
      })
      .eq("id", r.id);
    setUpdatingId(null);
    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: newOrdered ? "Marcado como pedido feito" : "Marcação removida",
      });
    }
  };

  // Heuristic to find the materials text inside the response data
  const getMaterialsText = (r: FormResponse): string => {
    const data = r.data ?? {};
    const matKey = Object.keys(data).find((k) => isMaterialsKey(k));
    if (matKey) return formatValue(data[matKey]);
    return Object.entries(data)
      .filter(([k]) => !isHiddenKey(k))
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join("\n");
  };

  const getRequesterName = (r: FormResponse): string => {
    if (!requesterKey) return "";
    return formatValue(r.data?.[requesterKey]);
  };

  // Heuristic to find the OS / order number inside the response data
  const getOsNumber = (r: FormResponse): string => {
    const data = r.data ?? {};
    const osKey = Object.keys(data).find((k) => {
      const lower = k.toLowerCase().trim();
      return (
        lower === "o.s." ||
        lower === "o.s" ||
        lower === "os" ||
        lower.startsWith("o.s.") ||
        lower.startsWith("o.s ") ||
        lower.startsWith("os ") ||
        lower.startsWith("os n") ||
        lower.startsWith("o.s n") ||
        lower.includes("nº de os") ||
        lower.includes("n° de os") ||
        lower.includes("numero de os") ||
        lower.includes("número de os") ||
        lower.includes("ordem de servi") ||
        lower.includes("nº os") ||
        lower.includes("n° os")
      );
    });
    if (!osKey) return "";
    const raw = formatValue(data[osKey]);
    return raw === "—" ? "" : raw;
  };

  const handleOpenOrderDialog = (r: FormResponse) => {
    setActiveResponse(r);
    setOrderDialogOpen(true);
  };

  const renderStatusCell = (r: FormResponse) => {
    if (r.ordered) {
      const who = r.ordered_by ? profilesById[r.ordered_by] || "Usuário" : "—";
      const when = r.ordered_at ? formatDate(r.ordered_at) : "";
      return (
        <div className="flex flex-col gap-1.5">
          <Badge variant="success" className="w-fit gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Pedido feito
          </Badge>
          <span className="text-xs text-muted-foreground">
            por {who} · {when}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-fit px-2 text-xs"
            onClick={() => markOrdered(r, false)}
            disabled={updatingId === r.id}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Desmarcar
          </Button>
        </div>
      );
    }
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1 border-success/40 text-success hover:bg-success/10 hover:text-success"
        onClick={() => handleOpenOrderDialog(r)}
        disabled={updatingId === r.id}
      >
        {updatingId === r.id ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Marcar pedido feito
      </Button>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            Requisição de Materiais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Respostas recebidas do Google Forms em tempo real
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadResponses}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg">
              Total de respostas:{" "}
              <Badge variant="secondary" className="ml-1">
                {filtered.length}
              </Badge>
              {filtered.length !== responses.length && (
                <span className="text-xs text-muted-foreground ml-2">
                  (de {responses.length})
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar em qualquer campo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="done">Pedido feito</SelectItem>
              </SelectContent>
            </Select>
            {typeKey && typeOptions.length > 0 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {requesterKey && requesterOptions.length > 0 && (
              <Select
                value={requesterFilter}
                onValueChange={setRequesterFilter}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Solicitante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos solicitantes</SelectItem>
                  {requesterOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Loading / Empty */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {responses.length === 0
                  ? "Nenhuma resposta recebida ainda. Configure o webhook no Google Apps Script."
                  : "Nenhuma resposta encontrada com os filtros aplicados."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data</TableHead>
                      {allKeys.map((k) => (
                        <TableHead key={k} className="whitespace-nowrap">
                          {k}
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>
                      {isAdmin && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        className={cn(
                          r.ordered &&
                            "bg-success/5 hover:bg-success/10 [&>td]:opacity-80"
                        )}
                      >
                        <TableCell className="whitespace-nowrap text-xs align-top">
                          {formatDate(r.submitted_at)}
                        </TableCell>
                        {allKeys.map((k) => {
                          const isMat = isMaterialsKey(k);
                          return (
                            <TableCell
                              key={k}
                              className={cn(
                                "text-sm align-top",
                                isMat
                                  ? "min-w-[260px] max-w-[420px] whitespace-pre-wrap break-words"
                                  : "max-w-xs"
                              )}
                            >
                              {isMat ? (
                                <div className="whitespace-pre-wrap break-words">
                                  {formatValue(r.data?.[k])}
                                </div>
                              ) : (
                                <div
                                  className="whitespace-pre-wrap break-words"
                                  title={formatValue(r.data?.[k])}
                                >
                                  {formatValue(r.data?.[k])}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="align-top">
                          {renderStatusCell(r)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="align-top">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Excluir resposta?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(r.id)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filtered.map((r) => (
                  <Card
                    key={r.id}
                    className={cn(
                      "overflow-hidden",
                      r.ordered && "bg-success/5 border-success/30"
                    )}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(r.submitted_at)}
                        </span>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir resposta?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(r.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        {allKeys.map((k) => {
                          const val = r.data?.[k];
                          if (val === null || val === undefined || val === "")
                            return null;
                          return (
                            <div key={k} className="text-sm">
                              <span className="text-xs font-medium text-muted-foreground">
                                {k}:
                              </span>{" "}
                              <span className="break-words whitespace-pre-wrap">
                                {formatValue(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pt-2 border-t">
                        {renderStatusCell(r)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PurchaseOrderDialog
        open={orderDialogOpen}
        onOpenChange={(open) => {
          setOrderDialogOpen(open);
          if (!open) setActiveResponse(null);
        }}
        suppliers={suppliers}
        initialMaterials={activeResponse ? getMaterialsText(activeResponse) : ""}
        initialDocumentNumber={activeResponse ? getOsNumber(activeResponse) : ""}
        requesterName={activeResponse ? getRequesterName(activeResponse) : ""}
        onAddPurchase={onAddPurchase}
        onCreated={async () => {
          if (activeResponse) await markOrdered(activeResponse, true);
        }}
      />
    </div>
  );
}
