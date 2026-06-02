import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light"; // dark = sobre fondo claro, light = sobre fondo oscuro
  compact?: boolean; // horizontal compact layout (for mobile headers)
}

export function Logo({ className, size = "md", variant = "dark", compact = false }: LogoProps) {
  const scales = { sm: 0.58, md: 0.78, lg: 1 };
  const s = scales[size];

  const iconW = Math.round(130 * s);
  const iconH = Math.round(80  * s);

  const titleSize = size === "sm" ? "text-xl"  : size === "md" ? "text-2xl" : "text-4xl";
  const subSize   = size === "sm" ? "text-[7px]" : size === "md" ? "text-[9px]" : "text-[11px]";

  // ── Colores por variante ──────────────────────────────────────────────────
  const sunColor    = "#F0A030";
  const arcColor    = variant === "light" ? "rgba(240,160,48,0.9)"  : "#F0A030";
  const coordColor  = variant === "light" ? "rgba(240,160,48,0.85)" : "#F0A030";
  const lineStrong  = variant === "light" ? "rgba(255,255,255,0.95)" : "#0F2B4C";
  const lineMid     = variant === "light" ? "rgba(255,255,255,0.5)"  : "#2D6A9F";
  const wordCana    = variant === "light" ? "#7EC8E3"                : "#2D6A9F";
  const wordEscapes = variant === "light" ? "#FFFFFF"                : "#0F2B4C";
  const tagline     = variant === "light" ? "rgba(180,210,230,0.75)" : "#2D6A9F";

  // Compact mode: horizontal mini logo for tight spaces (mobile headers)
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Mini sun + horizon icon */}
        <svg width="34" height="22" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M 12 26 A 18 18 0 0 1 48 26 Z" fill={sunColor}/>
          <line x1="2" y1="26" x2="58" y2="26" stroke={lineStrong} strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="32" x2="52" y2="32" stroke={lineMid} strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {/* Wordmark inline */}
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="font-serif italic text-lg" style={{ color: wordCana, letterSpacing: "-0.01em" }}>
            Cana
          </span>
          <span className="font-serif font-bold text-lg" style={{ color: wordEscapes }}>
            Escapes
          </span>
        </div>
      </div>
    );
  }

  // viewBox: 130 × 80  (más ancho para coordenadas a los lados)
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {/* ── Ícono ──────────────────────────────────────────────────────────── */}
      <svg
        width={iconW}
        height={iconH}
        viewBox="0 0 140 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* ── Coordenada norte: 18° N ──────────────────────────────────────── */}
        <text
          x="60" y="10"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="9"
          fill={coordColor}
          textAnchor="end"
          fontWeight="bold"
        >
          18°
        </text>
        <text
          x="65" y="10"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="9"
          fill={coordColor}
          textAnchor="start"
          fontWeight="bold"
        >
          N
        </text>

        {/* Línea vertical N */}
        <line x1="62" y1="13" x2="62" y2="22"
          stroke={arcColor} strokeWidth="1.4" strokeLinecap="round"/>

        {/* ── Arco del compás ─────────────────────────────────────────────── */}
        <path
          d="M 28 54 A 34 34 0 0 1 96 54"
          stroke={arcColor}
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Ticks diagonales izquierdo y derecho */}
        <line x1="35" y1="29" x2="40" y2="35"
          stroke={arcColor} strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="89" y1="29" x2="84" y2="35"
          stroke={arcColor} strokeWidth="1.2" strokeLinecap="round"/>

        {/* ── Sol (semicírculo) ────────────────────────────────────────────── */}
        <path d="M 40 54 A 22 22 0 0 1 84 54 Z" fill={sunColor}/>

        {/* ── Líneas horizonte ─────────────────────────────────────────────── */}
        <line x1="4"  y1="54" x2="118" y2="54"
          stroke={lineStrong} strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="20" y1="60" x2="104" y2="60"
          stroke={lineMid}   strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="34" y1="66" x2="90"  y2="66"
          stroke={lineMid}   strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>

        {/* ── Coordenada oeste: 68° W ──────────────────────────────────────── */}
        <text
          x="121" y="57"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="8.5"
          fill={coordColor}
          textAnchor="start"
          fontWeight="bold"
        >
          68°
        </text>
        <text
          x="138" y="57"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="8.5"
          fill={lineMid}
          textAnchor="end"
          fontWeight="bold"
        >
          W
        </text>
      </svg>

      {/* ── Wordmark ───────────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-2 leading-none">
        <span
          className={cn("font-serif italic", titleSize)}
          style={{ color: wordCana, letterSpacing: "-0.01em" }}
        >
          Cana
        </span>
        <span
          className={cn("font-serif font-bold", titleSize)}
          style={{ color: wordEscapes }}
        >
          Escapes
        </span>
      </div>

      {/* ── Tagline ────────────────────────────────────────────────────────── */}
      <p
        className={cn("tracking-[0.22em] uppercase font-sans font-light", subSize)}
        style={{ color: tagline }}
      >
        Punta Cana · Luxury · Experiences
      </p>
    </div>
  );
}
