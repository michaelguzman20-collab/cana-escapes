import type { MarketZone } from "@/lib/canaDna";

// Mapa esquemático del extremo este de La Altagracia (no a escala exacta).
// Proyección simple: 1000 px por grado de latitud y 948 px por grado de longitud (cos 18.6°).
const LNG0 = -69.0;
const LAT0 = 18.88;
const x = (lng: number) => (lng - LNG0) * 948;
const y = (lat: number) => (LAT0 - lat) * 1000;

// Costa aproximada: norte (Uvero Alto) → este (Bávaro, Punta Cana) → sur (Cap Cana, Bayahibe)
const COAST: [number, number][] = [
  [-69.0, 18.88], [-68.74, 18.88], [-68.66, 18.835], [-68.6, 18.805], [-68.52, 18.775],
  [-68.47, 18.745], [-68.43, 18.72], [-68.405, 18.7], [-68.39, 18.675], [-68.37, 18.645],
  [-68.35, 18.615], [-68.345, 18.58], [-68.33, 18.545], [-68.322, 18.51], [-68.345, 18.48],
  [-68.375, 18.455], [-68.4, 18.43], [-68.45, 18.4], [-68.55, 18.385], [-68.65, 18.37],
  [-68.75, 18.36], [-68.81, 18.345], [-68.84, 18.36], [-68.9, 18.38], [-69.0, 18.4],
];
const LAND = COAST.map(([lng, lat], i) => `${i ? "L" : "M"}${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join(" ") + " Z";
const AIRPORT = { lng: -68.363, lat: 18.567 };

// Escala secuencial de 4 pasos (azul claro → navy) para el valor de la métrica
const STEPS = ["#C9D6E8", "#7FA0C8", "#3A6A9E", "#0F2B4C"];

export interface ZoneMapProps {
  zones: MarketZone[];
  values: Record<string, number>; // valor de la métrica por zona
  format: (v: number) => string;
  selected: string | null;
  onSelect: (slug: string | null) => void;
  lang: "es" | "en";
}

export function ZoneMap({ zones, values, format, selected, onSelect, lang }: ZoneMapProps) {
  const vals = zones.map((z) => values[z.slug]).filter((v) => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const step = (v: number) => (max === min ? 3 : Math.min(3, Math.floor(((v - min) / (max - min)) * 4)));
  const maxListings = Math.max(...zones.map((z) => z.active_listings ?? 0), 1);
  const edges = [0, 1, 2, 3, 4].map((i) => min + ((max - min) * i) / 4);

  return (
    <div className="relative">
      <svg viewBox="0 0 683 580" className="w-full h-auto" role="img" aria-label={lang === "es" ? "Mapa de zonas" : "Zone map"}>
        <rect width="683" height="580" fill="#E8F1F8" />
        <path d={LAND} fill="#F7F3EA" stroke="#D9CDB4" strokeWidth="2" />
        <text x={x(-68.25)} y={y(18.62)} fill="#7FA0C8" fontSize="15" fontStyle="italic" textAnchor="end">
          {lang === "es" ? "Océano Atlántico" : "Atlantic Ocean"}
        </text>
        <text x={x(-68.62)} y={y(18.32)} fill="#7FA0C8" fontSize="15" fontStyle="italic" textAnchor="middle">
          {lang === "es" ? "Mar Caribe" : "Caribbean Sea"}
        </text>

        {/* Aeropuerto PUJ */}
        <g transform={`translate(${x(AIRPORT.lng)},${y(AIRPORT.lat)})`}>
          <rect x="-9" y="-9" width="18" height="18" rx="4" fill="#0F2B4C" />
          <text y="4.5" textAnchor="middle" fontSize="12" fill="#F0A030">✈</text>
          <text x="13" y="4" fontSize="11" fill="#0F2B4C" opacity="0.7">PUJ</text>
        </g>

        {zones.map((z) => {
          const v = values[z.slug];
          const r = 12 + 20 * Math.sqrt((z.active_listings ?? 0) / maxListings);
          const isSel = selected === z.slug;
          const dim = selected && !isSel;
          return (
            <g
              key={z.slug}
              transform={`translate(${x(z.lng)},${y(z.lat)})`}
              onClick={() => onSelect(isSel ? null : z.slug)}
              className="cursor-pointer"
              opacity={dim ? 0.45 : 1}
            >
              <title>{`${z.name}: ${v != null ? format(v) : "—"}`}</title>
              <circle r={r} fill={v != null ? STEPS[step(v)] : "#ccc"} fillOpacity="0.85" stroke={isSel ? "#F0A030" : "#fff"} strokeWidth={isSel ? 4 : 2} />
              <text y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill={v != null && step(v) >= 2 ? "#fff" : "#0F2B4C"}>
                {v != null ? format(v) : "—"}
              </text>
              <text y={r + 14} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0F2B4C" stroke="#F7F3EA" strokeWidth="3" paintOrder="stroke">
                {z.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Leyenda */}
      <div className="absolute left-3 top-3 rounded-xl bg-white/90 backdrop-blur px-3 py-2 text-[11px] text-[#0F2B4C] shadow">
        {STEPS.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: c }} />
            {format(edges[i])} – {format(edges[i + 1])}
          </div>
        ))}
        <div className="mt-1 text-[#0F2B4C]/50">{lang === "es" ? "Tamaño = nº de propiedades" : "Size = # of listings"}</div>
      </div>
    </div>
  );
}
