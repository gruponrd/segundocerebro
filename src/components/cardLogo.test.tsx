import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankLogo } from "@/components/BankLogo";
import { CardLogoField } from "@/components/CardLogoField";
import { MAX_CARD_LOGO_SOURCE_BYTES, prepareCardLogo } from "@/lib/cardLogo";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("logo do cartão", () => {
  it("mostra a prévia e permite remover o logo do cartão selecionado", () => {
    const onChange = vi.fn();
    render(<CardLogoField bankName="Cartão azul" value="data:image/png;base64,logo" onChange={onChange} />);

    expect(screen.getByAltText("Prévia do logo de Cartão azul")).toHaveAttribute("src", "data:image/png;base64,logo");
    fireEvent.click(screen.getByRole("button", { name: "Remover logo de Cartão azul" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("rejeita arquivos que não sejam PNG e imagens grandes demais", async () => {
    await expect(prepareCardLogo(new File(["image"], "logo.jpg", { type: "image/jpeg" })))
      .rejects.toThrow("Escolha uma imagem no formato PNG");
    await expect(prepareCardLogo({ type: "image/png", size: MAX_CARD_LOGO_SOURCE_BYTES + 1 } as File))
      .rejects.toThrow("até 5 MB");
  });

  it("redimensiona o PNG antes de guardá-lo junto ao cartão", async () => {
    class MockImage {
      naturalWidth = 1024;
      naturalHeight = 512;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    const drawImage = vi.fn();
    vi.stubGlobal("Image", MockImage);
    vi.spyOn(FileReader.prototype, "readAsDataURL").mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, "result", { configurable: true, value: "data:image/png;base64,original" });
      queueMicrotask(() => this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>));
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,optimized");

    await expect(prepareCardLogo(new File(["image"], "logo.png", { type: "image/png" })))
      .resolves.toBe("data:image/png;base64,optimized");
    expect(drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 512, 256);
  });

  it("aplica o logo enviado em cartões renderizados", () => {
    render(<BankLogo bank={{ name: "Meu banco", logoDataUrl: "data:image/png;base64,logo" }} />);
    expect(screen.getByAltText("Logo de Meu banco")).toBeInTheDocument();
  });
});
