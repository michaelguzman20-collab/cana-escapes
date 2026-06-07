import { Aperture, Globe2, KeyRound, Sparkles, Wrench, Headphones, TrendingUp, BadgeDollarSign, BadgeCheck, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const TIERS = [
  { rangeKey: "earn_b1_range", ownerKey: "earn_b1_owner", ceKey: "earn_b1_ce", descKey: "earn_b1_desc" },
  { rangeKey: "earn_b2_range", ownerKey: "earn_b2_owner", ceKey: "earn_b2_ce", descKey: "earn_b2_desc" },
  { rangeKey: "earn_b3_range", ownerKey: "earn_b3_owner", ceKey: "earn_b3_ce", descKey: "earn_b3_desc" },
  { rangeKey: "earn_b4_range", ownerKey: "earn_b4_owner", ceKey: "earn_b4_ce", descKey: "earn_b4_desc" },
  { rangeKey: "earn_b5_range", ownerKey: "earn_b5_owner", ceKey: "earn_b5_ce", descKey: "earn_b5_desc" },
];

const SERVICES = [
  { key: "earn_svc1", icon: Aperture },
  { key: "earn_svc2", icon: Globe2 },
  { key: "earn_svc3", icon: KeyRound },
  { key: "earn_svc4", icon: Sparkles },
  { key: "earn_svc5", icon: Wrench },
  { key: "earn_svc6", icon: Headphones },
  { key: "earn_svc7", icon: TrendingUp },
  { key: "earn_svc8", icon: BadgeDollarSign },
];

export function EarningsCalculator() {
  const { t } = useLang();

  return (
    <section id="calculadora" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
            {t("earn_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("earn_title")}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t("earn_desc")}</p>
        </div>

        {/* Tiers (left) + Included services card (right) */}
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12">
          {/* Tiers */}
          <div className="lg:col-span-3 space-y-3.5">
            {TIERS.map((tier) => (
              <div
                key={tier.rangeKey}
                className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-white border border-gray-100 rounded-2xl hover:border-[#F0A030]/40 hover:shadow-md transition-all duration-300"
              >
                {/* Owner % */}
                <div className="shrink-0 w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-emerald-50 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-serif font-bold text-emerald-600 leading-none">
                    {t(tier.ownerKey)}
                  </span>
                  <span className="text-[10px] text-emerald-700/70 uppercase tracking-wide mt-1">
                    {t("earn_for_you")}
                  </span>
                </div>
                {/* Description (sin montos) */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#0F2B4C] text-sm sm:text-base leading-snug">{t(tier.descKey)}</div>
                </div>
                {/* Management % */}
                <div className="shrink-0 text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F0A030]/10 text-[#F0A030] text-xs font-semibold whitespace-nowrap">
                    {t(tier.ceKey)} {t("earn_mgmt")}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 italic px-2 pt-1">{t("earn_note")}</p>
          </div>

          {/* Included services */}
          <div className="lg:col-span-2">
            <div className="bg-[#0F2B4C] rounded-2xl p-6 sm:p-7 h-full flex flex-col">
              <h3 className="flex items-center gap-2.5 text-white font-serif font-bold text-lg mb-5">
                <TrendingUp size={20} className="text-[#F0A030]" />
                {t("earn_includes_title")}
              </h3>
              <ul className="flex-1 flex flex-col justify-between gap-3">
                {SERVICES.map((svc) => (
                  <li key={svc.key} className="flex items-center gap-3 text-sm text-white/85">
                    <span className="shrink-0 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                      <svc.icon size={17} strokeWidth={1.75} className="text-[#F0A030]" />
                    </span>
                    <span>{t(svc.key)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-2 text-xs text-white/50">
                <BadgeCheck size={14} className="text-[#F0A030] shrink-0" />
                <span>{t("earn_includes_note")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" })}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#F0A030]/20 hover:scale-[1.03] hover:-translate-y-0.5"
          >
            {t("earn_cta")}
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
