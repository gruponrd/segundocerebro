import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useFinanceStore } from "@/stores/financeStore";

/** Presentation only: providers and route state stay mounted and values never tween. */
export function WorkspaceMotion({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { selectedMonth } = useFinanceStore();
  const host = useRef<HTMLDivElement>(null);
  const previous = useRef({ pathname, selectedMonth });

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = { pathname, selectedMonth };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Map<Element, Animation>();
    const stop = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    const animate = (target: Element, keyframes: Keyframe[], duration: number) => {
      if (reduced.matches || typeof target.animate !== "function") return;
      animations.get(target)?.cancel();
      const animation = target.animate(keyframes, { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
      animations.set(target, animation);
      animation.addEventListener?.("finish", () => { if (animations.get(target) === animation) animations.delete(target); }, { once: true });
    };
    const onToggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      const panel = details.querySelector(":scope > div");
      if (!panel) return;
      if (!details.open) { animations.get(panel)?.cancel(); animations.delete(panel); return; }
      animate(panel, [{ opacity: 0.8 }, { opacity: 1 }], 200);
    };
    const root = host.current;
    root?.addEventListener("toggle", onToggle, true);
    reduced.addEventListener("change", stop);
    let pendingPage: MutationObserver | undefined;
    const frame = requestAnimationFrame(() => {
      const el = host.current;
      if (!el || reduced.matches || typeof el.animate !== "function") return;
      if (old.pathname !== pathname) {
        // Lazy routes reveal when content arrives, not while the loading fallback is visible.
        const reveal = () => {
          if (el.querySelector(".workspace-route-loading")) return false;
          animate(el, [{ opacity: 0.85, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], 240);
          return true;
        };
        if (!reveal()) {
          pendingPage = new MutationObserver(() => { if (reveal()) pendingPage?.disconnect(); });
          pendingPage.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
        }
      } else if (old.selectedMonth !== selectedMonth) {
        // Both plots reveal the same new horizon. Actual figures update immediately.
        el.querySelectorAll(".panorama-plot").forEach(plot => {
          animate(plot, [{ opacity: 0.65, transform: `translateX(${selectedMonth > old.selectedMonth ? 6 : -6}px)` }, { opacity: 1, transform: "translateX(0)" }], 260);
        });
        el.querySelectorAll('[aria-label="Saldo projetado do período"], [aria-label="Selecionar período"]').forEach(summary => {
          animate(summary, [{ opacity: 0.75 }, { opacity: 1 }], 180);
        });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      pendingPage?.disconnect();
      stop();
      root?.removeEventListener("toggle", onToggle, true);
      reduced.removeEventListener("change", stop);
    };
  }, [pathname, selectedMonth]);

  return <div ref={host} className="workspace-motion">{children}</div>;
}
