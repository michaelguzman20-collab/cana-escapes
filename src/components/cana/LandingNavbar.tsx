import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Globe, LogIn, Home, Smartphone, Dna, Rotate3d, Wrench } from "lucide-react";
import { useLang } from "@/lib/LangContext";

// Secciones de la página de Reservas (anclas en /reservas); solo se muestran estando ahí
const NAV_LINKS = [
  { key: "nav_book_short", href: "#reservar" },
  { key: "nav_experiences", href: "#experiencias" },
  { key: "nav_contact", href: "#contacto" },
];

// Servicios es la portada ("/"): primer enlace y destacado
const SERVICES_LINK = { key: "nav_services", to: "/" };

// Sub-page links: Servicios | Reservas · Propietarios · Apps · Cana DNA · Tours 360
const ROUTE_LINKS = [
  { key: "nav_reservas", to: "/reservas" },
  { key: "nav_owners", to: "/propietarios" },
];

// Downloadable Android apps (canaescapes.com/apps) — shown right after Servicios
const APPS_LINK = { key: "nav_apps", to: "/apps" };

// Cana DNA market data (canaescapes.com/cana-dna) — shown right after Apps
const DNA_LINK = { key: "nav_cana_dna", to: "/cana-dna" };

// Recorridos virtuales 360 (canaescapes.com/tours) — shown right after Cana DNA.
// Abre en otra pestaña: es un área aparte, con su propia pantalla de carga.
const TOURS_LINK = { key: "nav_tours", to: "/tours" };

export function LandingNavbar() {
  const { lang, setLang, t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = location.pathname === "/";
  const isReservas = location.pathname === "/reservas";

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

  // Scroll to a Reservas anchor; if we're on another route, go there first then scroll.
  function scrollTo(href: string) {
    setMobileOpen(false);
    if (!isReservas) {
      navigate("/reservas" + href);
      return;
    }
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
      {/* Wider at 2xl: the Apps · Cana DNA · Tours 360 pills show their labels there and overflowed max-w-7xl */}
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo — always returns to the home page */}
          <Link
            to="/"
            onClick={() => {
              setMobileOpen(false);
              if (location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex-shrink-0"
          >
            <img src="/brand/logo-light-mark.png" alt="Cana Escapes" className="h-11 sm:h-14 w-auto" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Servicios: primer enlace y relleno ámbar */}
            <Link
              to={SERVICES_LINK.to}
              className="mr-2 flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 text-sm font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-full transition-colors shadow-lg shadow-[#F0A030]/20"
            >
              <Wrench size={14} />
              {t(SERVICES_LINK.key)}
            </Link>

            {/* Guest-facing links: Reservar · Experiencias · Contacto (solo en /reservas) */}
            {isReservas && NAV_LINKS.map((link) => (
              <button
                key={link.key}
                onClick={() => scrollTo(link.href)}
                className="group relative px-2 xl:px-3 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {t(link.key)}
                <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-[#F0A030] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
            ))}

            {/* Divider separating guest links from the business sub-pages */}
            {isReservas && <span className="mx-2 h-5 w-px bg-white/15" aria-hidden="true" />}

            {/* Sub-pages: Reservas · Propietarios — visually distinct (amber outline pills) */}
            {ROUTE_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="ml-1 px-3.5 py-1.5 text-sm font-semibold text-[#F0A030] border border-[#F0A030]/40 rounded-full hover:bg-[#F0A030] hover:text-[#0F2B4C] transition-colors"
              >
                {t(link.key)}
              </Link>
            ))}
            <Link
              to={APPS_LINK.to}
              title={t(APPS_LINK.key)}
              aria-label={t(APPS_LINK.key)}
              className="ml-1 flex items-center gap-1.5 px-2.5 2xl:px-3.5 py-1.5 text-sm font-semibold text-[#F0A030] border border-[#F0A030]/40 rounded-full hover:bg-[#F0A030] hover:text-[#0F2B4C] transition-colors"
            >
              <Smartphone size={14} />
              {/* Icon-only below 2xl so the nav fits with the Apps · Cana DNA · Tours 360 pills */}
              <span className="hidden 2xl:inline">{t(APPS_LINK.key)}</span>
            </Link>
            <Link
              to={DNA_LINK.to}
              title={t(DNA_LINK.key)}
              aria-label={t(DNA_LINK.key)}
              className="ml-1 flex items-center gap-1.5 whitespace-nowrap px-2.5 2xl:px-3.5 py-1.5 text-sm font-semibold text-[#F0A030] border border-[#F0A030]/40 rounded-full hover:bg-[#F0A030] hover:text-[#0F2B4C] transition-colors"
            >
              <Dna size={14} />
              {/* Icon-only below 2xl so the nav fits with the Apps · Cana DNA · Tours 360 pills */}
              <span className="hidden 2xl:inline">{t(DNA_LINK.key)}</span>
            </Link>
            <Link
              to={TOURS_LINK.to}
              target="_blank"
              rel="noopener"
              title={t(TOURS_LINK.key)}
              aria-label={t(TOURS_LINK.key)}
              className="ml-1 flex items-center gap-1.5 whitespace-nowrap px-2.5 2xl:px-3.5 py-1.5 text-sm font-semibold text-[#F0A030] border border-[#F0A030]/40 rounded-full hover:bg-[#F0A030] hover:text-[#0F2B4C] transition-colors"
            >
              <Rotate3d size={14} />
              {/* Icon-only below 2xl so the nav fits with the Apps · Cana DNA · Tours 360 pills */}
              <span className="hidden 2xl:inline">{t(TOURS_LINK.key)}</span>
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
              <Globe size={14} />
              <span className="uppercase font-medium">{lang === "es" ? "EN" : "ES"}</span>
            </button>

            <Link
              to="/login"
              aria-label={t("nav_login")}
              title={t("nav_login")}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap px-3 xl:px-4 py-2 text-sm font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all"
            >
              <LogIn size={14} />
              {/* Icon-only between lg and xl so the nav fits with the Apps + Cana DNA pills */}
              <span className="hidden xl:inline">{t("nav_login")}</span>
            </Link>

            {!isHome && (
              <Link
                to="/"
                aria-label={t("nav_back_home")}
                title={t("nav_back_home")}
                className="flex items-center gap-2 whitespace-nowrap px-3 xl:px-5 py-2 text-sm font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-lg transition-colors shadow-lg shadow-[#F0A030]/20"
              >
                <Home size={14} />
                {/* Icon-only between lg and xl so the nav fits with the Apps pill */}
                <span className="hidden xl:inline">{t("nav_back_home")}</span>
              </Link>
            )}
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
          <Link
            to={SERVICES_LINK.to}
            onClick={() => setMobileOpen(false)}
            className="mb-2 flex items-center gap-2 px-4 py-3 text-lg font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors"
          >
            <Wrench size={18} />
            {t(SERVICES_LINK.key)}
          </Link>

          {/* Guest-facing links (solo en /reservas) */}
          {isReservas && NAV_LINKS.map((link) => (
            <button
              key={link.key}
              onClick={() => scrollTo(link.href)}
              className="text-left px-4 py-3 text-lg font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              {t(link.key)}
            </button>
          ))}

          {/* Divider + label separating the business sub-pages */}
          <div className="mt-4 mb-1 px-4">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F0A030]/80">
              {lang === "es" ? "Más de Cana Escapes" : "More from Cana Escapes"}
            </span>
          </div>
          {ROUTE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="text-left px-4 py-3 text-lg font-semibold text-[#F0A030] border border-[#F0A030]/30 hover:bg-[#F0A030]/10 rounded-xl transition-colors"
            >
              {t(link.key)}
            </Link>
          ))}
          <Link
            to={APPS_LINK.to}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-left px-4 py-3 text-lg font-semibold text-[#F0A030] border border-[#F0A030]/30 hover:bg-[#F0A030]/10 rounded-xl transition-colors"
          >
            <Smartphone size={18} />
            {t(APPS_LINK.key)}
          </Link>
          <Link
            to={DNA_LINK.to}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-left px-4 py-3 text-lg font-semibold text-[#F0A030] border border-[#F0A030]/30 hover:bg-[#F0A030]/10 rounded-xl transition-colors"
          >
            <Dna size={18} />
            {t(DNA_LINK.key)}
          </Link>
          <Link
            to={TOURS_LINK.to}
            target="_blank"
            rel="noopener"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-left px-4 py-3 text-lg font-semibold text-[#F0A030] border border-[#F0A030]/30 hover:bg-[#F0A030]/10 rounded-xl transition-colors"
          >
            <Rotate3d size={18} />
            {t(TOURS_LINK.key)}
          </Link>
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
          {!isHome && (
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 px-6 py-3 text-center font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors"
            >
              <Home size={16} />
              {t("nav_back_home")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
