import { useEffect, useState } from "react";
import { Tours360Logo } from "@/components/tours/Tours360Logo";

/**
 * Intro de Tours 360 (canaescapes.com/tours abre en otra pestaña), igual que la de la portada:
 * 1) el aro y las flechas se dibujan juntos; al cerrarse el aro suben el nombre y el texto de abajo,
 * 2) las dos flechas giran a la vez.
 * Fondo azul para marcar que es otra área.
 */
export function ToursSplash({ onDone, hold = 3600 }: { onDone: () => void; hold?: number }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }
    const fadeTimer = window.setTimeout(() => setFading(true), hold);
    const doneTimer = window.setTimeout(onDone, hold + 600);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [hold, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0F2B4C] transition-opacity [transition-duration:600ms] ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(240,160,48,0.16),transparent_60%)]" />

      <Tours360Logo intro size={132} className="relative drop-shadow-[0_8px_30px_rgba(240,160,48,0.25)]" />

      {/* Suben justo cuando el aro termina de cerrarse (~1.3 s) */}
      <p
        className="splash-name relative mt-8 font-serif font-bold text-white leading-none text-[clamp(2.4rem,9vw,3.6rem)]"
        style={{ animationDelay: "1.15s" }}
      >
        Tours 360<span className="align-super text-[0.55em] leading-none text-[#F0A030]">°</span>
      </p>
      <div className="splash-name relative mt-4 h-px w-[min(70vw,320px)] bg-white/15" style={{ animationDelay: "1.3s" }} />
      <p
        className="splash-name relative mt-4 text-center font-sans uppercase tracking-[0.35em] text-[clamp(0.6rem,2.2vw,0.8rem)] text-[#F0A030]/85"
        style={{ animationDelay: "1.4s" }}
      >
        Recorridos virtuales · Cana Escapes
      </p>
    </div>
  );
}
