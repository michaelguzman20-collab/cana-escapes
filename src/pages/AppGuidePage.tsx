import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Download, ShieldCheck, Smartphone, UserX } from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { APP_GUIDES, guidePdfUrl, type AppGuide } from "@/content/appGuides";
import { GuideBlockView as Block } from "@/components/cana/GuideBlockView";

type Lang = "es" | "en";

const UI = {
  es: {
    badge: "Guía de uso",
    pdf: "Descargar PDF",
    getApp: "Descargar la app",
    back: "Todas las apps",
    toc: "En esta guía",
    printUrl: "Guía en línea y descarga de la app:",
    privacy: "Política de privacidad",
    deleteAccount: "Borrar mi cuenta",
  },
  en: {
    badge: "User guide",
    pdf: "Download PDF",
    getApp: "Get the app",
    back: "All apps",
    toc: "In this guide",
    printUrl: "Online guide and app download:",
    privacy: "Privacy policy",
    deleteAccount: "Delete my account",
  },
};

function GuideContent({ guide }: { guide: AppGuide }) {
  const { lang, setLang } = useLang();
  const l: Lang = lang === "en" ? "en" : "es";
  const ui = UI[l];

  // ?lang=en|es fuerza el idioma (lo usa el script que genera los PDF)
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("lang");
    if (forced === "es" || forced === "en") setLang(forced);
    if (!window.location.hash) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] print:bg-white print:min-h-0">
      <style>{`@page { size: A4; margin: 14mm 12mm; }
@media print { html, body, #root { background: #fff !important; min-height: 0 !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="print:hidden">
        <LandingNavbar />
      </div>

      <header className="bg-[#0F2B4C] pt-28 pb-20 sm:pt-36 sm:pb-24 print:bg-white print:pt-0 print:pb-6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link
            to="/apps"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white print:hidden"
          >
            <ArrowLeft size={15} />
            {ui.back}
          </Link>
          <div className="mt-6 flex items-center gap-4 sm:gap-5 print:mt-0">
            <img src={guide.icon} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-md flex-shrink-0" />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em] print:text-[#b8761a]">
                <BookOpen size={14} />
                {ui.badge}
              </span>
              <h1 className="mt-1 text-3xl sm:text-4xl font-serif font-bold text-white print:text-[#0F2B4C]">
                {guide.name}
              </h1>
            </div>
          </div>
          <p className="mt-5 text-lg text-white/70 leading-relaxed print:text-[#0F2B4C]/70 print:mt-3">
            {guide.tagline[l]}
          </p>
          <p className="hidden print:block mt-2 text-sm text-[#0F2B4C]/50">
            {ui.printUrl} canaescapes.com/apps/{guide.slug}/guia
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 print:hidden">
            <a
              href={guidePdfUrl(guide.slug, l)}
              download
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors shadow-lg shadow-[#F0A030]/25"
            >
              <Download size={18} />
              {ui.pdf}
            </a>
            <Link
              to="/apps"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-white border border-white/25 hover:bg-white/10 rounded-xl transition-colors"
            >
              <Smartphone size={18} />
              {ui.getApp}
            </Link>
          </div>
        </div>
      </header>

      <main className="-mt-10 pb-16 print:mt-0 print:pb-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <nav className="rounded-3xl bg-white border border-[#0F2B4C]/10 shadow-xl shadow-[#0F2B4C]/5 p-5 sm:p-6 print:shadow-none">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0F2B4C]/50">{ui.toc}</h2>
            {guide.parts.map((part, pi) => (
              <div key={pi}>
                {part.title && (
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#b8761a]">{part.title[l]}</p>
                )}
                <ol className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {part.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="flex items-center gap-2 py-1.5 text-[#0F2B4C]/80 hover:text-[#b8761a]"
                      >
                        <span className="w-6 text-center print:hidden">{s.emoji}</span>
                        <span>{s.title[l]}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </nav>

          {guide.parts.map((part, pi) => (
            <div key={pi} className="space-y-6">
              {part.title && (
                <div className="pt-6 break-after-avoid">
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C]">{part.title[l]}</h2>
                  {part.subtitle && <p className="mt-1 text-[#0F2B4C]/60">{part.subtitle[l]}</p>}
                </div>
              )}
              {part.sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24 rounded-3xl bg-white border border-[#0F2B4C]/10 p-5 sm:p-7 print:rounded-xl"
                >
                  <h3 className="flex items-center gap-3 text-xl font-serif font-bold text-[#0F2B4C] break-after-avoid">
                    <span className="text-2xl print:hidden">{s.emoji}</span>
                    {s.title[l]}
                  </h3>
                  <div className="mt-4 space-y-4">
                    {s.blocks.map((b, bi) => (
                      <Block key={bi} block={b} l={l} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))}

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm print:hidden">
            <Link
              to={`/apps/${guide.slug}/privacidad`}
              className="inline-flex items-center gap-1.5 text-[#0F2B4C]/60 hover:text-[#b8761a]"
            >
              <ShieldCheck size={15} />
              {ui.privacy}
            </Link>
            {guide.slug === "cana-track" && (
              <Link
                to="/apps/cana-track/borrar-cuenta"
                className="inline-flex items-center gap-1.5 text-[#0F2B4C]/60 hover:text-[#b8761a]"
              >
                <UserX size={15} />
                {ui.deleteAccount}
              </Link>
            )}
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <LandingFooter />
      </div>
    </div>
  );
}

export function AppGuidePage() {
  const { slug = "" } = useParams();
  const guide = APP_GUIDES[slug];

  useSeo({
    title: guide ? `Guía de uso de ${guide.name} — Cana Escapes` : "Apps — Cana Escapes",
    description: guide
      ? `Cómo usar ${guide.name} paso a paso: ${guide.tagline.es} Disponible también en PDF.`
      : "Apps de Cana Escapes para Android.",
    path: guide ? `/apps/${guide.slug}/guia` : "/apps",
  });

  if (!guide) return <Navigate to="/apps" replace />;

  return (
    <LangProvider>
      <GuideContent guide={guide} />
    </LangProvider>
  );
}
