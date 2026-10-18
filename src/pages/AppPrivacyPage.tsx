import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, ShieldCheck, UserX } from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { GuideBlockView } from "@/components/cana/GuideBlockView";
import { APP_GUIDES } from "@/content/appGuides";
import { APP_POLICIES, type AppPolicy } from "@/content/appPolicies";

type Lang = "es" | "en";

const UI = {
  es: {
    badge: "Política de privacidad",
    back: "Todas las apps",
    updated: "Última actualización:",
    guide: "Guía de uso",
    delete: "Borrar mi cuenta",
  },
  en: {
    badge: "Privacy policy",
    back: "All apps",
    updated: "Last updated:",
    guide: "User guide",
    delete: "Delete my account",
  },
};

function formatDate(iso: string, l: Lang) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(l === "es" ? "es-DO" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PolicyContent({ policy }: { policy: AppPolicy }) {
  const { lang, setLang } = useLang();
  const l: Lang = lang === "en" ? "en" : "es";
  const ui = UI[l];
  const app = APP_GUIDES[policy.slug];

  // ?lang=en|es fuerza el idioma (útil para enlazar la versión en inglés desde las tiendas)
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("lang");
    if (forced === "es" || forced === "en") setLang(forced);
    if (!window.location.hash) window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <LandingNavbar />

      <header className="bg-[#0F2B4C] pt-28 pb-20 sm:pt-36 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/apps" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
            <ArrowLeft size={15} />
            {ui.back}
          </Link>
          <div className="mt-6 flex items-center gap-4 sm:gap-5">
            <img src={app.icon} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-md flex-shrink-0" />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
                <ShieldCheck size={14} />
                {ui.badge}
              </span>
              <h1 className="mt-1 text-3xl sm:text-4xl font-serif font-bold text-white">{app.name}</h1>
            </div>
          </div>
          <p className="mt-5 text-lg text-white/70 leading-relaxed">{policy.intro[l]}</p>
          <p className="mt-3 text-sm text-white/50">
            {ui.updated} {formatDate(policy.updated, l)}
          </p>
        </div>
      </header>

      <main className="-mt-10 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          {policy.sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 rounded-3xl bg-white border border-[#0F2B4C]/10 p-5 sm:p-7 first:shadow-xl first:shadow-[#0F2B4C]/5"
            >
              <h2 className="flex items-center gap-3 text-xl font-serif font-bold text-[#0F2B4C]">
                <span className="text-2xl">{s.emoji}</span>
                {s.title[l]}
              </h2>
              <div className="mt-4 space-y-4">
                {s.blocks.map((b, bi) => (
                  <GuideBlockView key={bi} block={b} l={l} />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to={`/apps/${policy.slug}/guia`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] border border-[#0F2B4C]/20 hover:bg-[#0F2B4C]/5 rounded-xl transition-colors"
            >
              <BookOpen size={18} />
              {ui.guide}
            </Link>
            {policy.slug === "cana-track" && (
              <Link
                to="/apps/cana-track/borrar-cuenta"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] border border-[#0F2B4C]/20 hover:bg-[#0F2B4C]/5 rounded-xl transition-colors"
              >
                <UserX size={18} />
                {ui.delete}
              </Link>
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export function AppPrivacyPage() {
  const { slug = "" } = useParams();
  const policy = APP_POLICIES[slug];
  const name = APP_GUIDES[slug]?.name;

  useSeo({
    title: policy ? `Política de privacidad de ${name} — Cana Escapes` : "Apps — Cana Escapes",
    description: policy
      ? `Qué datos usa ${name}, quién los ve, cuánto tiempo se guardan y cómo borrarlos.`
      : "Apps de Cana Escapes para Android.",
    path: policy ? `/apps/${slug}/privacidad` : "/apps",
  });

  if (!policy || !name) return <Navigate to="/apps" replace />;

  return (
    <LangProvider>
      <PolicyContent policy={policy} />
    </LangProvider>
  );
}
