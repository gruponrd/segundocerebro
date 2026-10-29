export const MAX_CARD_LOGO_SOURCE_BYTES = 5 * 1024 * 1024;
export const MAX_CARD_LOGO_DATA_URL_LENGTH = 180_000;
const MAX_CARD_LOGO_DIMENSION = 512;

export function isCardLogoDataUrl(value?: string): value is string {
  return typeof value === "string"
    && value.length <= MAX_CARD_LOGO_DATA_URL_LENGTH
    && /^data:image\/png;base64,[A-Za-z0-9+/]*={0,2}$/.test(value);
}

export async function prepareCardLogo(file: File): Promise<string> {
  if (file.type !== "image/png" && file.type !== "image/jpeg") {
    throw new Error("Escolha uma imagem PNG ou JPEG (JPG).");
  }
  if (file.size > MAX_CARD_LOGO_SOURCE_BYTES) {
    throw new Error("A imagem deve ter até 5 MB. Reduza o arquivo e tente novamente.");
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler esse arquivo."));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível ler esse arquivo."));
    };
    reader.readAsDataURL(file);
  });

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onerror = () => reject(new Error("Essa imagem não pôde ser aberta."));
    image.onload = () => resolve();
    image.src = source;
  });

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) throw new Error("Esse arquivo não contém uma imagem válida.");
  if (width * height > 40_000_000) throw new Error("As dimensões da imagem são muito grandes. Use uma imagem menor.");

  const scale = Math.min(1, MAX_CARD_LOGO_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem neste navegador.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Normalize both inputs to the stored PNG format; existing logos and alpha stay compatible.
  const optimized = canvas.toDataURL("image/png");
  if (!isCardLogoDataUrl(optimized)) {
    throw new Error("O logo ainda ficou grande após a otimização. Use uma imagem mais simples ou menor.");
  }
  return optimized;
}
