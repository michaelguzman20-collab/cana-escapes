import { MapPin, Home, Building2, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const HERO_IMG =
  "https://images.unsplash.com/photo-1588504633950-9dc518941e93?auto=format&fit=crop&w=1920&q=80";

export function Hero() {
  const { t } = useLang();

  const stats = [
    { val: t("hero_stat1_val"), label: t("hero_stat1_label") },
    { val: t("hero_stat2_val"), label: t("hero_stat2_label") },
    { val: t("hero_stat3_val"), label: t("hero_stat3_label") },
  ];

  function scrollTo(id: string) {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        {/* Hero photo */}
        <img
          src={HERO_IMG}
          alt="Villa de lujo frente al mar en Punta Cana al atardecer"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Navy overlays for text legibility (stronger on the left) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f36]/95 via-[#0F2B4C]/80 to-[#0F2B4C]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f36]/80 via-transparent to-[#0a1f36]/25" />
        {/* Subtle amber glow */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#F0A030]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="max-w-3xl">
          {/* Location badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-sm animate-fade-in">
            <MapPin size={14} className="text-[#F0A030]" />
            <span className="text-sm text-white/70 font-medium">{t("hero_location")}</span>
          </div>

          {/* Title */}
          <h1 className="mb-6">
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight animate-slide-up">
              {t("hero_title_1")}
            </span>
            <span className="block text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#F0A030] leading-tight animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {t("hero_title_2")}
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg text-white/60 leading-relaxed max-w-2xl mb-10 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            {t("hero_desc")}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <button
              onClick={() => scrollTo("#reservar")}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-all duration-300 shadow-xl shadow-[#F0A030]/20 hover:shadow-[#F0A030]/40 hover:scale-[1.03] hover:-translate-y-0.5"
            >
              <Home size={18} />
              {t("hero_btn_guest")}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => scrollTo("#porque")}
              className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white border-2 border-white/25 hover:border-white/50 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5"
            >
              <Building2 size={18} />
              {t("hero_btn_owner")}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
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
