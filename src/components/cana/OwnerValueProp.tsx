import { Cpu, MapPinned, Eye, Wrench, ClipboardCheck, Image as ImageIcon, Headphones, CalendarCheck } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const PILLARS = [
  { titleKey: "own_pillar1_title", descKey: "own_pillar1_desc", icon: Cpu, color: "bg-blue-500/10 text-blue-500" },
  { titleKey: "own_pillar2_title", descKey: "own_pillar2_desc", icon: MapPinned, color: "bg-emerald-500/10 text-emerald-500" },
  { titleKey: "own_pillar3_title", descKey: "own_pillar3_desc", icon: Eye, color: "bg-amber-500/10 text-amber-500" },
  { titleKey: "own_pillar4_title", descKey: "own_pillar4_desc", icon: Wrench, color: "bg-purple-500/10 text-purple-500" },
];

const STEPS = [
  { key: "own_step1", icon: ClipboardCheck },
  { key: "own_step2", icon: ImageIcon },
  { key: "own_step3", icon: Headphones },
  { key: "own_step4", icon: Wrench },
  { key: "own_step5", icon: CalendarCheck },
] as const;

export function OwnerValueProp() {
  const { t } = useLang();

  return (
    <section id="porque" className="py-20 sm:py-28 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("own_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("own_title")}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t("own_desc")}</p>
        </div>

        {/* Pillars */}
        <div id="propietarios" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {PILLARS.map((p) => (
            <div
              key={p.titleKey}
              className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl ${p.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <p.icon size={22} />
              </div>
              <h3 className="text-base font-semibold text-[#0F2B4C] mb-2">{t(p.titleKey)}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(p.descKey)}</p>
            </div>
          ))}
        </div>

        {/* Journey timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C] mb-3">
              {t("own_journey_title")}
            </h3>
            <p className="text-gray-500">{t("own_journey_desc")}</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F0A030]/20 via-[#F0A030] to-[#F0A030]/20" />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4">
              {STEPS.map((step, i) => (
                <div key={step.key} className="relative text-center group">
                  {/* Step circle */}
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-white border-2 border-[#F0A030] flex items-center justify-center mb-4 shadow-lg shadow-[#F0A030]/10 group-hover:scale-110 group-hover:bg-[#F0A030] transition-all duration-300 z-10">
                    <step.icon size={24} className="text-[#F0A030] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-[#F0A030] font-semibold">
                    {t("own_step_label")} {i + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-[#0F2B4C] mt-1">{t(step.key)}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
