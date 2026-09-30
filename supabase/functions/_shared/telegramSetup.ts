// Server-only: derive a stable webhook credential without exposing the bot token.
// An explicitly configured secret remains supported for CLI installations.
export async function telegramWebhookSecret(token: string, configured?: string) {
  if (configured) {
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(configured)) throw new Error("Invalid webhook secret");
    return configured;
  }
  if (!token) throw new Error("Missing bot token");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`segundo-cerebro/telegram/webhook/v1:${token}`));
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

export async function ensureTelegramWebhook(token: string, secret: string, projectUrl: string, username: string) {
  const call = async (method: string, body: Record<string, unknown>) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error("Telegram setup failed");
    return result.result;
  };
  const identity = await call("getMe", {});
  if (identity.username?.toLowerCase() !== username.toLowerCase()) throw new Error("Unexpected bot identity");
  const url = `${projectUrl.replace(/\/$/, "")}/functions/v1/telegram-webhook`;
  // Register on each explicit connection attempt so token/secret rotations are
  // applied too. Preserve pending updates and existing financial records.
  await call("setWebhook", { url, secret_token: secret, allowed_updates: ["message", "callback_query"], max_connections: 5 });
  const webhook = await call("getWebhookInfo", {});
  if (webhook.url !== url) throw new Error("Webhook registration not verified");
}
