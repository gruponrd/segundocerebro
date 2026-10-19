import type { Bank } from "@/data/financialData";
import { cn } from "@/lib/utils";
import { isCardLogoDataUrl } from "@/lib/cardLogo";

const sizeClasses = {
  sm: "h-7 w-10 rounded-md p-1",
  md: "h-9 w-12 rounded-lg p-1.5",
  lg: "h-12 w-16 rounded-xl p-2",
} as const;

export function BankLogo({
  bank,
  size = "md",
  className,
  decorative = false,
}: {
  bank: Pick<Bank, "name" | "logoDataUrl">;
  size?: keyof typeof sizeClasses;
  className?: string;
  decorative?: boolean;
}) {
  if (!isCardLogoDataUrl(bank.logoDataUrl)) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-white/25 bg-white/95 shadow-sm",
        sizeClasses[size],
        className,
      )}
      aria-hidden={decorative || undefined}
    >
      <img
        src={bank.logoDataUrl}
        alt={decorative ? "" : `Logo de ${bank.name}`}
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
