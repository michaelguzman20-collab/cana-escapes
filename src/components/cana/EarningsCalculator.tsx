import { useState } from "react";
import { Camera, Globe, DoorOpen, SprayCanIcon, Wrench, Headphones, BarChart3, ArrowRight, ChevronDown } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const TIERS = [
  { rangeKey: "earn_b1_range", ownerKey: "earn_b1_owner", ceKey: "earn_b1_ce", descKey: "earn_b1_desc" },
  { rangeKey: "earn_b2_range", ownerKey: "earn_b2_owner", ceKey: "earn_b2_ce", descKey: "earn_b2_desc" },
  { rangeKey: "earn_b3_range", ownerKey: "earn_b3_owner", ceKey: "earn_b3_ce", descKey: "earn_b3_desc" },
  { rangeKey: "earn_b4_range", ownerKey: "earn_b4_owner", ceKey: "earn_b4_ce", descKey: "earn_b4_desc" },
  { rangeKey: "earn_b5_range", ownerKey: "earn_b5_owner", ceKey: "earn_b5_ce", descKey: "earn_b5_desc" },
];

const SERVICES = [
  { key: "earn_svc1", icon: Camera },
  { key: "earn_svc2", icon: Globe },
  { key: "earn_svc3", icon: DoorOpen },
  { key: "earn_svc4", icon: SprayCanIcon },
  { key: "earn_svc5", icon: Wrench },
  { key: "earn_svc6", icon: Headphones },
  { key: "earn_svc7", icon: BarChart3 },
  { key: "earn_svc8", icon: BarChart3 },
];

const FAQ_KEYS = [
  { q: "earn_q1", h: "earn_q1h" },
  { q: "earn_q2", h: "earn_q2h" },
  { q: "earn_q3", h: "earn_q3h" },
  { q: "earn_q4", h: "earn_q4h" },
  { q: "earn_q5", h: "earn_q5h" },
  { q: "earn_q6", h: "earn_q6h" },
];

export function EarningsCalculator() {
  const { t } = useLang();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section id="calculadora" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
            {t("earn_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("earn_title")}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t("earn_desc")}</p>
        </div>

        {/* Tiers table */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#0F2B4C] text-white text-sm font-semibold">
              <div className="col-span-4">Ingreso Mensual</div>
              <div className="col-span-3 text-center">{t("earn_for_you")}</div>
              <div className="col-span-2 text-center">{t("earn_mgmt")}</div>
              <div className="col-span-3 hidden sm:block"></div>
            </div>

            {TIERS.map((tier, i) => {
              const ownerPct = parseInt(t(tier.ownerKey));
              return (
                <div
                  key={tier.rangeKey}
                  className={`grid grid-cols-12 gap-4 px-6 py-5 items-center ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  } hover:bg-[#F0A030]/5 transition-colors group`}
                >
                  <div className="col-span-4">
                    <span className="font-semibold text-[#0F2B4C] text-sm">{t(tier.rangeKey)}</span>
                  </div>
                  <div className="col-span-3 text-center">
                    <span className="text-xl font-bold text-emerald-600">{t(tier.ownerKey)}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-medium text-gray-400">{t(tier.ceKey)}</span>
                  </div>
                  <div className="col-span-3 hidden sm:block">
                    {/* Visual bar */}
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="bg-emerald-500 rounded-l-full transition-all duration-500"
                        style={{ width: `${ownerPct}%` }}
                      />
                      <div
                        className="bg-[#F0A030] rounded-r-full transition-all duration-500"
                        style={{ width: `${100 - ownerPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 italic">{t("earn_note")}</p>
            </div>
          </div>
        </div>

        {/* Services included */}
        <div className="max-w-4xl mx-auto mb-16">
          <h3 className="text-xl font-serif font-bold text-[#0F2B4C] text-center mb-8">
            {t("earn_includes_title")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SERVICES.map((svc) => (
              <div
                key={svc.key}
                className="flex flex-col items-center gap-3 p-5 bg-gray-50 rounded-xl hover:bg-[#F0A030]/5 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#0F2B4C]/5 flex items-center justify-center group-hover:bg-[#F0A030]/10 transition-colors">
                  <svc.icon size={18} className="text-[#0F2B4C] group-hover:text-[#F0A030] transition-colors" />
                </div>
                <span className="text-xs font-medium text-gray-600 text-center">{t(svc.key)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ accordion */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="space-y-3">
            {FAQ_KEYS.map((faq, i) => (
              <div
                key={faq.q}
                className="border border-gray-100 rounded-xl overflow-hidden hover:border-[#F0A030]/30 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-[#0F2B4C]">{t(faq.q)}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openFaq === i ? "max-h-20 pb-4" : "max-h-0"
                  }`}
                >
                  <p className="px-5 text-sm text-gray-500">{t(faq.h)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-all shadow-lg shadow-[#F0A030]/20 hover:-translate-y-0.5"
          >
            {t("earn_cta")}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
