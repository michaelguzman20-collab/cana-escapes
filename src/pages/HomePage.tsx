import { LangProvider } from "@/lib/LangContext";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { Hero } from "@/components/cana/Hero";
import { PropertyCatalog } from "@/components/cana/PropertyCatalog";
import { OwnerValueProp } from "@/components/cana/OwnerValueProp";
import { EarningsCalculator } from "@/components/cana/EarningsCalculator";
import { ContactSection } from "@/components/cana/ContactSection";
import { LandingFooter } from "@/components/cana/LandingFooter";

export function HomePage() {
  return (
    <LangProvider>
      <div className="min-h-screen bg-white">
        <LandingNavbar />
        <Hero />
        <PropertyCatalog />
        <OwnerValueProp />
        <EarningsCalculator />
        <ContactSection />
        <LandingFooter />
      </div>
    </LangProvider>
  );
}
