import { useLang } from "@/lib/LangContext";

type Photo = { src: string; alt: string };

const PHOTOS: Photo[] = [
  { src: "/playas/playa-palmeras-turquesa.jpg", alt: "Palmeras sobre playa de aguas turquesa en Punta Cana" },
  { src: "/playas/playa-arena-blanca.jpg", alt: "Playa de arena blanca y mar turquesa en Bávaro" },
  { src: "/playas/letrero-punta-cana.jpg", alt: "Letrero colorido de Punta Cana en la playa" },
  { src: "/playas/palmeras-botes-bavaro.jpg", alt: "Palmeras y botes en la playa de Bávaro" },
  { src: "/playas/mar-turquesa-botes.jpg", alt: "Mar turquesa con botes frente a la costa" },
  { src: "/playas/atardecer-caribe.jpg", alt: "Atardecer caribeño en la playa de Punta Cana" },
  { src: "/playas/costa-aerea-bavaro.jpg", alt: "Vista aérea de la costa de Bávaro" },
  { src: "/playas/parasailing-punta-cana.jpg", alt: "Parasailing sobre el mar en Punta Cana" },
  { src: "/playas/palmeras-arena.jpg", alt: "Palmeras meciéndose sobre la arena blanca" },
  { src: "/playas/playa-aerea-botes.jpg", alt: "Vista aérea de playa con botes en aguas cristalinas" },
  { src: "/playas/marina-cap-cana.jpg", alt: "Vista aérea de la marina de Cap Cana" },
  { src: "/playas/orilla-aerea.jpg", alt: "Vista aérea de la orilla y las olas del Caribe" },
];

export function PasarelaPlayas() {
  const { t } = useLang();
  // Duplicate the list so the marquee (-50% loop) is seamless
  const items = [...PHOTOS, ...PHOTOS];

  return (
    <section className="py-16 sm:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
        <span className="inline-block px-4 py-1.5 bg-[#F0A030]/10 text-[#F0A030] text-sm font-semibold rounded-full mb-4">
          {t("pasarela_tag")}
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-3">{t("pasarela_title")}</h2>
        <p className="text-gray-500 max-w-xl mx-auto">{t("pasarela_desc")}</p>
      </div>

      <div className="relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
          {items.map((p, i) => (
            <div
              key={i}
              aria-hidden={i >= PHOTOS.length}
              className="shrink-0 mx-3 h-56 sm:h-72 rounded-2xl overflow-hidden shadow-sm"
            >
              <img
                src={p.src}
                alt={i < PHOTOS.length ? p.alt : ""}
                loading="lazy"
                className="h-full w-auto max-w-none object-cover select-none"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
