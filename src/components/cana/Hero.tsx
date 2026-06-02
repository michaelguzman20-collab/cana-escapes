import { MapPin } from "lucide-react";
import { useLang } from "@/lib/LangContext";

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
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f36] via-[#0F2B4C] to-[#163a5c]" />
        {/* Decorative elements */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-[#F0A030]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#2D6A9F]/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" />
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
              className="px-8 py-4 text-base font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-all shadow-xl shadow-[#F0A030]/20 hover:shadow-[#F0A030]/30 hover:-translate-y-0.5"
            >
              {t("hero_btn_guest")}
            </button>
            <button
              onClick={() => scrollTo("#propietarios")}
              className="px-8 py-4 text-base font-semibold text-white border-2 border-white/20 hover:border-white/40 hover:bg-white/5 rounded-xl transition-all hover:-translate-y-0.5"
            >
              {t("hero_btn_owner")}
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
