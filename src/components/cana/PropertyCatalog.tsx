import { useState } from "react";
import { MapPin, CheckCircle2, ArrowRight, Mail, Sparkles } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const ZONES = [
  { nameKey: "cat_zone1_name", descKey: "cat_zone1_desc", badgeKey: "cat_zone1_badge", gradient: "from-amber-500/20 to-orange-500/20", icon: "bg-amber-500/20 text-amber-400" },
  { nameKey: "cat_zone2_name", descKey: "cat_zone2_desc", badgeKey: "cat_zone2_badge", gradient: "from-emerald-500/20 to-teal-500/20", icon: "bg-emerald-500/20 text-emerald-400" },
  { nameKey: "cat_zone3_name", descKey: "cat_zone3_desc", badgeKey: "cat_zone3_badge", gradient: "from-blue-500/20 to-indigo-500/20", icon: "bg-blue-500/20 text-blue-400" },
];

export function PropertyCatalog() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmitted(true);
  }

  return (
    <section id="reservar" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
            {t("cat_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("cat_title")}
          </h2>
        </div>

        {/* Coming Soon card */}
        <div className="max-w-2xl mx-auto mb-20">
          <div className="relative bg-gradient-to-br from-[#0F2B4C] to-[#163a5c] rounded-2xl p-8 sm:p-10 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#F0A030]/10 rounded-full blur-3xl" />
            <Sparkles size={40} className="text-[#F0A030] mx-auto mb-4" />
            <h3 className="text-2xl font-serif font-bold text-white mb-3">{t("cat_soon_title")}</h3>
            <p className="text-white/60 mb-8 max-w-md mx-auto">{t("cat_soon_desc")}</p>

            {submitted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 size={18} />
                {t("cat_success")}
              </div>
            ) : (
              <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("cat_email_placeholder")}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-[#F0A030]/50 focus:ring-1 focus:ring-[#F0A030]/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-colors shadow-lg shadow-[#F0A030]/20"
                >
                  {t("cat_notify")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Zones */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F2B4C] mb-3">{t("cat_zones_title")}</h3>
            <p className="text-gray-500 max-w-xl mx-auto">{t("cat_zones_desc")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ZONES.map((zone) => (
              <div
                key={zone.nameKey}
                className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${zone.icon} flex items-center justify-center mb-4`}>
                  <MapPin size={20} />
                </div>
                <span className="inline-block px-3 py-1 bg-[#0F2B4C]/5 text-[#0F2B4C] text-xs font-semibold rounded-full mb-3">
                  {t(zone.badgeKey)}
                </span>
                <h4 className="text-lg font-serif font-bold text-[#0F2B4C] mb-2">{t(zone.nameKey)}</h4>
                <p className="text-sm text-gray-500">{t(zone.descKey)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Owner CTA */}
        <div className="bg-gradient-to-r from-[#fdf8f0] to-[#fef6e8] border border-[#F0A030]/20 rounded-2xl p-8 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1">
              <h3 className="text-2xl font-serif font-bold text-[#0F2B4C] mb-2">{t("cat_owner_title")}</h3>
              <p className="text-gray-500 mb-6">{t("cat_owner_desc")}</p>
              <ul className="space-y-3">
                {(["cat_why1", "cat_why2", "cat_why3", "cat_why4"] as const).map((key) => (
                  <li key={key} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-[#F0A030] mt-0.5 flex-shrink-0" />
                    {t(key)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={() => document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-all shadow-lg shadow-[#F0A030]/20 hover:shadow-[#F0A030]/30 hover:-translate-y-0.5"
              >
                {t("cat_eval_btn")}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
