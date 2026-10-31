import { cn } from "@/lib/utils";

/**
 * Logo de Tours 360 animado: círculo azul con aro ámbar y las dos flechas del ícono 360 por separado.
 * Las dos flechas giran a la vez (la vertical de lado, la horizontal de arriba abajo) y, durante ese
 * mismo giro, todo el ícono da una vuelta completa en el sentido de las manecillas del reloj.
 * Luego hacen la misma pausa.
 * Con `intro` el aro y las flechas se dibujan a la vez (todo listo al cerrarse el aro) y luego giran.
 * Trazos del ícono Rotate3d de lucide; estilos t360-* en index.css.
 */
export function Tours360Logo({ size = 64, intro, className }: { size?: number; intro?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("t360-logo shrink-0 overflow-visible", intro && "t360-intro", className)}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22.5" fill="#0F2B4C" />
      <circle className="t360-ring" cx="24" cy="24" r="22.5" fill="none" stroke="#F0A030" strokeWidth="3" pathLength={1} transform="rotate(-90 24 24)" />
      {/* Ícono 24×24 centrado y a escala, como el distintivo de siempre */}
      <svg x="11.5" y="11.5" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#F0A030" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" overflow="visible">
        <g className="t360-spin">
          <g className="t360-v">
            <path className="t360-draw" pathLength={1} d="M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2" />
          </g>
          <g className="t360-h">
            <path className="t360-draw" pathLength={1} d="M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4" />
            <path className="t360-head" d="m15.194 13.707 3.814 1.86-1.86 3.814" />
          </g>
        </g>
      </svg>
    </svg>
  );
}
