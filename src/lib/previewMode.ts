/**
 * Local-only preview switch. It is intentionally gated by Vite's dev flag so
 * a preview shortcut can never disable authentication in a production build.
 */
export const isPreviewMode = import.meta.env.DEV
  && import.meta.env.MODE !== "test"
  && import.meta.env.VITE_PREVIEW_MODE === "true";
