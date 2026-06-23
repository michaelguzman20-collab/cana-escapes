import { Wallet, TrendingDown, Wrench, Frown, Clock, Building, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const PAINS = [
  { icon: Wallet, titleKey: "chl_p1_title", descKey: "chl_p1_desc" },
  { icon: TrendingDown, titleKey: "chl_p2_title", descKey: "chl_p2_desc" },
  { icon: Wrench, titleKey: "chl_p3_title", descKey: "chl_p3_desc" },
  { icon: Frown, titleKey: "chl_p4_title", descKey: "chl_p4_desc" },
  { icon: Clock, titleKey: "chl_p5_title", descKey: "chl_p5_desc" },
  { icon: Building, titleKey: "chl_p6_title", descKey: "chl_p6_desc" },
] as const;

export function OwnerChallenge() {
  const { t } = useLang();

  return (
    <section id="reto" className="py-20 sm:py-28 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-red-500/10 text-red-500 text-sm font-semibold rounded-full mb-4">
            {t("chl_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("chl_title")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t("chl_desc")}</p>
        </div>

        {/* Pain points */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {PAINS.map((p) => (
            <div
              key={p.titleKey}
              className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <p.icon size={22} />
              </div>
              <h3 className="text-base font-semibold text-[#0F2B4C] mb-2">{t(p.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(p.descKey)}</p>
            </div>
          ))}
        </div>

        {/* Highlight stat + solution bridge */}
        <div className="max-w-4xl mx-auto bg-[#0F2B4C] rounded-3xl p-8 sm:p-10 text-center shadow-xl">
          <div className="text-5xl sm:text-6xl font-serif font-bold text-[#F0A030] mb-3">
            {t("chl_stat_val")}
          </div>
          <p className="text-white/80 max-w-2xl mx-auto mb-7">{t("chl_stat_desc")}</p>
          <div className="flex items-start gap-3 max-w-2xl mx-auto text-left bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
            <span className="w-8 h-8 rounded-lg bg-[#F0A030] text-[#0F2B4C] flex items-center justify-center flex-shrink-0">
              <ArrowRight size={16} />
            </span>
            <p className="text-sm font-medium text-white/90 leading-relaxed">{t("chl_solution")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
