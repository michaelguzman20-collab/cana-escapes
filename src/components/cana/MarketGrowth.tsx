import { Building2, DollarSign, Percent, Plane, TrendingUp, Globe2, Award, Sparkles } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const STATS = [
  { icon: Building2, labelKey: "mk_s1_label", thenKey: "mk_s1_then", nowKey: "mk_s1_now", growthKey: "mk_s1_growth" },
  { icon: DollarSign, labelKey: "mk_s2_label", thenKey: "mk_s2_then", nowKey: "mk_s2_now", growthKey: "mk_s2_growth" },
  { icon: Percent, labelKey: "mk_s3_label", thenKey: "mk_s3_then", nowKey: "mk_s3_now", growthKey: "mk_s3_growth" },
  { icon: Plane, labelKey: "mk_s4_label", thenKey: "mk_s4_then", nowKey: "mk_s4_now", growthKey: "mk_s4_growth" },
] as const;

const DRIVERS = [
  { icon: Globe2, key: "mk_d1" },
  { icon: Award, key: "mk_d2" },
  { icon: Sparkles, key: "mk_d3" },
] as const;

export function MarketGrowth() {
  const { t } = useLang();

  return (
    <section id="mercado" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("mk_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("mk_title")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t("mk_desc")}</p>
        </div>

        {/* Stat cards: then → now */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div
              key={s.labelKey}
              className="relative bg-gradient-to-b from-gray-50 to-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-[#0F2B4C]/5 text-[#0F2B4C] flex items-center justify-center">
                  <s.icon size={20} />
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  <TrendingUp size={12} />
                  {t(s.growthKey)}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-3 min-h-[2.5rem]">{t(s.labelKey)}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-400 line-through decoration-gray-300">{t(s.thenKey)}</span>
                <span className="text-gray-300">→</span>
                <span className="text-2xl font-serif font-bold text-[#F0A030]">{t(s.nowKey)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                <span>{t("mk_then")}</span>
                <span className="flex-1 h-px bg-gray-100" />
                <span className="text-[#0F2B4C]">{t("mk_now")}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Drivers */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {DRIVERS.map((d) => (
            <div
              key={d.key}
              className="flex items-center gap-3 bg-[#0F2B4C] text-white rounded-xl px-5 py-4"
            >
              <div className="w-9 h-9 rounded-lg bg-[#F0A030]/20 text-[#F0A030] flex items-center justify-center flex-shrink-0">
                <d.icon size={18} />
              </div>
              <span className="text-sm font-medium">{t(d.key)}</span>
            </div>
          ))}
        </div>

        {/* Source */}
        <p className="mt-8 text-center text-xs text-gray-400">{t("mk_source")}</p>
      </div>
    </section>
  );
}
