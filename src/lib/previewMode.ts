/**
 * Local-only preview switch. It is intentionally gated by Vite's dev flag so
 * a preview shortcut can never disable authentication in a production build.
 */
export const isDesignPreview = import.meta.env.DEV && import.meta.env.MODE === "design";

if (isDesignPreview && typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("conta") === "1") {
  window.sessionStorage.setItem("design_account_preview", "1");
}

// Explicit, per-tab opt-in. Real authentication is required; cloud writes stay
// disabled by isPreviewMode. The choice is never honored in production builds.
export const isAccountPreview = isDesignPreview
  && typeof window !== "undefined"
  && window.sessionStorage.getItem("design_account_preview") === "1";

export function setDesignAccountPreview(enabled: boolean) {
  if (!isDesignPreview) return;
  window.sessionStorage.setItem("design_account_preview", enabled ? "1" : "0");
  window.location.assign("/");
}

export const isPreviewMode = import.meta.env.DEV
  && import.meta.env.MODE !== "test"
  && (isDesignPreview || import.meta.env.VITE_PREVIEW_MODE === "true");
