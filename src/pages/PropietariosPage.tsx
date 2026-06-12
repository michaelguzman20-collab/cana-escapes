import { useEffect, useRef } from "react";
import { LangProvider } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { Hero } from "@/components/cana/Hero";
import { OwnerValueProp } from "@/components/cana/OwnerValueProp";
import { EarningsCalculator } from "@/components/cana/EarningsCalculator";
import { ContactSection } from "@/components/cana/ContactSection";
import { PlatformsStrip } from "@/components/cana/PlatformsStrip";
import { LandingFooter } from "@/components/cana/LandingFooter";

export function PropietariosPage() {
  const ref = useRef<HTMLDivElement>(null);

  useSeo({
    title: "Para Propietarios | Gestión de Propiedades en Punta Cana — Cana Escapes",
    description:
      "Gestionamos tu propiedad en Punta Cana con tecnología, transparencia y máximos retornos: comisiones progresivas, mantenimiento preventivo y reportes financieros claros.",
    path: "/propietarios",
  });

  // Start at the top when navigating in from another route
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = (
      Array.from(root.querySelectorAll(":scope > section, :scope > footer")) as HTMLElement[]
    ).filter((_, i) => i !== 0);
    targets.forEach((el) => el.classList.add("reveal"));

    let pending = targets.slice();
    const reveal = () => {
      const trigger = window.innerHeight * 0.88;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < trigger) {
          el.classList.add("is-visible");
          return false;
        }
        return true;
      });
      if (pending.length === 0) {
        window.removeEventListener("scroll", reveal);
        window.removeEventListener("resize", reveal);
      }
    };

    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);

    const failsafe = window.setTimeout(() => {
      targets.forEach((el) => el.classList.add("is-visible"));
    }, 3000);

    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <LangProvider>
      <div ref={ref} className="min-h-screen bg-white">
        <LandingNavbar />
        <Hero />
        <OwnerValueProp />
        <EarningsCalculator />
        <ContactSection defaultTab="owner" />
        <PlatformsStrip />
        <LandingFooter />
      </div>
    </LangProvider>
  );
}
