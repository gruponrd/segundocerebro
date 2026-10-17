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
    const animations: Animation[] = [];
    const stop = () => animations.forEach(animation => animation.cancel());
    reduced.addEventListener("change", stop);
    const frame = requestAnimationFrame(() => {
      const el = host.current;
      if (!el || reduced.matches || typeof el.animate !== "function") return;
      const animate = (target: Element, keyframes: Keyframe[], duration: number) => {
        const animation = target.animate(keyframes, { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
        animations.push(animation);
      };
      if (old.pathname !== pathname) {
        // A short crossfade explains navigation without displacing text or focus.
        animate(el, [{ opacity: 0.88 }, { opacity: 1 }], 180);
      } else if (old.selectedMonth !== selectedMonth) {
        // Both plots reveal the same new horizon. Actual figures update immediately.
        el.querySelectorAll(".panorama-plot").forEach(plot => {
          animate(plot, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }], 320);
        });
        el.querySelectorAll('[aria-label="Saldo projetado do período"], [aria-label="Selecionar período"]').forEach(summary => {
          animate(summary, [{ filter: "brightness(1.15)" }, { filter: "brightness(1)" }], 240);
        });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      stop();
      reduced.removeEventListener("change", stop);
    };
  }, [pathname, selectedMonth]);

  return <div ref={host} className="workspace-motion">{children}</div>;
}
