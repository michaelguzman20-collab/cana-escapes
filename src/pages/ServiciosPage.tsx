import { useEffect, useRef } from "react";
import {
  Zap, Droplets, Wind, Building2, Trees, ClipboardList,
  FileText, Receipt, MessageSquare, ShieldCheck,
  Cpu, Users, Building, Home, Briefcase, KeyRound, Lightbulb,
  MapPin, Mail, ArrowRight, CheckCircle2,
} from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";

const WA_URL = "https://wa.me/18092102773";
const MAIL = "mailto:michael@canaescapes.com";

// Residential condominium structures / common areas backdrop
const HERO_IMG =
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1920&q=80";

const SERVICES = [
  { icon: Zap, nameKey: "svc_s1_name", descKey: "svc_s1_desc" },
  { icon: Droplets, nameKey: "svc_s2_name", descKey: "svc_s2_desc" },
  { icon: Wind, nameKey: "svc_s3_name", descKey: "svc_s3_desc" },
  { icon: Building2, nameKey: "svc_s4_name", descKey: "svc_s4_desc" },
  { icon: Trees, nameKey: "svc_s5_name", descKey: "svc_s5_desc" },
  { icon: ClipboardList, nameKey: "svc_s6_name", descKey: "svc_s6_desc" },
];

const STEPS = [
  { titleKey: "svc_p1_title", descKey: "svc_p1_desc" },
  { titleKey: "svc_p2_title", descKey: "svc_p2_desc" },
  { titleKey: "svc_p3_title", descKey: "svc_p3_desc" },
  { titleKey: "svc_p4_title", descKey: "svc_p4_desc" },
  { titleKey: "svc_p5_title", descKey: "svc_p5_desc" },
];

const COMMITMENTS = [
  { icon: FileText, titleKey: "svc_c1_title", descKey: "svc_c1_desc" },
  { icon: Receipt, titleKey: "svc_c2_title", descKey: "svc_c2_desc" },
  { icon: MessageSquare, titleKey: "svc_c3_title", descKey: "svc_c3_desc" },
  { icon: ShieldCheck, titleKey: "svc_c4_title", descKey: "svc_c4_desc" },
];

const PILLS = ["svc_pill1", "svc_pill2", "svc_pill3", "svc_pill4", "svc_pill5", "svc_pill6"];

const CLIENTS = [
  { icon: Users, labelKey: "svc_w1_label", subKey: "svc_w1_sub" },
  { icon: Building, labelKey: "svc_w2_label", subKey: "svc_w2_sub" },
  { icon: Home, labelKey: "svc_w3_label", subKey: "svc_w3_sub" },
  { icon: Briefcase, labelKey: "svc_w4_label", subKey: "svc_w4_sub" },
  { icon: KeyRound, labelKey: "svc_w5_label", subKey: "svc_w5_sub" },
  { icon: Lightbulb, labelKey: "svc_w6_label", subKey: "svc_w6_sub" },
];

const STATS = [
  { valKey: "svc_stat1_val", labelKey: "svc_stat1_label" },
  { valKey: "svc_stat2_val", labelKey: "svc_stat2_label" },
  { valKey: "svc_stat3_val", labelKey: "svc_stat3_label" },
  { valKey: "svc_stat4_val", labelKey: "svc_stat4_label" },
];

/** Small radial progress ring used for the "commitment" graphics. */
function RadialStat({ percent, label, big }: { percent: number; label: string; big: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(15,43,76,0.08)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r} fill="none" stroke="#F0A030" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-serif font-bold text-[#0F2B4C]">{big}</span>
        </div>
      </div>
      <span className="mt-3 text-sm font-medium text-[#0F2B4C] max-w-[10rem]">{label}</span>
    </div>
  );
}

function ServiciosContent() {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);
    const failsafe = window.setTimeout(() => targets.forEach((el) => el.classList.add("is-visible")), 3000);
    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div ref={ref} className="min-h-screen bg-white">
      <LandingNavbar />

      {/* ── HERO ── */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMG}
            alt="Áreas comunes de un condominio moderno en Punta Cana"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f36]/95 via-[#0F2B4C]/80 to-[#0F2B4C]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f36]/80 via-transparent to-[#0a1f36]/25" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#F0A030]/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-5 backdrop-blur-sm">
              <MapPin size={14} className="text-[#F0A030]" />
              <span className="text-sm text-white/75 font-medium">{t("svc_hero_eyebrow")}</span>
            </div>
            <div className="inline-block bg-[#F0A030] text-[#0F2B4C] text-xs font-semibold px-3 py-1.5 rounded-full mb-5 ml-0 sm:ml-3 tracking-wide">
              {t("svc_hero_badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-4">
              {t("svc_hero_title")}
            </h1>
            <p className="text-base sm:text-lg text-[#F0A030] font-medium mb-4">{t("svc_hero_sub")}</p>
            <p className="text-lg text-white/70 leading-relaxed max-w-2xl mb-8">{t("svc_hero_desc")}</p>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 px-8 py-4 text-base font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-all duration-300 shadow-xl shadow-[#F0A030]/20 hover:-translate-y-0.5"
            >
              <WhatsAppIcon size={18} />
              {t("svc_hero_cta")}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <p className="text-sm text-white/40 italic mt-6">{t("svc_hero_tagline")}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ── KPI STATS BAND (gráfica) ── */}
      <section className="bg-white -mt-12 relative z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-gray-100 rounded-2xl shadow-lg p-6 sm:p-8">
            {STATS.map((s) => (
              <div key={s.labelKey} className="text-center">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-[#F0A030]">{t(s.valKey)}</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">{t(s.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("svc_about_label")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-5">{t("svc_about_title")}</h2>
          <p className="text-gray-500 leading-relaxed">{t("svc_about_body")}</p>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
              {t("svc_services_label")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C]">{t("svc_services_title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <div
                key={s.nameKey}
                className="group relative bg-white border border-gray-100 rounded-2xl p-6 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <span className="absolute top-0 left-0 w-1 h-full bg-[#F0A030]" />
                <div className="w-12 h-12 rounded-xl bg-[#0F2B4C]/5 text-[#0F2B4C] flex items-center justify-center mb-4 group-hover:bg-[#F0A030]/15 transition-colors">
                  <s.icon size={22} />
                </div>
                <h3 className="text-base font-semibold text-[#0F2B4C] mb-2">{t(s.nameKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
              {t("svc_process_label")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C]">{t("svc_process_title")}</h2>
          </div>
          <div className="relative">
            <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F0A030]/20 via-[#F0A030] to-[#F0A030]/20" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
              {STEPS.map((step, i) => (
                <div key={step.titleKey} className="relative text-center">
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-white border-2 border-[#F0A030] flex items-center justify-center mb-4 shadow-lg shadow-[#F0A030]/10 z-10">
                    <span className="text-xl font-serif font-bold text-[#F0A030]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#0F2B4C] mb-1.5">{t(step.titleKey)}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[12rem] mx-auto">{t(step.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMITMENT + RADIAL GRAPHICS ── */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
              {t("svc_commit_label")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">{t("svc_commit_title")}</h2>
            <p className="text-gray-500 leading-relaxed">{t("svc_commit_body")}</p>
          </div>

          {/* Radial graphics */}
          <div className="flex flex-wrap justify-center gap-10 sm:gap-16 mb-16">
            <RadialStat percent={100} big="100%" label={t("svc_c1_title")} />
            <RadialStat percent={100} big="100%" label={t("svc_c2_title")} />
            <RadialStat percent={100} big="100%" label={t("svc_c4_title")} />
          </div>

          {/* Commitment cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMMITMENTS.map((c) => (
              <div key={c.titleKey} className="bg-white border border-gray-100 rounded-2xl p-6 border-t-[3px] border-t-[#F0A030]">
                <div className="w-11 h-11 rounded-xl bg-[#0F2B4C]/5 text-[#0F2B4C] flex items-center justify-center mb-4">
                  <c.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-[#0F2B4C] mb-2">{t(c.titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(c.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOMÓTICA ── */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-6">
            {t("svc_domo_label")}
          </span>
          <div className="bg-gradient-to-br from-[#0F2B4C] to-[#163a5c] rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row gap-8 items-start overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#F0A030]/10 rounded-full blur-3xl" />
            <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-[#F0A030]/15 text-[#F0A030] flex items-center justify-center">
              <Cpu size={32} />
            </div>
            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mb-3">{t("svc_domo_title")}</h3>
              <p className="text-white/70 leading-relaxed mb-5 max-w-3xl">{t("svc_domo_body")}</p>
              <div className="flex flex-wrap gap-2">
                {PILLS.map((p) => (
                  <span key={p} className="px-3 py-1.5 rounded-full bg-white/10 text-white/85 text-xs font-medium">
                    {t(p)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO CAN HIRE US ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
              {t("svc_who_label")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C]">{t("svc_who_title")}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {CLIENTS.map((c) => (
              <div key={c.labelKey} className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl p-5">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[#0F2B4C]/5 text-[#0F2B4C] flex items-center justify-center">
                  <c.icon size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#0F2B4C]">{t(c.labelKey)}</div>
                  <div className="text-xs text-gray-500">{t(c.subKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-[#fdf8f0] to-[#fef6e8] border border-[#F0A030]/20 rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C] mb-4">{t("svc_cta_title")}</h2>
            <p className="text-gray-500 leading-relaxed max-w-2xl mx-auto mb-8">{t("svc_cta_sub")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-all shadow-lg shadow-[#F0A030]/20 hover:-translate-y-0.5"
              >
                <WhatsAppIcon size={18} />
                {t("svc_cta_btn")}
              </a>
              <a
                href={MAIL}
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 border-2 border-[#0F2B4C]/15 hover:border-[#0F2B4C]/30 text-[#0F2B4C] font-semibold rounded-xl transition-all"
              >
                <Mail size={18} />
                michael@canaescapes.com
              </a>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-6">
              <CheckCircle2 size={14} className="text-[#F0A030]" />
              {t("contact_response")}
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

export function ServiciosPage() {
  useSeo({
    title: "Servicios & Mantenimiento para Condominios en Punta Cana — Cana Escapes",
    description:
      "Soluciones Integrales de Mantenimiento y Servicios Generales para áreas comunes de condominios en Bávaro y Punta Cana: eléctrico, plomería, HVAC, obra civil, domótica y más.",
    path: "/servicios",
  });

  return (
    <LangProvider>
      <ServiciosContent />
    </LangProvider>
  );
}
