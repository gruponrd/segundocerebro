import { useEffect, useState } from "react";
import { Smartphone, Bell, BellOff, CalendarClock, Sun, Trophy, Check, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMobileNotifications } from "@/hooks/useMobileNotifications";
import { useFinanceStore } from "@/stores/financeStore";
import { toast } from "sonner";

export function MobileNotificationsCard() {
  const store = useFinanceStore();
  const {
    isNative,
    prefs,
    setPrefs,
    requestPermissions,
    registerPush,
    scheduleDueReminders,
    scheduleDailyDigest,
    pushToken,
  } = useMobileNotifications();

  const [scheduledCount, setScheduledCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Auto-resync when prefs or installments change (only on native)
  useEffect(() => {
    if (!isNative || !prefs.enabled) return;
    (async () => {
      const n = await scheduleDueReminders(store.allInstallments);
      setScheduledCount(n);
      if (prefs.dailyDigest) {
        const summary = `Saldo previsto: R$ ${store.expectedBalance.toFixed(0)} • ${store.allInstallments.length} contas pendentes`;
        await scheduleDailyDigest(summary);
      }
    })();
  }, [isNative, prefs.enabled, prefs.dueReminders, prefs.dailyDigest, store.allInstallments, store.expectedBalance, scheduleDueReminders, scheduleDailyDigest]);

  const handleEnable = async () => {
    if (!isNative) {
      setPrefs({ ...prefs, enabled: true });
      toast.info("Notificações configuradas. Ativam quando você instalar como app nativo.");
      return;
    }
    setSyncing(true);
    const ok = await requestPermissions();
    if (!ok) {
      toast.error("Permissão negada nas configurações do iPhone");
      setSyncing(false);
      return;
    }
    setPrefs({ ...prefs, enabled: true });
    toast.success("Notificações ativadas no dispositivo");
    setSyncing(false);
  };

  const handlePush = async () => {
    if (!isNative) {
      toast.info("Push remoto só funciona no app nativo instalado");
      return;
    }
    await registerPush();
    setPrefs({ ...prefs, pushEnabled: true });
  };

  return (
    <div className="bg-card border border-border/50 rounded-3xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Notificações Mobile</h3>
            <p className="text-xs text-muted-foreground">
              {isNative ? "App nativo conectado" : "Visualização web — funciona após instalar como app"}
            </p>
          </div>
        </div>
        {prefs.enabled ? (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center gap-1">
            <Check className="w-3 h-3" /> Ativo
          </span>
        ) : null}
      </div>

      {!isNative && (
        <div className="flex gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            Para ativar no iPhone: <b>Exportar para GitHub → bun install → npx cap add ios → npx cap sync → npx cap run ios</b>. Configurações ficam salvas e disparam automaticamente.
          </div>
        </div>
      )}

      {!prefs.enabled ? (
        <Button onClick={handleEnable} disabled={syncing} className="w-full">
          <Bell className="w-4 h-4 mr-2" />
          Ativar notificações
        </Button>
      ) : (
        <>
          <div className="space-y-3">
            <Row
              icon={CalendarClock}
              title="Lembretes de vencimento"
              desc="Aviso 1 dia antes às 09:00"
              checked={prefs.dueReminders}
              onChange={(v) => setPrefs({ ...prefs, dueReminders: v })}
            />
            <Row
              icon={Sun}
              title="Resumo diário"
              desc="Saldo e contas todo dia às 08:00"
              checked={prefs.dailyDigest}
              onChange={(v) => setPrefs({ ...prefs, dailyDigest: v })}
            />
            <Row
              icon={Trophy}
              title="Metas alcançadas"
              desc="Toca quando bate o objetivo"
              checked={prefs.goalAlerts}
              onChange={(v) => setPrefs({ ...prefs, goalAlerts: v })}
            />
          </div>

          {isNative && scheduledCount > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {scheduledCount} lembrete{scheduledCount > 1 ? "s" : ""} agendado{scheduledCount > 1 ? "s" : ""}
            </p>
          )}

          <div className="pt-3 border-t border-border/50">
            <button
              onClick={handlePush}
              className="text-xs text-primary hover:underline w-full text-left"
            >
              {prefs.pushEnabled ? "✓ Push remoto ativado" : "Ativar push remoto (avançado)"}
            </button>
            {pushToken && (
              <code className="text-[10px] text-muted-foreground break-all block mt-1">{pushToken.slice(0, 28)}…</code>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPrefs({ ...prefs, enabled: false })}
            className="w-full text-muted-foreground"
          >
            <BellOff className="w-3.5 h-3.5 mr-2" /> Desativar
          </Button>
        </>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: import("lucide-react").LucideIcon;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
