import { useId, type ReactNode } from "react";

// Imagen de presentación de un tour en /tours: una ilustración según el tipo de propiedad (atardecer
// caribeño con los colores de la marca), para no mostrar la foto real antes de entrar al recorrido.
// SVG propio (sin derechos de autor ni descargas): edificios con volumen, ventanas con brillo, estrellas,
// pájaros, nubes y el reflejo del sol en el mar, todo animado suave.
// También se puede usar una foto o el logo de la propiedad (tours.card_image = "foto" | "logo").

export type CardImage = "villa" | "apartamento" | "condominio" | "casa" | "penthouse" | "local" | "oficina" | "proyecto";

export const CARD_IMAGES: { id: CardImage; label: string; en: string }[] = [
  { id: "villa", label: "Villa", en: "Villa" },
  { id: "apartamento", label: "Apartamento", en: "Apartment" },
  { id: "condominio", label: "Condominio", en: "Condo" },
  { id: "casa", label: "Casa", en: "House" },
  { id: "penthouse", label: "Penthouse", en: "Penthouse" },
  { id: "local", label: "Local / tienda", en: "Store" },
  { id: "oficina", label: "Oficina", en: "Office" },
  { id: "proyecto", label: "Proyecto", en: "Project" },
];

export function cardImageOf(v: string | null | undefined): CardImage {
  return CARD_IMAGES.some((c) => c.id === v) ? (v as CardImage) : "villa";
}

type Ids = { front: string; side: string; win: string; glow: string; pool: string };

/** Bloque con volumen: frente, cara lateral en sombra y techo */
function Box({ x, y, w, h, d = 16, ids }: { x: number; y: number; w: number; h: number; d?: number; ids: Ids }) {
  return (
    <g>
      <polygon points={`${x + w},${y} ${x + w + d},${y - d * 0.6} ${x + w + d},${y + h - d * 0.6} ${x + w},${y + h}`} fill={`url(#${ids.side})`} />
      <polygon points={`${x},${y} ${x + d},${y - d * 0.6} ${x + w + d},${y - d * 0.6} ${x + w},${y}`} fill="#2a5585" />
      <rect x={x} y={y} width={w} height={h} fill={`url(#${ids.front})`} />
    </g>
  );
}

/** Ventana encendida (con brillo) o apagada; algunas parpadean suave */
function Win({ x, y, w = 14, h = 16, on = true, blink, ids }: { x: number; y: number; w?: number; h?: number; on?: boolean; blink?: number; ids: Ids }) {
  if (!on) return <rect x={x} y={y} width={w} height={h} rx={1.5} fill="#1b3a5f" stroke="#2a5585" strokeWidth="0.6" />;
  return (
    <rect x={x} y={y} width={w} height={h} rx={1.5} fill={`url(#${ids.win})`} filter={`url(#${ids.glow})`}>
      {blink && <animate attributeName="opacity" values="1;0.45;1" dur={`${blink}s`} repeatCount="indefinite" />}
    </rect>
  );
}

function Palm({ x, s = 1, y = 334 }: { x: number; s?: number; y?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C 4 -40, 10 -80, 6 -118 L 12 -118 C 16 -80, 10 -40, 8 0 Z" fill="#06121f" />
      <g transform="translate(9 -120)" fill="#06121f">
        <animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur="6s" repeatCount="indefinite" additive="sum" />
        <path d="M0 0 C -20 -14, -46 -10, -60 6 C -40 -2, -20 -2, 0 4 Z" />
        <path d="M0 0 C 20 -14, 46 -10, 60 6 C 40 -2, 20 -2, 0 4 Z" />
        <path d="M0 0 C -10 -22, -30 -34, -50 -30 C -30 -24, -14 -14, 0 2 Z" />
        <path d="M0 0 C 10 -22, 30 -34, 50 -30 C 30 -24, 14 -14, 0 2 Z" />
        <path d="M0 0 C -4 -20, 0 -36, 6 -44 C 4 -30, 4 -16, 2 2 Z" />
        <circle cx="4" cy="4" r="4" fill="#0d2238" />
      </g>
    </g>
  );
}

function Cloud({ x, y, s = 1, dur }: { x: number; y: number; s?: number; dur: number }) {
  return (
    <g opacity={0.4}>
      <animateTransform attributeName="transform" type="translate" values="0 0;-70 0;0 0" dur={`${dur}s`} repeatCount="indefinite" />
      <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffd6b5">
        <ellipse cx="0" cy="0" rx="34" ry="10" />
        <ellipse cx="-14" cy="-7" rx="16" ry="11" />
        <ellipse cx="12" cy="-9" rx="20" ry="13" />
      </g>
    </g>
  );
}

function Birds() {
  return (
    <g stroke="#0b1f38" strokeWidth="2" fill="none" strokeLinecap="round">
      <animateTransform attributeName="transform" type="translate" values="0 0;-120 -14;-240 0" dur="22s" repeatCount="indefinite" />
      <path d="M560 120 q6 -6 12 0 q6 -6 12 0" />
      <path d="M586 134 q5 -5 10 0 q5 -5 10 0" />
    </g>
  );
}

function Pool({ x, y, w, ids }: { x: number; y: number; w: number; ids: Ids }) {
  return (
    <g>
      <rect x={x - 6} y={y - 4} width={w + 12} height="24" rx="4" fill="#d9c9a8" opacity="0.35" />
      <rect x={x} y={y} width={w} height="16" rx="3" fill={`url(#${ids.pool})`} />
      {[0.15, 0.45, 0.75].map((f, i) => (
        <rect key={i} x={x + w * f} y={y + 5} width={w * 0.14} height="2" rx="1" fill="#ffffff" opacity="0.6">
          <animate attributeName="x" values={`${x + w * f};${x + w * f + 14};${x + w * f}`} dur={`${4 + i}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
  );
}

const BUILDINGS: Record<CardImage, (ids: Ids) => ReactNode> = {
  villa: (ids) => (
    <g>
      <Box x={300} y={182} w={150} h={52} d={18} ids={ids} />
      <rect x="290" y="176" width="178" height="8" fill="#e8dcc6" />
      <Box x={150} y={234} w={320} h={96} d={18} ids={ids} />
      <rect x="138" y="226" width="350" height="10" fill="#e8dcc6" />
      <Win x={316} y={194} w={56} h={30} blink={7} ids={ids} />
      <Win x={382} y={194} w={56} h={30} on={false} ids={ids} />
      <Win x={168} y={250} w={72} h={66} ids={ids} />
      <Win x={250} y={250} w={72} h={66} blink={9} ids={ids} />
      <rect x="334" y="250" width="40" height="80" fill="#1b3a5f" />
      <Win x={386} y={250} w={66} h={66} ids={ids} />
      <Pool x={160} y={340} w={270} ids={ids} />
    </g>
  ),
  apartamento: (ids) => (
    <g>
      <Box x={215} y={102} w={200} h={228} d={22} ids={ids} />
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => (
          <Win key={`${r}-${c}`} x={228 + c * 38} y={116 + r * 30} w={24} h={18} on={(r * 5 + c) % 3 !== 1} blink={(r + c) % 5 === 0 ? 6 + r : undefined} ids={ids} />
        )),
      )}
      {Array.from({ length: 7 }, (_, r) => <rect key={r} x="219" y={136 + r * 30} width="192" height="4" rx="1" fill="#e8dcc6" opacity="0.85" />)}
    </g>
  ),
  condominio: (ids) => (
    <g>
      <Box x={150} y={170} w={110} h={160} d={16} ids={ids} />
      <Box x={290} y={130} w={120} h={200} d={18} ids={ids} />
      <Box x={440} y={190} w={100} h={140} d={14} ids={ids} />
      {[[150, 170, 3, 6], [290, 130, 3, 8], [440, 190, 3, 5]].map(([bx, by, cols, rows]) =>
        Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <Win key={`${bx}-${r}-${c}`} x={bx + 12 + c * 32} y={by + 14 + r * 24} w={20} h={13} on={(r + c + bx) % 3 !== 0} blink={(r * c) % 5 === 2 ? 7 : undefined} ids={ids} />
          )),
        ),
      )}
      <Pool x={190} y={342} w={300} ids={ids} />
    </g>
  ),
  casa: (ids) => (
    <g>
      <Box x={215} y={238} w={210} h={92} d={16} ids={ids} />
      <polygon points="200,240 320,170 440,240" fill="#e8dcc6" />
      <polygon points="208,240 320,178 432,240" fill="#7a3b2e" />
      <polygon points="432,240 448,230 336,168 320,178" fill="#5c2b22" />
      <rect x="378" y="182" width="18" height="36" fill="#7a3b2e" />
      <rect x="302" y="270" width="36" height="60" rx="2" fill="#5c2b22" />
      <circle cx="331" cy="301" r="2.5" fill="#FFD27A" />
      <Win x={234} y={258} w={50} h={40} blink={8} ids={ids} />
      <Win x={356} y={258} w={50} h={40} ids={ids} />
      <circle cx="320" cy="214" r="11" fill={`url(#${ids.win})`} filter={`url(#${ids.glow})`} />
      {Array.from({ length: 16 }, (_, i) => <rect key={i} x={140 + i * 26 + (i > 6 ? 130 : 0)} y="316" width="5" height="22" rx="1" fill="#e8dcc6" opacity="0.8" />)}
      <rect x="140" y="322" width="165" height="3" fill="#e8dcc6" opacity="0.8" />
      <rect x="452" y="322" width="180" height="3" fill="#e8dcc6" opacity="0.8" />
    </g>
  ),
  penthouse: (ids) => (
    <g>
      <Box x={150} y={210} w={80} h={120} d={12} ids={ids} />
      <Box x={420} y={180} w={90} h={150} d={12} ids={ids} />
      <Box x={255} y={66} w={130} h={264} d={22} ids={ids} />
      <rect x="262" y="70" width="116" height="28" fill={`url(#${ids.win})`} filter={`url(#${ids.glow})`}>
        <animate attributeName="opacity" values="1;0.75;1" dur="5s" repeatCount="indefinite" />
      </rect>
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={266 + i * 22} y="66" width="2" height="34" fill="#0d2441" />)}
      <rect x="245" y="100" width="150" height="5" fill="#e8dcc6" />
      {Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => <Win key={`${r}-${c}`} x={268 + c * 28} y={114 + r * 24} w={18} h={14} on={(r + c) % 4 === 0} blink={(r * c) % 7 === 3 ? 8 : undefined} ids={ids} />),
      )}
      {Array.from({ length: 4 }, (_, r) => <Win key={r} x={164} y={226 + r * 24} w={50} h={10} on={r % 2 === 0} ids={ids} />)}
      {Array.from({ length: 5 }, (_, r) => <Win key={r} x={434} y={196 + r * 24} w={60} h={10} on={r % 2 === 1} ids={ids} />)}
    </g>
  ),
  local: (ids) => (
    <g>
      <Box x={170} y={200} w={300} h={130} d={16} ids={ids} />
      <rect x="160" y="190" width="320" height="12" fill="#e8dcc6" />
      <rect x="230" y="208" width="180" height="26" rx="4" fill="#0d2441" />
      <rect x="250" y="217" width="140" height="8" rx="4" fill={`url(#${ids.win})`} filter={`url(#${ids.glow})`}>
        <animate attributeName="opacity" values="1;0.55;1" dur="3s" repeatCount="indefinite" />
      </rect>
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={`M${176 + i * 29} 240 h29 l-4 26 h-21 z`} fill={i % 2 ? "#ffffff" : "#F0A030"} />
      ))}
      <Win x={190} y={274} w={150} h={56} ids={ids} />
      <rect x="356" y="274" width="44" height="56" fill="#1b3a5f" />
      <Win x={412} y={274} w={44} h={56} blink={6} ids={ids} />
      {[200, 300, 440].map((x) => <ellipse key={x} cx={x} cy="334" rx="16" ry="7" fill="#123a2a" />)}
    </g>
  ),
  oficina: (ids) => (
    <g>
      <Box x={340} y={140} w={130} h={190} d={16} ids={ids} />
      <Box x={200} y={80} w={120} h={250} d={20} ids={ids} />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={210 + i * 18} y="88" width="10" height="236" fill="#2a5585" opacity="0.55" />)}
      {Array.from({ length: 10 }, (_, r) => <Win key={r} x={210} y={96 + r * 22} w={100} h={6} on={r % 3 === 0} blink={r === 6 ? 7 : undefined} ids={ids} />)}
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 4 }, (_, c) => <Win key={`${r}-${c}`} x={352 + c * 28} y={154 + r * 24} w={20} h={14} on={(r + c) % 3 === 0} ids={ids} />),
      )}
    </g>
  ),
  proyecto: (ids) => (
    <g>
      <rect x="180" y="150" width="200" height="180" fill="none" stroke="#2a5585" strokeWidth="6" />
      {[190, 230, 270].map((y) => <rect key={y} x="180" y={y} width="200" height="6" fill="#2a5585" />)}
      {[230, 280, 330].map((x) => <rect key={x} x={x} y="150" width="6" height="180" fill="#2a5585" />)}
      <Box x={180} y={270} w={200} h={60} d={14} ids={ids} />
      <Win x={196} y={286} w={30} h={22} ids={ids} />
      <Win x={300} y={286} w={30} h={22} blink={6} ids={ids} />
      <rect x="452" y="70" width="10" height="260" fill="#F0A030" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M452 ${80 + i * 21} l10 10`} stroke="#b8761a" strokeWidth="2" />)}
      <rect x="340" y="70" width="230" height="8" fill="#F0A030" />
      <polygon points="452,70 457,40 462,70" fill="#F0A030" />
      <rect x="540" y="78" width="26" height="18" fill="#0d2441" />
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;-40 0;0 0" dur="9s" repeatCount="indefinite" />
        <line x1="400" y1="78" x2="400" y2="140" stroke="#0d2441" strokeWidth="2">
          <animate attributeName="y2" values="140;170;140" dur="9s" repeatCount="indefinite" />
        </line>
        <rect x="388" y="140" width="24" height="12" fill="#e8dcc6">
          <animate attributeName="y" values="140;170;140" dur="9s" repeatCount="indefinite" />
        </rect>
      </g>
    </g>
  ),
};

/** Ilustración 16:10 (se recorta como una foto: usar w-full h-full) */
export function PropertyArt({ kind, className }: { kind: string | null | undefined; className?: string }) {
  const u = useId().replace(/:/g, "");
  const k = cardImageOf(kind);
  const ids: Ids = { front: `f${u}`, side: `s${u}`, win: `w${u}`, glow: `g${u}`, pool: `p${u}` };
  return (
    <svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={CARD_IMAGES.find((c) => c.id === k)?.label}>
      <defs>
        <linearGradient id={`sky${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081a30" />
          <stop offset="0.4" stopColor="#1d4a7a" />
          <stop offset="0.68" stopColor="#b9654a" />
          <stop offset="0.82" stopColor="#F0A030" />
          <stop offset="1" stopColor="#FFD27A" />
        </linearGradient>
        <linearGradient id={`sea${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1b25c" />
          <stop offset="0.35" stopColor="#3d6f9e" />
          <stop offset="1" stopColor="#0f2b4c" />
        </linearGradient>
        <linearGradient id={`ground${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d2238" />
          <stop offset="1" stopColor="#050e1a" />
        </linearGradient>
        <linearGradient id={ids.front} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24507f" />
          <stop offset="1" stopColor="#0e2643" />
        </linearGradient>
        <linearGradient id={ids.side} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0c2038" />
          <stop offset="1" stopColor="#081729" />
        </linearGradient>
        <linearGradient id={ids.win} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9B8" />
          <stop offset="1" stopColor="#F0A030" />
        </linearGradient>
        <linearGradient id={ids.pool} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2aa7d6" />
          <stop offset="0.5" stopColor="#7fe0f5" />
          <stop offset="1" stopColor="#2aa7d6" />
        </linearGradient>
        <radialGradient id={`sun${u}`}>
          <stop offset="0" stopColor="#FFF1C9" stopOpacity="1" />
          <stop offset="0.35" stopColor="#FFD27A" stopOpacity="0.8" />
          <stop offset="1" stopColor="#F0A030" stopOpacity="0" />
        </radialGradient>
        <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="640" height="400" fill={`url(#sky${u})`} />
      {[[60, 30], [140, 52], [230, 22], [330, 44], [420, 18], [520, 36], [600, 60], [90, 90], [380, 80]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.6} fill="#ffffff">
          <animate attributeName="opacity" values="0.9;0.2;0.9" dur={`${2.5 + (i % 4)}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx="500" cy="268" r="110" fill={`url(#sun${u})`}>
        <animate attributeName="r" values="100;122;100" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle cx="500" cy="268" r="34" fill="#FFF1C9" />
      <Cloud x={130} y={78} s={1.1} dur={38} />
      <Cloud x={420} y={118} s={0.8} dur={30} />
      <Cloud x={590} y={60} s={0.7} dur={46} />
      <Birds />
      <path d="M0 292 C 80 262, 150 270, 220 284 C 300 262, 380 266, 460 286 C 540 272, 600 276, 640 284 L640 300 L0 300 Z" fill="#14365c" opacity="0.85" />
      <rect y="296" width="640" height="38" fill={`url(#sea${u})`} />
      {[300, 306, 312, 319, 326].map((y, i) => (
        <rect key={y} x={470 - i * 4} y={y} width={60 + i * 8} height="2" rx="1" fill="#FFF1C9" opacity="0.7">
          <animate attributeName="opacity" values="0.75;0.15;0.75" dur={`${2.5 + i * 0.6}s`} repeatCount="indefinite" />
          <animate attributeName="width" values={`${60 + i * 8};${40 + i * 8};${60 + i * 8}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
        </rect>
      ))}
      <rect y="330" width="640" height="70" fill={`url(#ground${u})`} />
      {BUILDINGS[k](ids)}
      <ellipse cx="320" cy="372" rx="300" ry="10" fill="#000000" opacity="0.25" />
      {[120, 520].map((x) => <ellipse key={x} cx={x} cy="350" rx="40" ry="12" fill="#0c2a1f" />)}
      <Palm x={60} s={1.2} y={350} />
      <Palm x={104} s={0.85} />
      <Palm x={575} s={1.05} y={352} />
      {[40, 200, 440, 600].map((x) => (
        <g key={x}>
          <rect x={x} y="352" width="2" height="16" fill="#0d2238" />
          <circle cx={x + 1} cy="351" r="3" fill="#FFD27A" filter={`url(#${ids.glow})`} />
        </g>
      ))}
    </svg>
  );
}

/** Portada propia del tour: una foto (llena el recuadro) o el logo de la propiedad (centrado sobre azul) */
export function CustomCover({ kind, url, className }: { kind: "foto" | "logo"; url: string; className?: string }) {
  if (kind === "foto") return <img src={url} alt="" className={className} style={{ objectFit: "cover" }} />;
  return (
    <div className={className} style={{ background: "radial-gradient(ellipse at top, #1d4a7a 0%, #0F2B4C 60%, #0b1f38 100%)" }}>
      <div className="absolute inset-0 flex items-center justify-center p-10">
        <img src={url} alt="" className="max-w-[60%] max-h-[70%] object-contain drop-shadow-[0_6px_20px_rgba(0,0,0,0.45)]" />
      </div>
    </div>
  );
}
