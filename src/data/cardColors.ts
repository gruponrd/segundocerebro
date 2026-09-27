export interface CardColorOption {
  id: string;
  label: string;
  /** Tailwind gradient classes for the physical card (presets only) */
  gradient: string;
  /** Foreground text color class */
  text: string;
  /** Progress bar indicator class */
  progress: string;
  /** Glow utility class defined in index.css */
  glow: string;
  /** Hex used for swatches / charts */
  hex: string;
  group: "banco" | "custom";
  /** Inline style used when the color comes from a custom hex code */
  style?: React.CSSProperties;
}

export const CARD_COLORS: CardColorOption[] = [
  { id: "bank-nubank", label: "Nubank", gradient: "from-[hsl(280,97%,38%)] to-[hsl(300,80%,25%)]", text: "text-white", progress: "[&>div]:bg-white/80", glow: "glow-nubank", hex: "#8A05BE", group: "banco" },
  { id: "bank-inter", label: "Inter", gradient: "from-[hsl(27,100%,50%)] to-[hsl(15,90%,40%)]", text: "text-white", progress: "[&>div]:bg-white/80", glow: "glow-inter", hex: "#FF7A00", group: "banco" },
  { id: "bank-c6", label: "C6 Bank", gradient: "from-[hsl(220,10%,20%)] to-[hsl(220,15%,12%)]", text: "text-gray-300", progress: "[&>div]:bg-white/60", glow: "glow-c6", hex: "#2C2C2E", group: "banco" },
  { id: "bank-itau", label: "Itaú", gradient: "from-[#F88104] to-[hsl(25,90%,35%)]", text: "text-white", progress: "[&>div]:bg-white/80", glow: "glow-itau", hex: "#EC7000", group: "banco" },
  { id: "bank-bb", label: "Banco do Brasil", gradient: "from-[hsl(45,100%,45%)] to-[hsl(45,80%,30%)]", text: "text-gray-900", progress: "[&>div]:bg-gray-900/60", glow: "glow-bb", hex: "#FFCD00", group: "banco" },
  { id: "bank-other", label: "Outro", gradient: "from-[hsl(190,65%,31%)] to-[hsl(190,70%,22%)]", text: "text-white", progress: "[&>div]:bg-white/80", glow: "glow-other", hex: "#1C7F8C", group: "banco" },
];

/** Normalizes "#abc", "abc123" etc. Returns null when invalid. */
export function normalizeHex(input: string): string | null {
  let v = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return `#${v.toUpperCase()}`;
}

export const isHexColor = (id: string) => !!id && normalizeHex(id) !== null && id.trim().startsWith("#");

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function customCardColor(hexInput: string): CardColorOption {
  const hex = normalizeHex(hexInput) ?? "#1C7F8C";
  const light = luminance(hex) > 0.62;
  return {
    id: hex,
    label: hex,
    gradient: "",
    text: light ? "text-gray-900" : "text-white",
    progress: light ? "[&>div]:bg-gray-900/60" : "[&>div]:bg-white/80",
    glow: "",
    hex,
    group: "custom",
    style: { backgroundImage: `linear-gradient(135deg, ${hex} 0%, ${shade(hex, 0.55)} 100%)` },
  };
}

export const getCardColor = (id: string): CardColorOption =>
  CARD_COLORS.find((c) => c.id === id) || (isHexColor(id) ? customCardColor(id) : CARD_COLORS[0]);
