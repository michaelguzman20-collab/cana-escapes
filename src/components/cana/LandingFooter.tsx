import { MessageCircle, Instagram } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const WA_URL = "https://wa.me/18092102773";
const IG_URL = "https://instagram.com/canaescapes";

export function LandingFooter() {
  const { t } = useLang();

  const navLinks = [
    { label: t("nav_book"), href: "#reservar" },
    { label: t("nav_why"), href: "#porque" },
    { label: t("nav_owners"), href: "#propietarios" },
    { label: t("nav_returns"), href: "#calculadora" },
    { label: t("nav_contact"), href: "#contacto" },
  ];

  function scrollTo(href: string) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <footer className="bg-[#0F2B4C] text-white/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
            {/* Logo & desc */}
            <div>
              <div className="mb-4">
                <img src="/brand/logo-light.png" alt="Cana Escapes" className="h-20 w-auto" />
              </div>
              <p className="text-sm text-white/50 leading-relaxed">{t("footer_desc")}</p>
              <a
                href={IG_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Cana Escapes"
                className="mt-4 inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#F0A030] transition-colors"
              >
                <Instagram size={18} />
                <span>@canaescapes</span>
              </a>
            </div>

            {/* Nav */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t("footer_nav")}</h4>
              <div className="space-y-2">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollTo(link.href)}
                    className="block text-sm text-white/50 hover:text-[#F0A030] transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">{t("footer_contact")}</h4>
              <div className="space-y-2 text-sm text-white/50">
                <p>+1 (809) 210-2773</p>
                <p>michael@canaescapes.com</p>
                <p>Punta Cana, Rep. Dominicana</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/30">
              {t("footer_rights").replace("{year}", String(new Date().getFullYear()))}
            </p>
            <p className="text-xs text-white/30">{t("footer_made")}</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="group fixed bottom-6 right-6 z-50 w-14 h-14 animate-float"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-green-500 opacity-60 animate-ping" />
        {/* Button */}
        <span className="relative w-14 h-14 bg-green-500 group-hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
          <MessageCircle size={26} />
        </span>
      </a>
    </>
  );
}
