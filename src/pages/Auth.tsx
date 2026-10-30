import { isAccountPreview, isDesignPreview, setDesignAccountPreview } from "@/lib/previewMode";
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
  Brain,
  CreditCard,
  Target,
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
    subtitle: "Informe seu nome e crie sua conta. Seu painel começa vazio, pronto para os seus dados.",
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
  const [notice, setNotice] = useState("");

  const changeView = (next: View) => {
    setView(next);
    setNotice("");
    setPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDesignPreview && !isAccountPreview) { setNotice("Prévia visual: login, cadastro e recuperação não enviam dados ao servidor. Use a navegação para voltar ao painel de demonstração."); return; }
    if (isAccountPreview && view !== "login") { setNotice("Entre com a conta existente para carregar uma cópia. Cadastro e recuperação ficam no aplicativo publicado."); return; }
    setLoading(true);
    setNotice("");
    try {
      if (view === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) toast.error(error.message);
        else setNotice("Verifique sua caixa de entrada e o spam para redefinir sua senha.");
        return;
      }
      if (view === "login") {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      } else {
        if (!name.trim()) {
          toast.error("Informe seu nome");
          return;
        }
        const { error, needsEmailConfirmation } = await signUp(email, password, name);
        if (error) toast.error(error.message);
        else if (needsEmailConfirmation) {
          setNotice("Confira seu email e o spam. Confirme o cadastro pelo link recebido e depois entre na sua conta.");
          setPassword("");
          setView("login");
        } else {
          toast.success("Seu espaço está pronto. Bem-vindo!");
        }
      }
    } catch {
      toast.error("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = view === "login";
  const isSignup = view === "signup";
  const isForgot = view === "forgot";

  return (
    <main className="auth-shell clarity-auth">
      <div className="auth-layout">
        <section className="auth-showcase" aria-label="Segundo Cérebro">
          <div className="auth-brand"><Brain size={25} strokeWidth={1.5}/><span>Segundo Cérebro</span></div>
          <div className="auth-showcase-copy"><p className="auth-display">Seu dinheiro.<br/>Seus próximos<br/>passos.</p><p>Um espaço para organizar seus movimentos, entender o mês e cuidar dos seus planos.</p></div>
          <div className="auth-illustration" aria-hidden="true"><Wallet strokeWidth={.7}/><span><CreditCard strokeWidth={1}/></span></div>
          <div className="auth-showcase-links"><span><Wallet size={17}/>Finanças</span><span><CreditCard size={17}/>Cartões</span><span><Target size={17}/>Objetivos</span></div>
        </section>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-mobile-brand auth-brand"><Brain size={24} strokeWidth={1.5}/><span>Segundo Cérebro</span></div>
          <div className="auth-form-heading"><h1 id="auth-title">{copy[view].title}</h1><p>{copy[view].subtitle}</p></div>

          {isAccountPreview && <p role="status" className="mb-5 text-sm text-muted-foreground">Entre com sua conta para visualizar uma cópia dos seus dados. Alterações nesta prévia não são enviadas ao aplicativo publicado. <button type="button" className="underline" onClick={() => setDesignAccountPreview(false)}>Voltar aos exemplos</button></p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <label className="auth-field group block">
                <span className="auth-field-label">Seu nome</span>
                <UserPlus className="auth-field-icon" aria-hidden="true" />
                <Input
                  autoComplete="name"
                  placeholder="Seu nome"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input"
                />
              </label>
            )}
            <label className="auth-field group block">
              <span className="auth-field-label">Email</span>
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
                <span className="auth-field-label">Senha</span>
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

          {notice && <p role="status" className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{notice}</p>}
          {isSignup && <p className="mt-4 text-xs leading-5 text-muted-foreground">Sua conta terá seus próprios cartões, lançamentos e objetivos. Nenhuma informação de outra pessoa será copiada.</p>}

          <div className="mt-6 space-y-3 text-center">
            {isLogin && (
              <>
                <button type="button" onClick={() => changeView("forgot")} className="auth-link text-sm text-muted-foreground">
                  Esqueci minha senha
                </button>
                <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground/60">
                  <span className="h-px flex-1 bg-border/70" />
                  <span>ou</span>
                  <span className="h-px flex-1 bg-border/70" />
                </div>
                <button type="button" onClick={() => changeView("signup")} className="auth-link text-sm font-medium text-primary">
                  Criar uma conta nova
                </button>
              </>
            )}
            {isSignup && (
              <button type="button" onClick={() => changeView("login")} className="auth-link flex items-center justify-center gap-1 text-sm text-primary">
                <ArrowLeft className="h-3.5 w-3.5" /> Já tenho uma conta
              </button>
            )}
            {isForgot && (
              <button type="button" onClick={() => changeView("login")} className="auth-link flex items-center justify-center gap-1 text-sm text-primary">
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
