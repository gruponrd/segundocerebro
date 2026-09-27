import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { CARD_COLORS, getCardColor, isHexColor, normalizeHex } from "@/data/cardColors";
import { Input } from "@/components/ui/input";

interface CardColorPickerProps {
  value: string;
  onChange: (colorId: string, glowClass: string) => void;
  label?: string;
}

export function CardColorPicker({ value, onChange, label = "Cor do cartão" }: CardColorPickerProps) {
  const isCustom = isHexColor(value);
  const [hex, setHex] = useState(isCustom ? value : getCardColor(value).hex);

  useEffect(() => {
    if (isHexColor(value)) setHex(value);
  }, [value]);

  const applyHex = (raw: string) => {
    const normalized = normalizeHex(raw);
    if (normalized) onChange(normalized, "");
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground block">{label}</label>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Bancos</p>
        <div className="flex flex-wrap gap-2">
          {CARD_COLORS.map((c) => {
            const active = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                onClick={() => onChange(c.id, c.glow)}
                className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center ${
                  active ? "border-primary scale-110" : "border-border/60 hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {active && <Check className="w-4 h-4 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Cor personalizada (hex)</p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={normalizeHex(hex) ?? "#1C7F8C"}
            onChange={(e) => { setHex(e.target.value); applyHex(e.target.value); }}
            aria-label="Selecionar cor"
            className="w-9 h-9 rounded-lg bg-transparent border border-border/60 cursor-pointer p-0.5"
          />
          <Input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            onBlur={() => applyHex(hex)}
            onKeyDown={(e) => { if (e.key === "Enter") applyHex(hex); }}
            placeholder="#1C7F8C"
            maxLength={7}
            className="h-9 w-28 text-xs text-money bg-secondary border-border uppercase"
          />
          {isCustom && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="w-3 h-3 text-income" /> em uso
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
