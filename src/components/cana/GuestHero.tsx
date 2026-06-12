import { MapPin, CalendarCheck, Compass, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LangContext";

// White-sand turquoise beach — Punta Cana / Bávaro vibe
const HERO_IMG =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80";

export function GuestHero() {
  const { t } = useLang();

  const stats = [
    { val: t("ghero_stat1_val"), label: t("ghero_stat1_label") },
    { val: t("ghero_stat2_val"), label: t("ghero_stat2_label") },
    { val: t("ghero_stat3_val"), label: t("ghero_stat3_label") },
  ];

  function scrollTo(id: string) {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="Playa de arena blanca y aguas turquesa en Punta Cana"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Navy overlays for legibility (stronger on the left) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f36]/90 via-[#0F2B4C]/65 to-[#0F2B4C]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f36]/75 via-transparent to-[#0a1f36]/20" />
        {/* Warm sun glow */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#F0A030]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="max-w-3xl">
          {/* Location badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-sm animate-fade-in">
            <MapPin size={14} className="text-[#F0A030]" />
            <span className="text-sm text-white/75 font-medium">{t("ghero_badge")}</span>
          </div>

          {/* Title */}
          <h1 className="mb-6">
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight animate-slide-up">
              {t("ghero_title_1")}
            </span>
            <span
              className="block text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#F0A030] leading-tight animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              {t("ghero_title_2")}
            </span>
          </h1>

          {/* Description */}
          <p
            className="text-lg text-white/70 leading-relaxed max-w-2xl mb-10 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            {t("ghero_desc")}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <button
              onClick={() => scrollTo("#reservar")}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-all duration-300 shadow-xl shadow-[#F0A030]/20 hover:shadow-[#F0A030]/40 hover:scale-[1.03] hover:-translate-y-0.5"
            >
              <CalendarCheck size={18} />
              {t("ghero_btn_book")}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollTo("#experiencias")}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white border-2 border-white/25 hover:border-white/50 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5"
            >
              <Compass size={18} />
              {t("ghero_btn_explore")}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 sm:gap-10 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            {stats.map((s, i) => (
              <div key={i} className="text-center sm:text-left">
                <div className="text-3xl sm:text-4xl font-serif font-bold text-[#F0A030]">{s.val}</div>
                <div className="text-xs sm:text-sm text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
