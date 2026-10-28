import { useEffect, useRef } from "react";
import { LangProvider } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { SEO_PAGES } from "@/lib/seoPages";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { GuestHero } from "@/components/cana/GuestHero";
import { PasarelaPlayas } from "@/components/cana/PasarelaPlayas";
import { PropertyCatalog } from "@/components/cana/PropertyCatalog";
import { Experiences } from "@/components/cana/Experiences";
import { PathSelector } from "@/components/cana/PathSelector";
import { ContactSection } from "@/components/cana/ContactSection";
import { LandingFooter } from "@/components/cana/LandingFooter";

export function HomePage() {
  const ref = useRef<HTMLDivElement>(null);

  useSeo({
    ...SEO_PAGES["/"],
    path: "/",
  });

  // Scroll to a hash target when arriving from another route (e.g. /#experiencias)
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.querySelector(window.location.hash);
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 120);
    }
  }, []);

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
        <GuestHero />
        <PasarelaPlayas />
        <PropertyCatalog />
        <Experiences />
        <PathSelector />
        <ContactSection />
        <LandingFooter />
      </div>
    </LangProvider>
  );
}
