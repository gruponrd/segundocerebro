import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type View = "login" | "signup" | "forgot";

const copy = {
  login: {
    eyebrow: "Bem-vindo de volta",
    title: "Sua clareza financeira começa aqui.",
    subtitle: "Entre para acompanhar o que importa e tomar decisões com mais tranquilidade.",
  },
  signup: {
    eyebrow: "Um novo começo",
    title: "Organize o futuro que você quer viver.",
    subtitle: "Crie seu espaço pessoal para transformar intenção em movimento.",
  },
  forgot: {
    eyebrow: "Recuperar acesso",
    title: "Vamos abrir o caminho de volta.",
    subtitle: "Enviaremos um link seguro para você criar uma nova senha.",
  },
} satisfies Record<View, { eyebrow: string; title: string; subtitle: string }>;

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      if (error) toast.error(error.message);
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

  const isLogin = view === "login";
  const isSignup = view === "signup";
  const isForgot = view === "forgot";

  return (
    <main className="auth-shell relative min-h-screen overflow-hidden bg-background px-4 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="auth-orb auth-orb-one pointer-events-none absolute -left-28 -top-32 h-[28rem] w-[28rem] rounded-full" />
      <div className="auth-orb auth-orb-two pointer-events-none absolute -bottom-48 -right-40 h-[34rem] w-[34rem] rounded-full" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <section className="hidden px-4 lg:block lg:px-8">
          <div className="mb-20 flex items-center gap-3 text-sm font-medium tracking-[0.18em] text-foreground/70">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-primary shadow-[0_0_30px_hsl(var(--primary)/0.12)]">
              <Wallet className="h-4 w-4" />
            </span>
            SEGUNDO CÉREBRO
          </div>

          <div className="max-w-xl">
            <p className="label-mono mb-5 flex items-center gap-2 text-primary/80">
              <Sparkles className="h-3.5 w-3.5" /> VISÃO CLARA · VIDA LEVE
            </p>
            <h1 className="max-w-2xl text-5xl font-medium leading-[1.08] tracking-[-0.05em] text-gradient xl:text-6xl">
              O seu dinheiro em uma nova perspectiva.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Um painel calmo para organizar seus planos, entender seus movimentos e seguir em frente com intenção.
            </p>
          </div>

          <div className="relative mt-16 h-44 max-w-md">
            <div className="auth-float absolute left-2 top-0 w-60 rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-8 flex items-center justify-between">
                <span className="label-mono">Saldo projetado</span>
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-medium text-emerald-300">+12,8%</span>
              </div>
              <p className="font-mono text-2xl tracking-[-0.06em] text-foreground/90">R$ 8.420,00</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="auth-progress h-full w-[72%] rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
              </div>
            </div>
            <div className="auth-float-delayed absolute bottom-0 right-0 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171715]/80 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-medium text-foreground/80">Tudo em um só lugar</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Seguro e sincronizado</p>
              </div>
            </div>
            <div className="auth-ring pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border border-primary/10" />
          </div>
        </section>

        <section className="auth-card mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-card/75 p-6 shadow-[0_30px_100px_-35px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-primary">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.12em] text-foreground/90">SEGUNDO CÉREBRO</p>
              <p className="text-xs text-muted-foreground">Seu painel pessoal</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="label-mono mb-3 text-primary/75">{copy[view].eyebrow}</p>
            <h2 className="text-3xl font-medium leading-tight tracking-[-0.04em] text-foreground">{copy[view].title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy[view].subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <label className="auth-field group block">
                <span className="sr-only">Seu nome</span>
                <UserPlus className="auth-field-icon" aria-hidden="true" />
                <Input
                  autoComplete="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                />
              </label>
            )}
            <label className="auth-field group block">
              <span className="sr-only">Email</span>
              <Mail className="auth-field-icon" aria-hidden="true" />
              <Input
                autoComplete="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </label>
            {!isForgot && (
              <label className="auth-field group block">
                <span className="sr-only">Senha</span>
                <LockKeyhole className="auth-field-icon" aria-hidden="true" />
                <Input
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="auth-input pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="auth-password-toggle"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </label>
            )}

            <Button type="submit" className="auth-submit group mt-2 h-12 w-full rounded-xl" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Aguarde...</span>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? "Entrar no painel" : isSignup ? "Criar meu espaço" : "Enviar link seguro"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            {isLogin && (
              <>
                <button type="button" onClick={() => setView("forgot")} className="auth-link text-sm text-muted-foreground">
                  Esqueci minha senha
                </button>
                <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground/60">
                  <span className="h-px flex-1 bg-border/70" />
                  <span>ou</span>
                  <span className="h-px flex-1 bg-border/70" />
                </div>
                <button type="button" onClick={() => setView("signup")} className="auth-link text-sm font-medium text-primary">
                  Criar uma conta nova
                </button>
              </>
            )}
            {isSignup && (
              <button type="button" onClick={() => setView("login")} className="auth-link flex items-center justify-center gap-1 text-sm text-primary">
                <ArrowLeft className="h-3.5 w-3.5" /> Já tenho uma conta
              </button>
            )}
            {isForgot && (
              <button type="button" onClick={() => setView("login")} className="auth-link flex items-center justify-center gap-1 text-sm text-primary">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
              </button>
            )}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60">
            <ShieldCheck className="h-3.5 w-3.5" /> Seus dados ficam protegidos e sincronizados
          </div>
        </section>
      </div>
    </main>
  );
}
