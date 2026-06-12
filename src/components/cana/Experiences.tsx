import { Waves, Flag, UtensilsCrossed, Palmtree, Flower2, Mountain } from "lucide-react";
import { useLang } from "@/lib/LangContext";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";

const WA_URL = "https://wa.me/18092102773";

const EXPERIENCES = [
  {
    titleKey: "exp1_title",
    descKey: "exp1_desc",
    icon: Waves,
    img: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=800&q=80",
    alt: "Playa de arena blanca con palmeras en Punta Cana",
  },
  {
    titleKey: "exp2_title",
    descKey: "exp2_desc",
    icon: Flag,
    img: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=800&q=80",
    alt: "Campo de golf verde junto al mar en el Caribe",
  },
  {
    titleKey: "exp3_title",
    descKey: "exp3_desc",
    icon: UtensilsCrossed,
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
    alt: "Restaurante frente al mar al atardecer",
  },
  {
    titleKey: "exp4_title",
    descKey: "exp4_desc",
    icon: Palmtree,
    img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    alt: "Aguas cristalinas y naturaleza tropical en República Dominicana",
  },
  {
    titleKey: "exp5_title",
    descKey: "exp5_desc",
    icon: Flower2,
    img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80",
    alt: "Piscina infinita de un resort frente al mar para relajarse",
  },
  {
    titleKey: "exp6_title",
    descKey: "exp6_desc",
    icon: Mountain,
    img: "https://images.unsplash.com/photo-1626808642875-0aa545482dfb?auto=format&fit=crop&w=800&q=80",
    alt: "Buggy todoterreno en una aventura off-road",
  },
];

const BOOK_STEPS = [
  { titleKey: "book_step1_title", descKey: "book_step1_desc" },
  { titleKey: "book_step2_title", descKey: "book_step2_desc" },
  { titleKey: "book_step3_title", descKey: "book_step3_desc" },
];

export function Experiences() {
  const { t } = useLang();

  return (
    <section id="experiencias" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
            {t("exp_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">{t("exp_title")}</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">{t("exp_desc")}</p>
        </div>

        {/* Experience cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {EXPERIENCES.map((exp) => (
            <div
              key={exp.titleKey}
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[320px] flex items-end"
            >
              <img
                src={exp.img}
                alt={exp.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f36]/90 via-[#0a1f36]/30 to-transparent" />
              <div className="relative p-6 text-white">
                <div className="w-11 h-11 rounded-xl bg-[#F0A030] text-[#0F2B4C] flex items-center justify-center mb-3 shadow-lg">
                  <exp.icon size={20} />
                </div>
                <h3 className="text-lg font-serif font-bold mb-1.5">{t(exp.titleKey)}</h3>
                <p className="text-sm text-white/75 leading-relaxed">{t(exp.descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How to book */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("book_tag")}
          </span>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C] mb-3">{t("book_title")}</h3>
          <p className="text-gray-500 max-w-xl mx-auto">{t("book_desc")}</p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-[#F0A030]/20 via-[#F0A030] to-[#F0A030]/20" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 mb-12">
            {BOOK_STEPS.map((step, i) => (
              <div key={step.titleKey} className="relative text-center">
                <div className="relative mx-auto w-16 h-16 rounded-full bg-white border-2 border-[#F0A030] flex items-center justify-center mb-4 shadow-lg shadow-[#F0A030]/10 z-10">
                  <span className="text-xl font-serif font-bold text-[#F0A030]">{i + 1}</span>
                </div>
                <h4 className="text-base font-semibold text-[#0F2B4C] mb-1.5">{t(step.titleKey)}</h4>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">{t(step.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-all shadow-lg shadow-[#F0A030]/20 hover:shadow-[#F0A030]/30 hover:-translate-y-0.5"
            >
              <WhatsAppIcon size={18} />
              {t("book_cta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
