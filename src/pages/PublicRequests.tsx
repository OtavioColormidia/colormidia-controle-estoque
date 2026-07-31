import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Search, Loader2, Inbox, PackageCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { abbreviateProductName } from "@/lib/abbreviateItems";

interface FormResponse {
  id: string;
  form_name: string;
  submitted_at: string;
  data: Record<string, any>;
  created_at: string;
  ordered: boolean;
  ordered_at: string | null;
  completed: boolean;
  completed_at: string | null;
  ordered_summary: string | null;
}

interface PurchaseCard {
  id: string;
  date: string;
  created_at: string;
  supplier_name: string | null;
  creator_name: string | null;
  document_number: string | null;
  items_summary: string | null;
}

type Bucket = "aberto" | "feito" | "concluido";

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
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

const HIDDEN = ["carimbo de data", "carimbo data", "timestamp"];
const isHidden = (k: string) => {
  const l = k.toLowerCase().trim();
  return HIDDEN.some((p) => l.includes(p));
};

const getField = (data: Record<string, any>, ...needles: string[]): string => {
  const key = Object.keys(data || {}).find((k) => {
    const l = k.toLowerCase();
    return needles.some((n) => l.includes(n));
  });
  if (!key) return "";
  const v = data[key];
  if (v === null || v === undefined) return "";
  return String(v);
};

const bucketOf = (r: FormResponse): Bucket => {
  if (r.completed) return "concluido";
  if (r.ordered) return "feito";
  return "aberto";
};

const columns: {
  id: Bucket;
  label: string;
  icon: typeof Inbox;
  accent: string;
  badge: string;
}[] = [
  {
    id: "aberto",
    label: "Pedidos Pendentes",
    icon: Inbox,
    accent: "from-warning/20 to-warning/5 border-warning/40",
    badge: "bg-warning/15 text-warning border-warning/30",
  },
  {
    id: "feito",
    label: "Pedidos Realizados",
    icon: PackageCheck,
    accent: "from-primary/20 to-primary/5 border-primary/40",
    badge: "bg-primary/15 text-primary border-primary/30",
  },
  {
    id: "concluido",
    label: "Pedidos Entregues",
    icon: CheckCircle2,
    accent: "from-success/20 to-success/5 border-success/40",
    badge: "bg-success/15 text-success border-success/30",
  },
];

export default function PublicRequests() {
  const [items, setItems] = useState<FormResponse[]>([]);
  const [purchases, setPurchases] = useState<PurchaseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [solicitanteFilter, setSolicitanteFilter] = useState<string>("todos");
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (innerRef.current) setInnerWidth(innerRef.current.scrollWidth);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [loading]);

  const syncFromTop = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };
  const syncFromBottom = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  const load = async () => {
    const [{ data, error }, purchasesRes] = await Promise.all([
      supabase
        .from("form_responses")
        .select("id, form_name, submitted_at, data, created_at, ordered, ordered_at, completed, completed_at, ordered_summary")
        .order("submitted_at", { ascending: false })
        .limit(500),
      (supabase as any)
        .from("public_recent_purchases")
        .select("id, date, created_at, supplier_name, creator_name, document_number, items_summary")
        .order("date", { ascending: false })
        .limit(200),
    ]);
    if (!error && data) setItems(data as FormResponse[]);
    if (!purchasesRes.error && purchasesRes.data) setPurchases(purchasesRes.data as PurchaseCard[]);
    setLoading(false);
  };


  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      if (disposed) return;
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`public-form-responses-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "form_responses" },
          () => load(),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            load();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (retry) clearTimeout(retry);
            retry = setTimeout(subscribe, 3000);
          }
        });
    };

    load();
    subscribe();

    // Fallback: polling periódico caso o websocket falhe
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20000);

    const onWake = () => {
      if (document.visibilityState === "visible") {
        load();
        subscribe();
      }
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      disposed = true;
      if (retry) clearTimeout(retry);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const tipoOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((r) => {
      const t = getField(r.data, "tipo").trim();
      if (t) s.add(t);
    });
    if (purchases.length) s.add("Compras");
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items, purchases]);

  const solicitanteOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((r) => {
      const n = getField(r.data, "solicit", "vendedor", "responsavel", "requisitante").trim();
      if (n) s.add(n);
    });
    purchases.forEach((p) => {
      const n = (p.creator_name || "").trim();
      if (n) s.add(n);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items, purchases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (tipoFilter !== "todos") {
        if (tipoFilter === "Compras") return false;
        if (getField(r.data, "tipo").trim().toLowerCase() !== tipoFilter.toLowerCase()) return false;
      }
      if (solicitanteFilter !== "todos") {
        const n = getField(r.data, "solicit", "vendedor", "responsavel", "requisitante").trim();
        if (n.toLowerCase() !== solicitanteFilter.toLowerCase()) return false;
      }
      if (!q) return true;
      const hay = [r.form_name, JSON.stringify(r.data ?? {})].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, tipoFilter, solicitanteFilter]);


  const grouped = useMemo(() => {
    const g: Record<Bucket, FormResponse[]> = { aberto: [], feito: [], concluido: [] };
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    filtered.forEach((r) => {
      const b = bucketOf(r);
      if (b === "feito") {
        const ref = r.ordered_at ? new Date(r.ordered_at).getTime() : new Date(r.submitted_at).getTime();
        if (ref < fiveDaysAgo) return;
      }
      g[b].push(r);
    });
    return g;
  }, [filtered]);

  // Compras lançadas direto na aba Compras (manual ou via NF) que não vieram de uma requisição
  const extraPurchases = useMemo(() => {
    const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
    // O.S. já representadas por requisições marcadas como "pedido feito"
    const usedOs = new Set<string>();
    items.forEach((r) => {
      if (!r.ordered) return;
      const os = getField(r.data, "o.s", "ordem");
      (os.match(/\d{4,}/g) || []).forEach((n) => usedOs.add(n));
    });
    const q = search.trim().toLowerCase();
    if (tipoFilter !== "todos" && tipoFilter !== "Compras") return [];
    return purchases
      .filter((p) => new Date(p.date).getTime() >= fiveDaysAgo)
      .filter((p) => {
        const nums = (p.document_number || "").match(/\d{4,}/g) || [];
        return !nums.some((n) => usedOs.has(n));
      })
      .filter((p) => {
        if (solicitanteFilter === "todos") return true;
        return (p.creator_name || "").trim().toLowerCase() === solicitanteFilter.toLowerCase();
      })
      .filter((p) => {
        if (!q) return true;
        return [p.creator_name, p.supplier_name, p.document_number, p.items_summary]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
  }, [purchases, items, search, tipoFilter, solicitanteFilter]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Requisições de Materiais
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Acompanhamento em tempo real — Vendedores &amp; Compras
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por material, O.S., solicitante..."
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tipoOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={solicitanteFilter} onValueChange={setSolicitanteFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Solicitante" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-72">
                <SelectItem value="todos">Todos os solicitantes</SelectItem>
                {solicitanteOptions.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando pedidos...
          </div>
        ) : (
          <>
            <div
              ref={topScrollRef}
              onScroll={syncFromTop}
              className="overflow-x-auto sticky top-[76px] z-[5] bg-background/80 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 mb-2"
            >
              <div style={{ width: innerWidth || 1024, height: 1 }} />
            </div>
            <div
              ref={bottomScrollRef}
              onScroll={syncFromBottom}
              className="overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6"
            >
              <div ref={innerRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-[1024px] lg:min-w-0">
              {columns.map((col) => {
                const list = grouped[col.id];
                const extras = col.id === "feito" ? extraPurchases : [];
                const Icon = col.icon;
                return (
                  <section key={col.id} className="flex flex-col min-h-[400px] min-w-0">
                    <div
                      className={cn(
                        "rounded-t-xl border border-b-0 px-4 py-3 flex items-center justify-between bg-gradient-to-br",
                        col.accent,
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold uppercase tracking-wide text-sm">
                        <Icon className="h-4 w-4" />
                        {col.label}
                      </div>
                      <Badge variant="outline" className={cn("border", col.badge)}>
                        {list.length + extras.length}
                      </Badge>
                    </div>
                    <div className="flex-1 border rounded-b-xl bg-card/40 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
                      {list.length === 0 && extras.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-10">
                          Nenhum pedido nesta categoria.

                        </div>
                      ) : (
                        list.map((r) => {
                          const rawMaterials = getField(r.data, "materia", "descri", "item");
                          const showSummary = (col.id === "feito" || col.id === "concluido") && !!r.ordered_summary;
                          const materials = showSummary ? (r.ordered_summary as string) : rawMaterials;
                          const os = getField(r.data, "o.s", "ordem");
                          const solicitante = getField(r.data, "solicit", "vendedor", "responsavel", "requisitante");
                          const tipo = getField(r.data, "tipo");
                          const qtd = getField(r.data, "quantidade", "qtd");
                          const producao = getField(r.data, "produção", "producao", "prazo");
                          const obs = getField(r.data, "observ");
                          return (
                            <Card
                              key={r.id}
                              className="border-border/60 hover:border-primary/40 transition-colors"
                            >
                              <CardHeader className="p-3 pb-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <CardTitle className="text-sm font-semibold truncate">
                                    {solicitante || "Sem solicitante"}
                                  </CardTitle>
                                  {tipo && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {tipo}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {formatDate(r.submitted_at)}
                                  {os && <> · O.S. <span className="font-medium text-foreground">{os}</span></>}
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-2 text-sm">
                                {materials && (
                                  <div className="whitespace-pre-wrap break-words leading-snug">
                                    {materials}
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  {qtd && <span><b className="text-foreground">Qtd:</b> {qtd}</span>}
                                  {producao && <span><b className="text-foreground">Prazo:</b> {producao}</span>}
                                </div>
                                {obs && (
                                  <div className="text-xs text-muted-foreground border-t pt-2">
                                    <b className="text-foreground">Obs:</b> {obs}
                                  </div>
                                )}
                                {col.id === "feito" && r.ordered_at && (
                                  <div className="text-[11px] text-primary/80">
                                    Pedido feito em {formatDate(r.ordered_at)}
                                  </div>
                                )}
                                {col.id === "concluido" && r.completed_at && (
                                  <div className="text-[11px] text-success">
                                    Concluído em {formatDate(r.completed_at)}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                      {extras.map((p) => {
                        const lines = (p.items_summary || "")
                          .split("\n")
                          .map((l) => {
                            const m = l.match(/^([\d.,]+)x\s+(.*)$/);
                            if (!m) return abbreviateProductName(l);
                            const qty = m[1].replace(/[.,]+$/, "");
                            return `${qty}x ${abbreviateProductName(m[2])}`;
                          })
                          .filter(Boolean)
                          .join("\n");
                        return (
                          <Card key={p.id} className="border-border/60 hover:border-primary/40 transition-colors">
                            <CardHeader className="p-3 pb-2 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-semibold truncate">
                                  {p.creator_name || p.supplier_name || "Compra"}
                                </CardTitle>
                                <Badge variant="secondary" className="text-[10px]">Compras</Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {formatDate(p.date)}
                                {p.document_number && (
                                  <> · <span className="font-medium text-foreground">{p.document_number}</span></>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2 text-sm">
                              {lines && (
                                <div className="whitespace-pre-wrap break-words leading-snug">{lines}</div>
                              )}
                              <div className="text-[11px] text-primary/80">
                                Pedido feito em {formatDate(p.date)}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                    </div>
                  </section>
                );
              })}
            </div>
            </div>
          </>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground">
        ColorMídia · Painel público de pedidos · Atualiza automaticamente
      </footer>
    </div>
  );
}
