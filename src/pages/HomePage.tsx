import { useEffect, useRef } from "react";
import { LangProvider } from "@/lib/LangContext";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { Hero } from "@/components/cana/Hero";
import { PropertyCatalog } from "@/components/cana/PropertyCatalog";
import { OwnerValueProp } from "@/components/cana/OwnerValueProp";
import { EarningsCalculator } from "@/components/cana/EarningsCalculator";
import { ContactSection } from "@/components/cana/ContactSection";
import { PlatformsStrip } from "@/components/cana/PlatformsStrip";
import { LandingFooter } from "@/components/cana/LandingFooter";

export function HomePage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Reveal each content section (skip the hero, which animates on load; ignores navbar + WhatsApp button)
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

    reveal(); // reveal whatever is already in view on load
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);

    // Failsafe: never leave content hidden if scroll events never fire
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
        <PropertyCatalog />
        <OwnerValueProp />
        <EarningsCalculator />
        <ContactSection />
        <PlatformsStrip />
        <LandingFooter />
      </div>
    </LangProvider>
  );
}
