import { MessageCircle } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { Logo } from "@/components/layout/Logo";

const WA_URL = "https://wa.me/18092102773";

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
                <Logo size="md" variant="light" />
              </div>
              <p className="text-sm text-white/50 leading-relaxed">{t("footer_desc")}</p>
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
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
      >
        <MessageCircle size={26} />
      </a>
    </>
  );
}
