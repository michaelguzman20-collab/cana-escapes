import { useEffect, useRef } from "react";
import { Map as MapLibre, Marker, NavigationControl, LngLatBounds, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre 6 arma la URL de su worker en tiempo de ejecución y Vite no la detecta:
// se empaqueta aquí como worker (con sus imports) y se le pasa la URL.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { MarketZone } from "@/lib/canaDna";

setWorkerUrl(maplibreWorkerUrl);

// Mapa real (calles, playas, resorts) con OpenFreeMap: gratis, sin clave y con uso comercial
// permitido; exige mostrar la atribución de OpenStreetMap. Las burbujas son marcadores HTML.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Escala secuencial de 4 pasos (azul claro → navy) para el valor de la métrica
const STEPS = ["#9DB7D8", "#5F86B6", "#2F5A8C", "#0F2B4C"];

export interface ZoneMapProps {
  zones: MarketZone[];
  values: Record<string, number>; // valor de la métrica por zona
  format: (v: number) => string;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  lang: "es" | "en";
}

export default function ZoneMap({ zones, values, format, selected, onSelect, lang }: ZoneMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const bounds = () => {
    const b = new LngLatBounds();
    zones.forEach((z) => b.extend([z.lng, z.lat]));
    return b;
  };

  // Crear el mapa y un marcador por zona
  useEffect(() => {
    if (!container.current) return;
    const m = new MapLibre({
      container: container.current,
      style: STYLE_URL,
      bounds: bounds(),
      fitBoundsOptions: { padding: 50 },
      cooperativeGestures: true, // en el celular se mueve con dos dedos y la página sigue haciendo scroll
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.current = m;

    for (const z of zones) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "cdna-bubble";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(selectedRef.current === z.slug ? null : z.slug);
      });
      const marker = new Marker({ element: el }).setLngLat([z.lng, z.lat]).addTo(m);
      markers.current.set(z.slug, { marker, el });
    }
    return () => {
      markers.current.clear();
      m.remove();
      map.current = null;
    };
    // Las zonas solo cambian al recargar los datos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  // Pintar valor, color y tamaño de cada burbuja
  useEffect(() => {
    const vals = zones.map((z) => values[z.slug]).filter((v) => v != null);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const step = (v: number) => (max === min ? 3 : Math.min(3, Math.floor(((v - min) / (max - min)) * 4)));
    const maxListings = Math.max(...zones.map((z) => z.active_listings ?? 0), 1);
    // En pantallas pequeñas las zonas quedan muy juntas: burbujas más chicas y el nombre solo en la elegida
    const compact = (container.current?.clientWidth ?? 800) < 640;
    for (const z of zones) {
      const entry = markers.current.get(z.slug);
      if (!entry) continue;
      const v = values[z.slug];
      const size = Math.round(compact ? 34 + 22 * Math.sqrt((z.active_listings ?? 0) / maxListings) : 40 + 30 * Math.sqrt((z.active_listings ?? 0) / maxListings));
      const isSel = selected === z.slug;
      const { el } = entry;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.background = v != null ? STEPS[step(v)] : "#999";
      el.style.opacity = selected && !isSel ? "0.55" : "1";
      // Las burbujas pequeñas quedan encima de las grandes para que no se tapen
      el.style.zIndex = isSel ? "200" : String(100 - size);
      el.dataset.selected = isSel ? "true" : "false";
      el.setAttribute("aria-label", `${z.name}: ${v != null ? format(v) : "—"}`);
      const showName = !compact || isSel;
      el.innerHTML = `<span class="cdna-bubble-value">${v != null ? format(v) : "—"}</span>${showName ? `<span class="cdna-bubble-name">${z.name}</span>` : ""}`;
    }
  }, [zones, values, format, selected]);

  // Acercar a la zona elegida, o volver a ver todo el mercado
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const z = zones.find((x) => x.slug === selected);
    if (z) m.flyTo({ center: [z.lng, z.lat], zoom: 12, duration: 900 });
    else m.fitBounds(bounds(), { padding: 50, duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const vals = zones.map((z) => values[z.slug]).filter((v) => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const edges = [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4);

  return (
    // isolate: los z-index de las burbujas no deben pasar por encima del menú ni del selector fijo
    <div className="relative isolate z-0">
      <style>{`
        .cdna-bubble { border-radius: 9999px; border: 3px solid #fff; color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(15,43,76,.35);
          transition: transform .2s, opacity .2s, box-shadow .2s; font-family: inherit; padding: 0; }
        .cdna-bubble:hover { transform: scale(1.08); }
        .cdna-bubble[data-selected="true"] { border-color: #F0A030; box-shadow: 0 0 0 6px rgba(240,160,48,.35), 0 8px 20px rgba(15,43,76,.4); }
        .cdna-bubble-value { font-size: 13px; font-weight: 800; }
        @media (max-width: 639px) { .cdna-bubble-value { font-size: 11px; } .cdna-bubble { border-width: 2px; } }
        .cdna-bubble-name { position: absolute; top: 100%; margin-top: 4px; white-space: nowrap; font-size: 12px; font-weight: 700;
          color: #0F2B4C; background: rgba(255,255,255,.92); padding: 1px 8px; border-radius: 9999px; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
      `}</style>
      <div ref={container} className="h-[420px] sm:h-[520px] w-full rounded-2xl overflow-hidden" />

      {/* Leyenda */}
      <div className="absolute left-2 bottom-8 sm:left-3 sm:top-3 sm:bottom-auto rounded-xl bg-white/95 backdrop-blur px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-[11px] text-[#0F2B4C] shadow pointer-events-none">
        {STEPS.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: c }} />
            {format(edges[i])} – {format(edges[i + 1])}
          </div>
        ))}
        <div className="mt-1 hidden sm:block text-[#0F2B4C]/50">{lang === "es" ? "Burbuja más grande = más propiedades" : "Bigger bubble = more listings"}</div>
      </div>
    </div>
  );
}
