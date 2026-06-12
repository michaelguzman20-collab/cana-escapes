import { Instagram } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLang } from "@/lib/LangContext";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";

const WA_URL = "https://wa.me/18092102773";
const IG_URL = "https://instagram.com/canaescapes";

export function LandingFooter() {
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: t("nav_book_short"), href: "#reservar" },
    { label: t("nav_experiences"), href: "#experiencias" },
    { label: t("nav_services"), href: "/servicios" },
    { label: t("nav_contact"), href: "#contacto" },
    { label: t("nav_owner_btn"), href: "/propietarios" },
  ];

  function go(href: string) {
    if (href.startsWith("/")) {
      navigate(href);
      window.scrollTo(0, 0);
      return;
    }
    if (location.pathname !== "/") {
      navigate("/" + href);
      return;
    }
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
                    onClick={() => go(link.href)}
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
        aria-label={t("wa_float_label")}
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-3 animate-float"
      >
        {/* Inviting label (slides in on hover, desktop) */}
        <span className="hidden sm:flex items-center whitespace-nowrap px-4 py-2 rounded-full bg-white text-[#0F2B4C] text-sm font-semibold shadow-lg opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          {t("wa_float_label")}
        </span>

        {/* Button */}
        <span className="relative w-16 h-16 flex-shrink-0">
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-70 animate-ping" />
          {/* Circle */}
          <span className="relative w-16 h-16 bg-[#25D366] group-hover:bg-[#1ebe5d] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#25D366]/40 group-hover:shadow-2xl transition-all duration-300 group-hover:scale-110">
            <WhatsAppIcon size={34} />
          </span>
          {/* New-message badge */}
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
            1
          </span>
        </span>
      </a>
    </>
  );
}
