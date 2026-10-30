import type { BankCategory } from "@/data/financialData";
import { BankCategoryField } from "@/components/BankCategoryField";
import { useState, useId } from "react";
import { Plus, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardColorPicker } from "@/components/CardColorPicker";
import { CardLogoField } from "@/components/CardLogoField";
import { CARD_COLORS, getCardColor } from "@/data/cardColors";

interface AddBankCardProps {
  onAdd: (name: string, limitTotal: number, color: string, glowClass: string, logoDataUrl?: string, category?: BankCategory) => void;
}

export function AddBankCard({ onAdd }: AddBankCardProps) {
  const inputId = useId();
  const [category, setCategory] = useState<BankCategory>("cartao");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [colorId, setColorId] = useState(CARD_COLORS[0].id);
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>();

  const handleAdd = () => {
    const limitVal = parseFloat(limit);
    if (!name.trim() || isNaN(limitVal) || limitVal <= 0) return;
    const c = getCardColor(colorId);
    onAdd(name.trim(), limitVal, c.id, c.glow, logoDataUrl, category);
    setName("");
    setLimit("");
    setColorId(CARD_COLORS[0].id);
    setLogoDataUrl(undefined);
    setCategory("cartao");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="w-full rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 cursor-pointer flex items-center justify-center gap-3 text-muted-foreground hover:text-primary transition-colors p-8" style={{ aspectRatio: "1.586/1" }}>
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Novo Cartão</span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Adicionar Cartão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <BankCategoryField value={category} onChange={setCategory} />
          <CardColorPicker value={colorId} onChange={(id) => setColorId(id)} label="Cor / bandeira do cartão" />
          <CardLogoField bankName={name.trim() || "novo cartão"} value={logoDataUrl} onChange={setLogoDataUrl} />
          <div>
            <label htmlFor={`${inputId}-name`} className="text-xs text-muted-foreground mb-1 block">Nome do cartão</label>
            <Input
              id={`${inputId}-name`} value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank Platinum"
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <label htmlFor={`${inputId}-limit`} className="text-xs text-muted-foreground mb-1 block">Limite total (R$)</label>
            <Input
              type="number"
              id={`${inputId}-limit`} value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="10000"
              className="bg-secondary border-border"
            />
          </div>
          <Button onClick={handleAdd} className="w-full" disabled={!name.trim() || !limit}>
            Adicionar Cartão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
