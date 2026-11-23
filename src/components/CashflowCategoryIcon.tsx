import { BookOpen, Bus, Gamepad2, HeartPulse, House, Laptop, Play, ReceiptText, ShoppingBag, ShoppingBasket, TrendingUp, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  moradia: House, alimentacao: ShoppingBasket, transporte: Bus, lazer: Gamepad2,
  saude: HeartPulse, educacao: BookOpen, assinaturas: Play, compras: ShoppingBag,
  contas: ReceiptText, investimento: TrendingUp, eletronicos: Laptop,
};

export function CashflowCategoryIcon({ category }: { category: string }) {
  const Icon = icons[category] ?? ReceiptText;
  return <Icon size={13} aria-hidden="true" />;
}
