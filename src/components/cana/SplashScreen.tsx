import { useEffect, useState, type CSSProperties } from "react";

interface SplashScreenProps {
  /** Called once the splash has fully faded out and should be unmounted. */
  onDone: () => void;
  /** How long the intro plays before fading, in ms (the animation finishes at ~2.9s). */
  hold?: number;
  /** Escala de tiempos: 1 = primera entrada (lenta, se ve todo); 0.4 = carga rápida entre pestañas. */
  speed?: number;
}

// Colores del logo oficial (public/brand/logo-dark.png)
const NAVY = "#0F3B5F";
const BLUE = "#1F6FA6";
const SUN = "#F4A623";

/**
 * Intro de la portada: el logo se arma por partes.
 * 1) aparece el nombre, 2) se dibuja el horizonte y sale el sol,
 * 3) aparecen los rayos y por último las coordenadas 18° N / 68° W.
 * Todo es CSS (clases splash-* en index.css), sin librerías.
 */
// Retraso de cada pieza, escalado con --splash-s (ver index.css)
const d = (s: number) => `calc(${s}s * var(--splash-s, 1))`;

export function SplashScreen({ onDone, hold = 3500, speed = 1 }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: skip the splash entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }

    const fade = Math.round(600 * Math.max(speed, 0.5));
    const fadeTimer = window.setTimeout(() => setFading(true), hold * speed);
    const doneTimer = window.setTimeout(onDone, hold * speed + fade);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [hold, onDone, speed]);

  const mono = "ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ "--splash-s": speed, transitionDuration: `${Math.round(600 * Math.max(speed, 0.5))}ms` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="flex w-[min(88vw,560px)] flex-col items-center">
        {/* ── Ícono: horizonte, sol, rayos y coordenadas ── */}
        <svg viewBox="420 0 720 310" className="w-full h-auto overflow-visible">
          <defs>
            {/* El sol solo se ve por encima del horizonte, así "sale" del mar */}
            <clipPath id="splash-sky">
              <rect x="420" y="0" width="720" height="200" />
            </clipPath>
          </defs>

          {/* Arco claro y rayos (después del sol) */}
          <g className="splash-rays">
            <path d="M 622 200 A 125 125 0 0 1 872 200" fill="none" stroke={SUN} strokeOpacity="0.25" strokeWidth="3" />
            <line x1="747" y1="104" x2="747" y2="68" stroke={SUN} strokeWidth="5" strokeLinecap="round" />
            <line x1="747" y1="60" x2="747" y2="44" stroke={SUN} strokeWidth="4" strokeLinecap="round" />
            <line x1="679" y1="132" x2="655" y2="108" stroke={SUN} strokeWidth="5" strokeLinecap="round" />
            <line x1="815" y1="132" x2="839" y2="108" stroke={SUN} strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Sol saliendo */}
          <g clipPath="url(#splash-sky)">
            <path className="splash-sun" d="M 651 200 A 96 96 0 0 1 843 200 Z" fill={SUN} />
          </g>

          {/* Horizonte y reflejos en el agua */}
          <line className="splash-line" style={{ animationDelay: d(0.55) }} x1="516" y1="200" x2="978" y2="200" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
          <g className="splash-rays">
            <line x1="614" y1="200" x2="651" y2="200" stroke={SUN} strokeWidth="5" />
            <line x1="843" y1="200" x2="880" y2="200" stroke={SUN} strokeWidth="5" />
          </g>
          <line className="splash-line" style={{ animationDelay: d(0.7) }} x1="570" y1="236" x2="923" y2="236" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
          <line className="splash-line" style={{ animationDelay: d(0.85) }} x1="618" y1="268" x2="876" y2="268" stroke={BLUE} strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />
          <line className="splash-line" style={{ animationDelay: d(1) }} x1="670" y1="300" x2="823" y2="300" stroke={BLUE} strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />

          {/* Coordenadas: 18° N (ámbar) arriba, 68° W (azul) a la derecha */}
          <text className="splash-num" x="747" y="28" textAnchor="middle" fontFamily={mono} fontWeight="700" fontSize="30" letterSpacing="5" fill={SUN}>
            18° N
          </text>
          <g className="splash-num" style={{ animationDelay: d(2.45) }}>
            <line x1="986" y1="200" x2="1002" y2="200" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
            <text x="1016" y="212" fontFamily={mono} fontSize="30" letterSpacing="5" fill={NAVY}>
              68° W
            </text>
          </g>
        </svg>

        {/* ── Nombre (lo primero que aparece) ── */}
        <div className="splash-name mt-[6%] flex items-baseline gap-[0.3em] leading-none text-[clamp(2.4rem,10vw,4.6rem)]">
          <span className="font-serif italic" style={{ color: BLUE, letterSpacing: "0.04em" }}>Cana</span>
          <span className="font-sans font-bold" style={{ color: NAVY }}>Escapes</span>
        </div>
        <div className="splash-name mt-3 h-px w-full bg-[#1F6FA6]/15" style={{ animationDelay: d(0.25) }} />
        <p
          className="splash-name mt-3 font-sans uppercase tracking-[0.42em] text-[clamp(0.55rem,2vw,0.8rem)] text-[#1F6FA6]/80 text-center"
          style={{ animationDelay: d(0.35) }}
        >
          Punta Cana · Luxury · Experiences
        </p>
      </div>
    </div>
  );
}
