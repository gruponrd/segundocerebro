import { useState } from "react";
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
import { CARD_COLORS, getCardColor } from "@/data/cardColors";

interface AddBankCardProps {
  onAdd: (name: string, limitTotal: number, color: string, glowClass: string) => void;
}

export function AddBankCard({ onAdd }: AddBankCardProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [colorId, setColorId] = useState(CARD_COLORS[0].id);

  const handleAdd = () => {
    const limitVal = parseFloat(limit);
    if (!name.trim() || isNaN(limitVal) || limitVal <= 0) return;
    const c = getCardColor(colorId);
    onAdd(name.trim(), limitVal, c.id, c.glow);
    setName("");
    setLimit("");
    setColorId(CARD_COLORS[0].id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="w-full rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 cursor-pointer flex items-center justify-center gap-3 text-muted-foreground hover:text-primary transition-colors p-8" style={{ aspectRatio: "1.586/1" }}>
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Novo Cartão</span>
        </div>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Adicionar Cartão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <CardColorPicker value={colorId} onChange={(id) => setColorId(id)} label="Cor / bandeira do cartão" />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome do cartão</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank Platinum"
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Limite total (R$)</label>
            <Input
              type="number"
              value={limit}
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
