import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

const CHECK_INTERVAL_MS = 60_000; // 1 min

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Vite injects hashed asset filenames into index.html; hash the whole file.
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return String(hash);
  } catch {
    return null;
  }
}

export default function UpdateNotifier() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const initialVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    let cancelled = false;

    const check = async () => {
      const v = await fetchVersion();
      if (cancelled || !v) return;
      if (initialVersionRef.current === null) {
        initialVersionRef.current = v;
        return;
      }
      if (v !== initialVersionRef.current) {
        setHasUpdate(true);
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!hasUpdate || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Nova versão disponível</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Atualize quando terminar o que está fazendo.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => window.location.reload()}
          >
            Atualizar agora
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2 text-muted-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3 mr-1" /> Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
