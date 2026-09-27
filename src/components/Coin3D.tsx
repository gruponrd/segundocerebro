import { cn } from "@/lib/utils";

export type CoinTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legend";

const TIER_STYLES: Record<CoinTier, { face: string; edge: string; glow: string; text: string }> = {
  bronze:   { face: "from-amber-700 via-orange-500 to-amber-800", edge: "bg-amber-900",  glow: "shadow-[0_0_30px_rgba(217,119,6,0.5)]",  text: "text-amber-950" },
  silver:   { face: "from-slate-300 via-slate-100 to-slate-400",   edge: "bg-slate-600",  glow: "shadow-[0_0_30px_rgba(148,163,184,0.6)]", text: "text-slate-800" },
  gold:     { face: "from-yellow-300 via-amber-200 to-yellow-500", edge: "bg-yellow-700", glow: "shadow-[0_0_35px_rgba(250,204,21,0.7)]",  text: "text-yellow-900" },
  platinum: { face: "from-cyan-200 via-white to-slate-300",         edge: "bg-cyan-700",   glow: "shadow-[0_0_35px_rgba(103,232,249,0.6)]", text: "text-cyan-900" },
  diamond:  { face: "from-fuchsia-300 via-cyan-200 to-violet-400",  edge: "bg-violet-800", glow: "shadow-[0_0_40px_rgba(217,70,239,0.7)]",  text: "text-violet-950" },
  legend:   { face: "from-rose-400 via-amber-300 to-emerald-400",   edge: "bg-rose-900",   glow: "shadow-[0_0_50px_rgba(251,191,36,0.9)]",  text: "text-rose-950" },
};

interface Coin3DProps {
  tier: CoinTier;
  icon?: string;
  label?: string;
  size?: number;
  locked?: boolean;
  spinning?: boolean;
  className?: string;
}

export function Coin3D({ tier, icon = "★", label, size = 96, locked = false, spinning = true, className }: Coin3DProps) {
  const style = TIER_STYLES[tier];
  return (
    <div
      className={cn("relative inline-block [perspective:800px]", className)}
      style={{ width: size, height: size }}
    >
      <div
        className={cn(
          "relative w-full h-full [transform-style:preserve-3d]",
          spinning && !locked && "animate-[coin-spin_5s_linear_infinite]",
          locked && "grayscale opacity-40"
        )}
      >
        {/* Front */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-br flex items-center justify-center font-black [backface-visibility:hidden]",
            style.face,
            style.text,
            !locked && style.glow
          )}
          style={{ fontSize: size * 0.42, textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
        >
          <span className="drop-shadow-md">{icon}</span>
          {/* inner ring */}
          <div className="absolute inset-[8%] rounded-full border-2 border-white/30 pointer-events-none" />
          {/* shine */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-transparent to-transparent pointer-events-none" />
        </div>
        {/* Edge (rotated 90deg to give thickness feel) */}
        <div
          className={cn("absolute inset-0 rounded-full [backface-visibility:hidden]", style.edge)}
          style={{ transform: "rotateY(90deg) translateZ(0px)", opacity: 0.8 }}
        />
        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-tl flex items-center justify-center font-black [backface-visibility:hidden]",
            style.face,
            style.text
          )}
          style={{ transform: "rotateY(180deg)", fontSize: size * 0.28 }}
        >
          <div className="absolute inset-[8%] rounded-full border-2 border-white/30" />
          <span className="tracking-widest">{label ?? "★"}</span>
        </div>
      </div>
    </div>
  );
}
