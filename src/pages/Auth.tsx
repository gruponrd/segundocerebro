import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Wallet, LogIn, UserPlus, KeyRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type View = "login" | "signup" | "forgot";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Email de redefinição enviado! Verifique sua caixa de entrada.");
      }
      setLoading(false);
      return;
    }

    if (view === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      }
    } else {
      if (!name.trim()) {
        toast.error("Informe seu nome");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, name);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    }
    setLoading(false);
  };

  const subtitle = {
    login: "Entre na sua conta para acessar seus dados",
    signup: "Crie sua conta para começar",
    forgot: "Informe seu email para redefinir a senha",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Segundo Cérebro
          </CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle[view]}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {view === "signup" && (
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary/50 border-border"
            />
            {view !== "forgot" && (
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/50 border-border"
              />
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : view === "login" ? (
                <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
              ) : view === "signup" ? (
                <><UserPlus className="w-4 h-4 mr-2" /> Criar Conta</>
              ) : (
                <><KeyRound className="w-4 h-4 mr-2" /> Enviar Email</>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            {view === "login" && (
              <>
                <button type="button" onClick={() => setView("forgot")} className="text-sm text-muted-foreground hover:text-primary hover:underline block mx-auto">
                  Esqueci minha senha
                </button>
                <button type="button" onClick={() => setView("signup")} className="text-sm text-primary hover:underline block mx-auto">
                  Não tem conta? Criar agora
                </button>
              </>
            )}
            {view === "signup" && (
              <button type="button" onClick={() => setView("login")} className="text-sm text-primary hover:underline">
                Já tem conta? Entrar
              </button>
            )}
            {view === "forgot" && (
              <button type="button" onClick={() => setView("login")} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
                <ArrowLeft className="w-3 h-3" /> Voltar ao login
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
