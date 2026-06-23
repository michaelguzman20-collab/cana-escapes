import { LayoutDashboard, LineChart, Share2, FileBarChart, Home, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const CARDS = [
  { icon: LayoutDashboard, titleKey: "tech_c1_title", descKey: "tech_c1_desc", color: "bg-blue-500/10 text-blue-500" },
  { icon: LineChart, titleKey: "tech_c2_title", descKey: "tech_c2_desc", color: "bg-emerald-500/10 text-emerald-500" },
  { icon: Share2, titleKey: "tech_c3_title", descKey: "tech_c3_desc", color: "bg-amber-500/10 text-amber-500" },
  { icon: FileBarChart, titleKey: "tech_c4_title", descKey: "tech_c4_desc", color: "bg-purple-500/10 text-purple-500" },
  { icon: Home, titleKey: "tech_c5_title", descKey: "tech_c5_desc", color: "bg-sky-500/10 text-sky-500" },
  { icon: ShieldCheck, titleKey: "tech_c6_title", descKey: "tech_c6_desc", color: "bg-rose-500/10 text-rose-500" },
] as const;

export function TechEcosystem() {
  const { t } = useLang();

  return (
    <section id="tecnologia" className="py-20 sm:py-28 bg-[#0F2B4C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#F0A030]/15 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
            {t("tech_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {t("tech_title")}
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">{t("tech_desc")}</p>
        </div>

        {/* Capability cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((c) => (
            <div
              key={c.titleKey}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl ${c.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <c.icon size={22} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{t(c.titleKey)}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{t(c.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
