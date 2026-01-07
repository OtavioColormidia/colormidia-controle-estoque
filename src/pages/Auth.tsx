import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Warehouse } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoColorMedia from '@/assets/logo-colormedia.jpg';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: displayName || email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Conta criada com sucesso!",
        description: "Aguarde a autorização do administrador para acessar o sistema. Você pode tentar fazer login agora.",
      });
      
      // Clear form
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is authorized
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_authorized")
        .eq("user_id", data.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.is_authorized) {
        await supabase.auth.signOut();
        throw new Error("Sua conta ainda não foi autorizada. Por favor, aguarde a aprovação do administrador.");
      }

      navigate("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-login p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card shadow-2xl mb-4 overflow-hidden">
            <img 
              src={logoColorMedia} 
              alt="ColorMídia" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground mb-1">
            ColorMídia
          </h1>
          <p className="text-primary-foreground/70 text-sm">
            Sistema de Controle de Estoque
          </p>
        </div>

        {/* Login Card */}
        <Card className="glass shadow-2xl border-0 backdrop-blur-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">
              Bem-vindo de volta
            </CardTitle>
            <CardDescription className="text-center">
              Entre ou crie sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Criar Conta
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-login" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email-login"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-login" className="text-sm font-medium">
                      Senha
                    </Label>
                    <Input
                      id="password-login"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive" className="animate-scale-in">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName-signup" className="text-sm font-medium">
                      Nome/Usuário
                    </Label>
                    <Input
                      id="displayName-signup"
                      type="text"
                      placeholder="Seu nome"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup" className="text-sm font-medium">
                      Senha
                    </Label>
                    <Input
                      id="password-signup"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive" className="animate-scale-in">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 text-sm text-muted-foreground text-center pt-2 pb-6">
            <div className="w-full h-px bg-border/50 mb-2" />
            <p className="text-xs">
              Após criar sua conta, aguarde a autorização do administrador.
            </p>
          </CardFooter>
        </Card>

        {/* Footer text */}
        <p className="text-center text-primary-foreground/50 text-xs mt-6">
          © {new Date().getFullYear()} ColorMídia. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
