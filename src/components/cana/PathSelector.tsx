import { Link } from "react-router-dom";
import { Wrench, CalendarCheck, Building2, Smartphone, Dna, Rotate3d, ArrowRight, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/LangContext";

// "Más de Cana Escapes": tarjetas hacia las demás áreas; cada página quita la suya con `exclude`.
// Tours 360 abre en otra pestaña (es un área aparte, con su propia carga).
const PATHS = [
  { to: "/", icon: Wrench, titleKey: "path_svc_title", descKey: "path_svc_desc", ctaKey: "path_svc_cta" },
  { to: "/reservas", icon: CalendarCheck, titleKey: "path_res_title", descKey: "path_res_desc", ctaKey: "path_res_cta" },
  { to: "/propietarios", icon: Building2, titleKey: "path_owner_title", descKey: "path_owner_desc", ctaKey: "path_owner_cta" },
  { to: "/apps", icon: Smartphone, titleKey: "path_apps_title", descKey: "path_apps_desc", ctaKey: "path_apps_cta" },
  { to: "/cana-dna", icon: Dna, titleKey: "path_dna_title", descKey: "path_dna_desc", ctaKey: "path_dna_cta" },
  { to: "/tours", icon: Rotate3d, titleKey: "path_tours_title", descKey: "path_tours_desc", ctaKey: "path_tours_cta", newTab: true },
];

export function PathSelector({ exclude }: { exclude?: string }) {
  const { t } = useLang();

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("path_more_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">{t("path_more_title")}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t("path_more_desc")}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PATHS.filter((p) => p.to !== exclude).map((p) => (
            <Link
              key={p.to}
              to={p.to}
              {...(p.newTab ? { target: "_blank", rel: "noopener" } : {})}
              className="group relative flex flex-col bg-gradient-to-br from-[#0F2B4C] to-[#163a5c] rounded-2xl p-6 overflow-hidden hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#F0A030]/10 rounded-full blur-3xl" />
              <div className="relative flex flex-col flex-1">
                <div className="w-12 h-12 rounded-2xl bg-[#F0A030]/15 text-[#F0A030] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <p.icon size={24} />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-2">{t(p.titleKey)}</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-6 flex-1">{t(p.descKey)}</p>
                <span className="inline-flex items-center gap-2 text-[#F0A030] font-semibold text-sm">
                  {t(p.ctaKey)}
                  {p.newTab ? (
                    <ExternalLink size={15} />
                  ) : (
                    <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  )}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
