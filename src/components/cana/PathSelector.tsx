import { Link } from "react-router-dom";
import { Building2, Wrench, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/LangContext";

const PATHS = [
  {
    to: "/propietarios",
    icon: Building2,
    titleKey: "path_owner_title",
    descKey: "path_owner_desc",
    ctaKey: "path_owner_cta",
  },
  {
    to: "/servicios",
    icon: Wrench,
    titleKey: "path_svc_title",
    descKey: "path_svc_desc",
    ctaKey: "path_svc_cta",
  },
];

export function PathSelector() {
  const { t } = useLang();

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("path_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">{t("path_title")}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t("path_desc")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PATHS.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group relative bg-gradient-to-br from-[#0F2B4C] to-[#163a5c] rounded-2xl p-8 sm:p-10 overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#F0A030]/10 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-150" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-[#F0A030]/15 text-[#F0A030] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <p.icon size={26} />
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">{t(p.titleKey)}</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6">{t(p.descKey)}</p>
                <span className="inline-flex items-center gap-2 text-[#F0A030] font-semibold text-sm">
                  {t(p.ctaKey)}
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
