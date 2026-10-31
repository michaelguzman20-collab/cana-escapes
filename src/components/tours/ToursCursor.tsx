import { useEffect, useRef, useState } from "react";
import { LOADER_IMG } from "@/components/tours/markerHtml";

/**
 * Solo en computadora (mouse): el ícono 360 animado acompaña al cursor por la página de Tours 360.
 * Es una sola imagen fija que se mueve con transform en requestAnimationFrame, así no pesa:
 * no re-renderiza React ni toca el diseño de la página. En teléfonos y tabletas no se monta.
 */
export function ToursCursor() {
  const [enabled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let x = 0;
    let y = 0;
    let raf = 0;
    const paint = () => {
      raf = 0;
      el.style.transform = `translate3d(${x + 16}px, ${y + 16}px, 0)`;
    };
    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    // Al salir de la ventana se esconde
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) el.style.opacity = "0";
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onOut);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <img
      ref={ref}
      src={LOADER_IMG}
      alt=""
      aria-hidden="true"
      className="fixed left-0 top-0 z-[90] w-8 h-8 pointer-events-none opacity-0 transition-opacity duration-300 will-change-transform drop-shadow-[0_1px_3px_rgba(15,43,76,0.6)]"
    />
  );
}
