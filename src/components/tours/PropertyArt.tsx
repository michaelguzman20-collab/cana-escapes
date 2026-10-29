import { useId, type ReactNode } from "react";

// Imagen de presentación de un tour en /tours: una ilustración según el tipo de propiedad (atardecer
// caribeño con los colores de la marca), para no mostrar la foto real antes de entrar al recorrido.
// SVG propio (sin derechos de autor ni descargas) con nubes, sol y ventanas animadas.

export type CardImage = "villa" | "apartamento" | "casa" | "penthouse" | "local" | "oficina" | "proyecto";

export const CARD_IMAGES: { id: CardImage; label: string; en: string }[] = [
  { id: "villa", label: "Villa", en: "Villa" },
  { id: "apartamento", label: "Apartamento", en: "Apartment" },
  { id: "casa", label: "Casa", en: "House" },
  { id: "penthouse", label: "Penthouse", en: "Penthouse" },
  { id: "local", label: "Local / tienda", en: "Store" },
  { id: "oficina", label: "Oficina", en: "Office" },
  { id: "proyecto", label: "Proyecto", en: "Project" },
];

export function cardImageOf(v: string | null | undefined): CardImage {
  return CARD_IMAGES.some((c) => c.id === v) ? (v as CardImage) : "villa";
}

const DARK = "#0a1c33";
const LIT = "#F7C66A";

/** Ventana encendida; algunas parpadean suave para dar vida */
function Win({ x, y, w = 14, h = 16, on = true, blink }: { x: number; y: number; w?: number; h?: number; on?: boolean; blink?: number }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={1.5} fill={on ? LIT : "#1d3a5c"} opacity={on ? 0.9 : 1}>
      {blink && <animate attributeName="opacity" values="0.9;0.35;0.9" dur={`${blink}s`} repeatCount="indefinite" />}
    </rect>
  );
}

function Palm({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 330) scale(${s})`} fill={DARK}>
      <path d="M0 0 C 4 -40, 10 -80, 6 -118 L 12 -118 C 16 -80, 10 -40, 8 0 Z" />
      <g transform="translate(9 -120)">
        <animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur="6s" repeatCount="indefinite" additive="sum" />
        <path d="M0 0 C -20 -14, -46 -10, -60 6 C -40 -2, -20 -2, 0 4 Z" />
        <path d="M0 0 C 20 -14, 46 -10, 60 6 C 40 -2, 20 -2, 0 4 Z" />
        <path d="M0 0 C -10 -22, -30 -34, -50 -30 C -30 -24, -14 -14, 0 2 Z" />
        <path d="M0 0 C 10 -22, 30 -34, 50 -30 C 30 -24, 14 -14, 0 2 Z" />
        <path d="M0 0 C -4 -20, 0 -36, 6 -44 C 4 -30, 4 -16, 2 2 Z" />
      </g>
    </g>
  );
}

function Cloud({ x, y, s = 1, dur }: { x: number; y: number; s?: number; dur: number }) {
  return (
    <g opacity={0.55}>
      <animateTransform attributeName="transform" type="translate" values="0 0;-70 0;0 0" dur={`${dur}s`} repeatCount="indefinite" />
      <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
        <ellipse cx="0" cy="0" rx="34" ry="11" />
        <ellipse cx="-14" cy="-7" rx="16" ry="11" />
        <ellipse cx="12" cy="-9" rx="20" ry="13" />
      </g>
    </g>
  );
}

const BUILDINGS: Record<CardImage, () => ReactNode> = {
  villa: () => (
    <g>
      <rect x="300" y="178" width="150" height="56" fill={DARK} />
      <rect x="290" y="170" width="170" height="10" fill="#132c4b" />
      <rect x="150" y="232" width="320" height="98" fill={DARK} />
      <rect x="134" y="222" width="352" height="12" fill="#132c4b" />
      <Win x={316} y={192} w={56} h={30} blink={7} />
      <Win x={380} y={192} w={56} h={30} on={false} />
      <Win x={170} y={250} w={70} h={64} />
      <Win x={252} y={250} w={70} h={64} blink={9} />
      <Win x={334} y={250} w={44} h={64} on={false} />
      <Win x={390} y={250} w={62} h={64} />
      <rect x="160" y="338" width="260" height="16" rx="3" fill="#4fb3d9">
        <animate attributeName="fill" values="#4fb3d9;#6fd0ef;#4fb3d9" dur="4s" repeatCount="indefinite" />
      </rect>
    </g>
  ),
  apartamento: () => (
    <g>
      <rect x="215" y="100" width="210" height="230" fill={DARK} />
      <rect x="205" y="92" width="230" height="10" fill="#132c4b" />
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => (
          <Win key={`${r}-${c}`} x={230 + c * 38} y={114 + r * 30} w={24} h={18} on={(r * 5 + c) % 3 !== 1} blink={(r + c) % 5 === 0 ? 6 + r : undefined} />
        )),
      )}
      {Array.from({ length: 7 }, (_, r) => <rect key={r} x="222" y={134 + r * 30} width="196" height="3" fill="#2a4a70" />)}
    </g>
  ),
  casa: () => (
    <g>
      <rect x="215" y="235" width="210" height="95" fill={DARK} />
      <polygon points="198,238 320,168 442,238" fill="#132c4b" />
      <rect x="380" y="180" width="18" height="40" fill={DARK} />
      <rect x="302" y="270" width="36" height="60" rx="2" fill="#1d3a5c" />
      <circle cx="331" cy="301" r="2.5" fill={LIT} />
      <Win x={236} y={258} w={48} h={40} blink={8} />
      <Win x={356} y={258} w={48} h={40} />
      <circle cx="320" cy="212" r="12" fill={LIT} opacity="0.85" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x={150 + i * 30 + (i > 5 ? 120 : 0)} y="312" width="6" height="22" fill={DARK} />)}
      <rect x="150" y="318" width="160" height="4" fill={DARK} />
      <rect x="450" y="318" width="160" height="4" fill={DARK} />
    </g>
  ),
  penthouse: () => (
    <g>
      <rect x="255" y="62" width="130" height="268" fill={DARK} />
      <rect x="245" y="96" width="150" height="6" fill="#2a4a70" />
      <rect x="262" y="66" width="116" height="28" fill={LIT} opacity="0.95">
        <animate attributeName="opacity" values="0.95;0.7;0.95" dur="5s" repeatCount="indefinite" />
      </rect>
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={266 + i * 22} y="62" width="2" height="34" fill={DARK} />)}
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => <Win key={`${r}-${c}`} x={268 + c * 28} y={112 + r * 24} w={18} h={14} on={(r + c) % 4 === 0} blink={(r * c) % 7 === 3 ? 8 : undefined} />),
      )}
      <rect x="150" y="210" width="90" height="120" fill="#0d2441" />
      <rect x="400" y="180" width="100" height="150" fill="#0d2441" />
    </g>
  ),
  local: () => (
    <g>
      <rect x="170" y="200" width="300" height="130" fill={DARK} />
      <rect x="160" y="190" width="320" height="14" fill="#132c4b" />
      <rect x="230" y="208" width="180" height="26" rx="4" fill="#132c4b" />
      <rect x="250" y="217" width="140" height="8" rx="4" fill={LIT} opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.5;0.9" dur="3s" repeatCount="indefinite" />
      </rect>
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${176 + i * 29} 240 h29 l-4 26 h-21 z`} fill={i % 2 ? "#ffffff" : "#F0A030"} />
      ))}
      <Win x={190} y={274} w={150} h={56} />
      <rect x="356" y="274" width="44" height="56" fill="#1d3a5c" />
      <Win x={412} y={274} w={44} h={56} blink={6} />
    </g>
  ),
  oficina: () => (
    <g>
      <rect x="200" y="80" width="120" height="250" fill={DARK} />
      <rect x="340" y="140" width="130" height="190" fill="#0d2441" />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={212 + i * 18} y="88" width="10" height="236" fill="#1d3a5c" />)}
      {Array.from({ length: 10 }, (_, r) => <Win key={r} x={212} y={96 + r * 22} w={96} h={6} on={r % 3 === 0} blink={r === 6 ? 7 : undefined} />)}
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => <Win key={`${r}-${c}`} x={352 + c * 28} y={154 + r * 24} w={20} h={14} on={(r + c) % 3 === 0} />),
      )}
    </g>
  ),
  proyecto: () => (
    <g>
      <rect x="180" y="150" width="200" height="180" fill="none" stroke={DARK} strokeWidth="6" />
      {[190, 230, 270].map((y) => <rect key={y} x="180" y={y} width="200" height="6" fill={DARK} />)}
      {[230, 280, 330].map((x) => <rect key={x} x={x} y="150" width="6" height="180" fill={DARK} />)}
      <rect x="180" y="270" width="200" height="60" fill={DARK} />
      <Win x={196} y={286} w={30} h={22} />
      <Win x={300} y={286} w={30} h={22} blink={6} />
      <rect x="452" y="70" width="10" height="260" fill={DARK} />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M452 ${80 + i * 21} l10 10`} stroke="#1d3a5c" strokeWidth="2" />)}
      <rect x="340" y="70" width="230" height="8" fill={DARK} />
      <polygon points="452,70 457,40 462,70" fill={DARK} />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;-40 0;0 0" dur="9s" repeatCount="indefinite" />
        <line x1="400" y1="78" x2="400" y2="140" stroke={DARK} strokeWidth="2">
          <animate attributeName="y2" values="140;170;140" dur="9s" repeatCount="indefinite" />
        </line>
        <rect x="388" y="140" width="24" height="12" fill="#F0A030">
          <animate attributeName="y" values="140;170;140" dur="9s" repeatCount="indefinite" />
        </rect>
      </g>
    </g>
  ),
};

/** Ilustración 16:10 (se recorta con object-fit como una foto: usar w-full h-full) */
export function PropertyArt({ kind, className }: { kind: string | null | undefined; className?: string }) {
  const id = useId().replace(/:/g, "");
  const k = cardImageOf(kind);
  return (
    <svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={CARD_IMAGES.find((c) => c.id === k)?.label}>
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1f38" />
          <stop offset="0.45" stopColor="#1d4a7a" />
          <stop offset="0.78" stopColor="#c9734a" />
          <stop offset="1" stopColor="#F0A030" />
        </linearGradient>
        <linearGradient id={`sea${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6a04a" />
          <stop offset="1" stopColor="#173a63" />
        </linearGradient>
        <radialGradient id={`glow${id}`}>
          <stop offset="0" stopColor="#FFE3A3" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE3A3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="400" fill={`url(#sky${id})`} />
      <circle cx="500" cy="262" r="90" fill={`url(#glow${id})`}>
        <animate attributeName="r" values="80;100;80" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="500" cy="262" r="40" fill="#FFD27A" />
      <Cloud x={130} y={70} s={1.1} dur={38} />
      <Cloud x={420} y={110} s={0.8} dur={30} />
      <Cloud x={580} y={55} s={0.7} dur={46} />
      <rect y="290" width="640" height="40" fill={`url(#sea${id})`} />
      {[300, 312, 322].map((y, i) => (
        <rect key={y} x={440 + i * 12} y={y} width={120 - i * 24} height="2" rx="1" fill="#FFE3A3" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.15;0.6" dur={`${3 + i}s`} repeatCount="indefinite" />
        </rect>
      ))}
      {BUILDINGS[k]()}
      <rect y="328" width="640" height="72" fill="#081729" />
      <Palm x={70} s={1.15} />
      <Palm x={110} s={0.85} />
      <Palm x={560} s={1} />
    </svg>
  );
}
