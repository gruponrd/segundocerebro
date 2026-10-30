import { useEffect, useRef } from "react";
import { money } from "@/lib/planningTools";

/** Presentation only: never mutates or rounds the stored financial values. */
export function AnimatedAmount({ value, className = "" }: { value: number; className?: string }) {
  const target = Number.isFinite(value) ? value : 0;
  const element = useRef<HTMLSpanElement>(null);
  const displayed = useRef(0);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const from = displayed.current;
    let frame = 0;
    let started: number | null = null;
    let motion: Animation | undefined;
    const finish = () => {
      cancelAnimationFrame(frame);
      motion?.cancel();
      displayed.current = target;
      node.textContent = money(target);
    };
    const onPreference = () => { if (preference.matches) finish(); };
    preference.addEventListener("change", onPreference);
    if (preference.matches || from === target) finish();
    else {
      node.textContent = money(from);
      motion = node.animate([{ transform: "translateY(4px)", opacity: .75 }, { transform: "translateY(0)", opacity: 1 }], { duration: 360, easing: "cubic-bezier(.16,1,.3,1)" });
      const tick = (time: number) => {
        started ??= time;
        const progress = Math.min(1, (time - started) / 540);
        const eased = 1 - Math.pow(1 - progress, 4);
        displayed.current = from + (target - from) * eased;
        node.textContent = money(displayed.current);
        if (progress < 1) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
      motion?.cancel();
      preference.removeEventListener("change", onPreference);
    };
  }, [target]);
  return <span className={`cl-amount cl-counter ${className}`}><span className="cl-sr">{money(target)}</span><span className="cl-counter-digits" aria-hidden="true" ref={element}>{money(target)}</span></span>;
}
