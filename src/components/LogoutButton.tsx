import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  onSignedOut?: () => void;
  mobile?: boolean;
  iconOnly?: boolean;
}

export function LogoutButton({ className, onSignedOut, mobile = false, iconOnly = false }: LogoutButtonProps) {
  const { session, signOut } = useAuth();
  const [pending, setPending] = useState(false);

  if (!session) return null;

  const handleSignOut = async () => {
    if (pending) return;
    setPending(true);
    try {
      await signOut();
      onSignedOut?.();
      toast.success("Você saiu da sua conta.");
    } catch {
      toast.error("Não foi possível sair agora. Tente novamente.");
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      aria-label={pending ? "Saindo…" : "Sair da conta"}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:cursor-wait disabled:opacity-60",
        mobile && "border-t border-border pt-4 text-expense hover:bg-expense/10 hover:text-expense",
        className,
      )}
    >
      <LogOut aria-hidden className="h-4 w-4 shrink-0" />
      <span className={iconOnly ? "sr-only" : undefined}>{pending ? "Saindo…" : mobile ? "Sair da conta" : "Sair"}</span>
    </button>
  );
}
