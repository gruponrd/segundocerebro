import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isCardLogoDataUrl, prepareCardLogo } from "@/lib/cardLogo";

export function CardLogoField({
  bankName,
  value,
  onChange,
}: {
  bankName: string;
  value?: string;
  onChange: (logoDataUrl: string | undefined) => void;
}) {
  const inputId = useId();
  const helperId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const hasLogo = isCardLogoDataUrl(value);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      onChange(await prepareCardLogo(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar esse PNG.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent p-2">
          {hasLogo ? (
            <img src={value} alt={`Prévia do logo de ${bankName}`} className="h-full w-full object-contain" />
          ) : (
            <ImagePlus aria-hidden className="h-5 w-5 text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Logo do cartão</p>
          <p id={helperId} className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            PNG até 5 MB. O logo otimizado acompanha este cartão na sua conta.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,.png"
        aria-label={`Selecionar PNG do logo de ${bankName}`}
        aria-describedby={helperId}
        className="sr-only"
        onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={processing}
          aria-controls={inputId}
          onClick={() => inputRef.current?.click()}
        >
          {processing ? <LoaderCircle aria-hidden className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus aria-hidden className="mr-2 h-4 w-4" />}
          {processing ? "Preparando PNG…" : hasLogo ? "Trocar logo" : "Enviar logo"}
        </Button>
        {hasLogo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11"
            disabled={processing}
            onClick={() => { setError(null); onChange(undefined); }}
            aria-label={`Remover logo de ${bankName}`}
          >
            <Trash2 aria-hidden className="mr-2 h-4 w-4" />
            Remover
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
