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
import { ClipboardList, Search, RefreshCw, Trash2, Loader2 } from "lucide-react";
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

interface FormResponse {
  id: string;
  form_name: string;
  submitted_at: string;
  data: Record<string, any>;
  sheet_row: number | null;
  created_at: string;
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

export default function FormResponses() {
  const { toast } = useToast();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [requesterFilter, setRequesterFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    loadResponses();

    // Check admin
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin((data ?? []).some((r) => r.role === "admin"));
    });

    // Realtime subscription
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

  // Discover all column keys across responses
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    responses.forEach((r) => {
      Object.keys(r.data ?? {}).forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [responses]);

  // Try to identify "Tipo" and "Solicitante" columns (case-insensitive)
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
  }, [responses, search, typeFilter, requesterFilter, typeKey, requesterKey]);

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
            {typeKey && typeOptions.length > 0 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
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
                <SelectTrigger className="w-full sm:w-[200px]">
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
                      {isAdmin && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(r.submitted_at)}
                        </TableCell>
                        {allKeys.map((k) => (
                          <TableCell key={k} className="text-sm max-w-xs">
                            <div className="truncate" title={formatValue(r.data?.[k])}>
                              {formatValue(r.data?.[k])}
                            </div>
                          </TableCell>
                        ))}
                        {isAdmin && (
                          <TableCell>
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
                  <Card key={r.id} className="overflow-hidden">
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
                              <span className="break-words">
                                {formatValue(val)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
