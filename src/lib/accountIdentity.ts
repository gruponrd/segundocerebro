/** Names are account data: never fall back to the name of another user. */
export function accountDisplayName(metadata: Record<string, unknown> = {}): string {
  for (const key of ["display_name", "full_name", "name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}
