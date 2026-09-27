import { useState } from "react";
import { Users, Plus, Check, X, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { type Creditor } from "@/data/financialData";

interface CreditorWidgetProps {
  creditors: Creditor[];
  totalDebt: number;
  totalPaid: number;
  onAdd: (name: string, totalDebt: number) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Creditor, "name" | "totalDebt" | "amountPaid">>) => void;
}

function EditableCreditor({ c, onRemove, onUpdate }: {
  c: Creditor;
  onRemove: (id: string) => void;
  onUpdate: CreditorWidgetProps["onUpdate"];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [debt, setDebt] = useState(String(c.totalDebt));
  const [paid, setPaid] = useState(String(c.amountPaid));

  const pct = c.totalDebt > 0 ? (c.amountPaid / c.totalDebt) * 100 : 0;
  const isComplete = pct >= 100;

  const handleSave = () => {
    const d = parseFloat(debt);
    const p = parseFloat(paid);
    if (name.trim() && !isNaN(d) && !isNaN(p) && d > 0 && p >= 0) {
      onUpdate(c.id, { name: name.trim(), totalDebt: d, amountPaid: Math.min(p, d) });
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-1.5 p-2 rounded-xl bg-secondary/30">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="h-7 text-xs rounded-lg" autoFocus />
        <div className="flex gap-1.5">
          <Input type="number" value={debt} onChange={(e) => setDebt(e.target.value)} placeholder="Dívida total" className="h-7 text-xs rounded-lg" />
          <Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="Pago" className="h-7 text-xs rounded-lg" />
        </div>
        <div className="flex gap-1 justify-end">
          <button onClick={handleSave} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1">
        <span
          className={`text-sm cursor-pointer hover:text-primary transition-colors ${isComplete ? "text-income line-through" : "text-foreground"}`}
          onClick={() => { setName(c.name); setDebt(String(c.totalDebt)); setPaid(String(c.amountPaid)); setEditing(true); }}
        >
          {c.name}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
          <button
            onClick={() => onRemove(c.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-expense/20 text-muted-foreground hover:text-expense transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <Progress
        value={pct}
        className={`h-1.5 bg-secondary ${isComplete ? "[&>div]:bg-income" : "[&>div]:bg-primary"}`}
      />
      <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
        <span
          className="cursor-pointer hover:text-foreground transition-colors"
          onClick={() => { setName(c.name); setDebt(String(c.totalDebt)); setPaid(String(c.amountPaid)); setEditing(true); }}
        >
          R$ {c.amountPaid.toLocaleString("pt-BR")}
        </span>
        <span>R$ {c.totalDebt.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}

export function CreditorWidget({ creditors, totalDebt, totalPaid, onAdd, onRemove, onUpdate }: CreditorWidgetProps) {
  const overallPercent = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDebt, setNewDebt] = useState("");

  const handleAdd = () => {
    const val = parseFloat(newDebt);
    if (newName.trim() && !isNaN(val) && val > 0) {
      onAdd(newName.trim(), val);
      setNewName("");
      setNewDebt("");
      setAdding(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 animate-float-in" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Credores</h3>
      </div>

      <div className="mb-4 p-3 rounded-xl bg-secondary/40">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Quitação Total</span>
          <span>{overallPercent.toFixed(0)}%</span>
        </div>
        <Progress value={overallPercent} className="h-2 bg-secondary [&>div]:bg-income" />
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-muted-foreground">
            Pago: <span className="text-income text-money">R$ {totalPaid.toLocaleString("pt-BR")}</span>
          </span>
          <span className="text-muted-foreground">
            Total: <span className="text-foreground text-money">R$ {totalDebt.toLocaleString("pt-BR")}</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {creditors.map((c) => (
          <EditableCreditor key={c.id} c={c} onRemove={onRemove} onUpdate={onUpdate} />
        ))}
      </div>

      {/* Add creditor */}
      <div className="mt-3">
        {adding ? (
          <div className="space-y-1.5 p-2 rounded-xl bg-secondary/30">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do credor" className="h-7 text-xs rounded-lg" autoFocus />
            <Input type="number" value={newDebt} onChange={(e) => setNewDebt(e.target.value)} placeholder="Valor da dívida" className="h-7 text-xs rounded-lg" />
            <div className="flex gap-1 justify-end">
              <button onClick={handleAdd} className="p-1 rounded hover:bg-income/20 text-income"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setAdding(false)} className="p-1 rounded hover:bg-expense/20 text-expense"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-3 h-3" /> Adicionar credor
          </button>
        )}
      </div>
    </div>
  );
}
