import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rotate3d, MapPin, BedDouble, Loader2 } from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { descriptionIn, fetchPublishedTours, type TourCard } from "@/lib/tours";
import { PanoThumb } from "@/components/tours/PanoThumb";

// Galería pública de recorridos 360: canaescapes.com/tours
function ToursContent() {
  const { t, lang } = useLang();
  const [tours, setTours] = useState<TourCard[] | null>(null);

  useEffect(() => {
    fetchPublishedTours()
      .then(setTours)
      .catch(() => setTours([]));
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <LandingNavbar />
      <section className="bg-[#0F2B4C] pt-32 pb-24 sm:pt-40 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F0A030]/40 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
            <Rotate3d size={14} />
            {t("tours_badge")}
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-serif font-bold text-white">{t("tours_title")}</h1>
          <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">{t("tours_desc")}</p>
        </div>
      </section>

      <div className="-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {tours === null ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 flex items-center justify-center text-gray-500">
            <Loader2 className="animate-spin mr-2" size={18} /> {t("tours_loading")}
          </div>
        ) : tours.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
            <Rotate3d size={40} className="mx-auto mb-3 text-[#F0A030]" />
            {t("tours_empty")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <Link
                key={tour.id}
                to={`/tour/${tour.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
              >
                <div className="relative bg-gray-200 overflow-hidden">
                  <PanoThumb
                    src={tour.cover_url}
                    yaw={tour.start?.initial_yaw}
                    pitch={tour.start?.initial_pitch}
                    fov={tour.start?.fov_initial}
                    alt={tour.title}
                    className="group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 text-white text-xs font-semibold">
                    <Rotate3d size={13} /> 360°
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="font-serif font-bold text-lg text-[#0F2B4C]">{tour.title}</h2>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {tour.location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {tour.location}</span>}
                    {tour.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {tour.bedrooms} {t("tours_bedrooms")}</span>}
                  </div>
                  {descriptionIn(tour, lang) && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{descriptionIn(tour, lang)}</p>}
                  <span className="mt-4 inline-block text-sm font-semibold text-[#b8761a] group-hover:underline">{t("tours_open")} →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <LandingFooter />
    </div>
  );
}

export function ToursPage() {
  useSeo({
    title: "Tours 360 — Recorridos virtuales de propiedades en Punta Cana | Cana Escapes",
    description:
      "Recorre en 360° villas y apartamentos de Punta Cana y Bávaro gestionados por Cana Escapes, desde tu teléfono o computadora.",
    path: "/tours",
  });
  return (
    <LangProvider>
      <ToursContent />
    </LangProvider>
  );
}
