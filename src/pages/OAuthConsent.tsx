import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

// Beta namespace not yet in types — narrow local wrapper.
const oauthApi = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
    approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
    denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("authorization_id ausente na URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      if (!oauthApi?.getAuthorizationDetails) {
        setError(
          "O servidor de OAuth 2.1 do Supabase não está habilitado para este projeto. Peça a um administrador para ativá-lo no Supabase Dashboard.",
        );
        return;
      }
      const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi.approveAuthorization(authorizationId)
      : await oauthApi.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Autorizar acesso</CardTitle>
          </div>
          <CardDescription>
            Este aplicativo está pedindo acesso à sua conta ColorMídia via MCP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">
              Não foi possível carregar este pedido de autorização: {error}
            </p>
          )}
          {!error && !details && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}
          {details && (
            <>
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {details.client?.name ?? "Cliente OAuth"}
                </div>
                {details.client?.uri && (
                  <div className="text-muted-foreground text-xs mt-1 break-all">
                    {details.client.uri}
                  </div>
                )}
                <p className="mt-2 text-muted-foreground">
                  Se você aprovar, este cliente poderá usar as ferramentas MCP deste app
                  em seu nome — respeitando suas permissões.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
                  Recusar
                </Button>
                <Button disabled={busy} onClick={() => decide(true)}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Aprovar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
