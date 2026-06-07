import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Globe, LogIn } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const NAV_LINKS = [
  { key: "nav_book", href: "#reservar" },
  { key: "nav_why", href: "#porque" },
  { key: "nav_owners", href: "#propietarios" },
  { key: "nav_returns", href: "#calculadora" },
  { key: "nav_contact", href: "#contacto" },
];

export function LandingNavbar() {
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock background scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function scrollTo(href: string) {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        mobileOpen
          ? "bg-[#0F2B4C] shadow-lg"
          : scrolled
          ? "bg-[#0F2B4C]/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex-shrink-0">
            <img src="/brand/logo-light-mark.png" alt="Cana Escapes" className="h-11 sm:h-14 w-auto" />
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.key}
                onClick={() => scrollTo(link.href)}
                className="group relative px-3 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {t(link.key)}
                <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-[#F0A030] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
            ))}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Globe size={14} />
              <span className="uppercase font-medium">{lang === "es" ? "EN" : "ES"}</span>
            </button>

            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all"
            >
              <LogIn size={14} />
              {t("nav_login")}
            </Link>

            <button
              onClick={() => scrollTo("#contacto")}
              className="px-5 py-2 text-sm font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-lg transition-colors shadow-lg shadow-[#F0A030]/20"
            >
              {t("nav_cta")}
            </button>
          </div>

          {/* Mobile right: language toggle (outside menu) + menu button */}
          <div className="lg:hidden flex items-center gap-1">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              aria-label="Cambiar idioma"
              className="flex items-center gap-1 px-2.5 py-2 text-white/75 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Globe size={18} />
              <span className="text-xs font-semibold uppercase">{lang === "es" ? "EN" : "ES"}</span>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menú"
              className="p-2 text-white/70 hover:text-white"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 top-16 bg-[#0F2B4C] overflow-y-auto overscroll-contain transition-all duration-300 ${
          mobileOpen ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex flex-col px-6 py-8 gap-2">
          {NAV_LINKS.map((link) => (
            <button
              key={link.key}
              onClick={() => scrollTo(link.href)}
              className="text-left px-4 py-3 text-lg font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              {t(link.key)}
            </button>
          ))}
          <div className="border-t border-white/10 my-4" />
          <button
            onClick={() => { setLang(lang === "es" ? "en" : "es"); }}
            className="flex items-center gap-2 px-4 py-3 text-white/60 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <Globe size={16} />
            <span>{lang === "es" ? "English" : "Español"}</span>
          </button>
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-4 py-3 text-white/80 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <LogIn size={16} />
            {t("nav_login")}
          </Link>
          <button
            onClick={() => scrollTo("#contacto")}
            className="mt-2 px-6 py-3 text-center font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors"
          >
            {t("nav_cta")}
          </button>
        </div>
      </div>
    </nav>
  );
}
