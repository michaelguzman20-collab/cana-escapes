import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/tours";

// Miniatura cuadrada de una foto 360: en vez de la panorámica entera (2:1, deformada) muestra solo
// el trozo que se ve al entrar — centrado en la vista inicial (yaw/pitch) y con su campo de visión.
// La miniatura guardada es equirectangular 2:1, así que se recorta con background-size/position.

interface Props {
  src: string | null | undefined;
  yaw?: number; // radianes
  pitch?: number; // radianes
  fov?: number; // grados que abarca el cuadrado
  alt?: string;
  className?: string;
}

export function PanoThumb({ src, yaw = 0, pitch = 0, fov = 100, alt = "", className }: Props) {
  // k = cuántas veces cabe el cuadrado a lo ancho de la panorámica (360°)
  const k = 360 / Math.min(180, Math.max(45, fov));
  const u = (((0.5 + yaw / (2 * Math.PI)) % 1) + 1) % 1; // punto a centrar, 0-1 a lo ancho
  const x = ((0.5 - u * k) / (1 - k)) * 100;
  const h = k / 2; // alto de la imagen respecto al cuadrado
  const v = 0.5 - pitch / Math.PI;
  const y = h > 1 ? Math.min(100, Math.max(0, ((0.5 - v * h) / (1 - h)) * 100)) : 50;
  return (
    <div
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      className={cn("aspect-square bg-gray-200", className)}
      style={
        src
          ? {
              backgroundImage: `url("${mediaUrl(src)}")`,
              backgroundSize: `${k * 100}% auto`,
              backgroundPosition: `${x}% ${y}%`,
              backgroundRepeat: "repeat-x", // la panorámica da la vuelta: el recorte puede cruzar el borde
            }
          : undefined
      }
    />
  );
}
