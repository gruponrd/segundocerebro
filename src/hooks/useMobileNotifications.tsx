import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

const PREFS_KEY = "fin_mobile_notif_prefs";

export interface NotifPrefs {
  enabled: boolean;
  dueReminders: boolean;   // lembretes de vencimento (1 dia antes 09:00)
  dailyDigest: boolean;    // resumo diário 08:00
  goalAlerts: boolean;     // ao bater metas
  pushEnabled: boolean;    // habilita push remoto (precisa APNs/FCM)
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled: false,
  dueReminders: true,
  dailyDigest: false,
  goalAlerts: true,
  pushEnabled: false,
};

export function useMobileNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const isNative = Capacitor.isNativePlatform();
  const [prefs, setPrefs] = useState<NotifPrefs>(() => ({
    ...DEFAULT_PREFS, ...readAccountJson(userId, PREFS_KEY, {}),
  }));
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (userId) writeAccountJson(userId, PREFS_KEY, prefs);
  }, [prefs, userId]);

  const requestPermissions = useCallback(async () => {
    if (!isNative) return false;
    const local = await LocalNotifications.requestPermissions();
    if (local.display !== "granted") return false;
    return true;
  }, [isNative]);

  const registerPush = useCallback(async () => {
    if (!isNative) return;
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;
    await PushNotifications.register();
    PushNotifications.addListener("registration", (t) => setPushToken(t.value));
  }, [isNative]);

  const scheduleDueReminders = useCallback(
    async (
      installments: Array<{ id: string; description: string; installmentAmount: number; dueDate: string; bankName: string }>
    ) => {
      if (!isNative || !prefs.enabled || !prefs.dueReminders) return 0;
      await LocalNotifications.cancel({
        notifications: (await LocalNotifications.getPending()).notifications.filter(n => n.id < 100000).map(n => ({ id: n.id })),
      }).catch(() => {});

      const now = Date.now();
      const toSchedule = installments
        .map((i, idx) => {
          const due = new Date(i.dueDate + "T09:00:00");
          const remindAt = new Date(due.getTime() - 24 * 60 * 60 * 1000);
          if (remindAt.getTime() < now) return null;
          return {
            id: 1000 + idx,
            title: `💸 Vence amanhã: ${i.description}`,
            body: `${i.bankName} • R$ ${i.installmentAmount.toFixed(2)}`,
            schedule: { at: remindAt },
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (toSchedule.length) {
        await LocalNotifications.schedule({ notifications: toSchedule });
      }
      return toSchedule.length;
    },
    [isNative, prefs.enabled, prefs.dueReminders]
  );

  const scheduleDailyDigest = useCallback(
    async (summary: string) => {
      if (!isNative || !prefs.enabled || !prefs.dailyDigest) return;
      const at = new Date();
      at.setHours(8, 0, 0, 0);
      if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 50001,
            title: "🧠 Resumo do dia",
            body: summary,
            schedule: { at, repeats: true, every: "day" },
          },
        ],
      });
    },
    [isNative, prefs.enabled, prefs.dailyDigest]
  );

  const fireGoalReached = useCallback(
    async (goalName: string) => {
      if (!isNative || !prefs.enabled || !prefs.goalAlerts) return;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 90000) + 60000,
            title: "🎯 Meta alcançada!",
            body: goalName,
            schedule: { at: new Date(Date.now() + 1000) },
          },
        ],
      });
    },
    [isNative, prefs.enabled, prefs.goalAlerts]
  );

  return {
    isNative,
    prefs,
    setPrefs,
    pushToken,
    requestPermissions,
    registerPush,
    scheduleDueReminders,
    scheduleDailyDigest,
    fireGoalReached,
  };
}
