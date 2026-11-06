import type { Json } from "@/integrations/supabase/types";

export const SYNCED_MODULE_KEYS = ["fin_wishes_v1", "fin_dreamboard", "neuro-recovery-v1", "routine-store-v1", "payment-session-income-map-v1"] as const;
export type ModuleKey = typeof SYNCED_MODULE_KEYS[number];
export type SyncDecision = "equal" | "upload" | "download" | "conflict" | "empty";

// Compare object contents rather than Postgres's JSON key order.
function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical(value[key]!)}`).join(",")}}`;
  return JSON.stringify(value);
}
export async function moduleDigest(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(JSON.parse(raw) as Json));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

/** Only replace a copy when its last synchronized digest proves it is unchanged. */
export function decideModuleSync(local: string | null, remote: string | null, checkpoint: string | null): SyncDecision {
  if (local === null && remote === null) return "empty";
  if (local === remote) return "equal";
  if (remote === null) return checkpoint === null ? "upload" : "conflict";
  if (local === null) return checkpoint === null ? "download" : "conflict";
  if (checkpoint !== null && local === checkpoint) return "download";
  if (checkpoint !== null && remote === checkpoint) return "upload";
  return "conflict";
}
