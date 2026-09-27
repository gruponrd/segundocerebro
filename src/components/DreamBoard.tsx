import { useState, useRef, useEffect, useCallback } from "react";
import { ImagePlus, X, Maximize2, Minimize2, Link, Upload } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { readAccountJson, writeAccountJson } from "@/lib/accountStorage";

const STORAGE_KEY = "fin_dreamboard";

interface DreamImage {
  id: string;
  src: string;
  label: string;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function DreamBoard() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [images, setImages] = useState<DreamImage[]>(() => readAccountJson(userId, STORAGE_KEY, []));
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (userId) writeAccountJson(userId, STORAGE_KEY, images);
  }, [images, userId]);

  const addImageFromUrl = useCallback((url: string, label?: string) => {
    const trimmed = url.trim();
    if (!isValidUrl(trimmed)) {
      toast.error("URL inválida");
      return;
    }
    const newImg: DreamImage = {
      id: crypto.randomUUID(),
      src: trimmed,
      label: label || new URL(trimmed).pathname.split("/").pop()?.replace(/\.[^/.]+$/, "") || "Imagem",
    };
    setImages((prev) => [...prev, newImg]);
    toast.success("Imagem adicionada!");
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const newImg: DreamImage = {
          id: crypto.randomUUID(),
          src: reader.result as string,
          label: file.name.replace(/\.[^/.]+$/, ""),
        };
        setImages((prev) => [...prev, newImg]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    // Check for files first
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
      return;
    }

    // Check for dropped URL/text
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (url && isValidUrl(url)) {
      addImageFromUrl(url);
    }
  }, [addImageFromUrl]);

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!dropRef.current?.closest(".dream-board-root")) return;

      // Check for pasted files (screenshots etc)
      if (e.clipboardData?.files?.length) {
        handleFiles(e.clipboardData.files);
        return;
      }

      // Check for pasted URL
      const text = e.clipboardData?.getData("text/plain");
      if (text && isValidUrl(text)) {
        addImageFromUrl(text);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [addImageFromUrl]);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      addImageFromUrl(urlInput);
      setUrlInput("");
      setShowUrlInput(false);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const displayImages = expanded ? images : images.slice(0, 6);
  const hasMore = !expanded && images.length > 6;

  return (
    <div
      ref={dropRef}
      className="dream-board-root glass-card rounded-2xl p-5 animate-float-in relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="absolute inset-0 z-20 rounded-2xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Upload className="w-10 h-10 text-primary animate-bounce" />
          <p className="text-sm font-medium text-primary">Solte a imagem ou link aqui</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Dream Board
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {images.length > 6 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
          >
            <Link className="w-3.5 h-3.5" /> URL
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors"
          >
            <ImagePlus className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* URL input bar */}
      {showUrlInput && (
        <div className="flex gap-2 mb-4 animate-float-in">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            placeholder="Cole o link da imagem aqui..."
            className="flex-1 h-9 rounded-xl border border-border/50 bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <button
            onClick={handleUrlSubmit}
            className="px-4 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Adicionar
          </button>
        </div>
      )}

      {images.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ImagePlus className="w-6 h-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Monte seu Dream Board</p>
            <p className="text-xs text-muted-foreground mt-1">
              Arraste imagens, cole links ou faça upload
            </p>
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {displayImages.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border border-border/30 hover:border-primary/30 transition-all hover:shadow-lg"
              onClick={() => setPreviewImg(img.src)}
            >
              <img
                src={img.src}
                alt={img.label}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-expense/80"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p className="absolute bottom-1.5 left-2 right-2 text-[10px] text-white font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {img.label}
              </p>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => setExpanded(true)}
              className="aspect-[4/3] rounded-xl border border-dashed border-border/50 flex items-center justify-center hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <span className="text-sm text-muted-foreground font-medium">
                +{images.length - 6} mais
              </span>
            </button>
          )}
        </div>
      )}

      <Dialog open={!!previewImg} onOpenChange={(open) => !open && setPreviewImg(null)}>
        <DialogContent className="max-w-3xl p-2 bg-background/95 border-border/30">
          {previewImg && (
            <img
              src={previewImg}
              alt="Dream Board"
              className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
