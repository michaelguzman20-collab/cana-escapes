import { externalUrl, mediaUrl, type Tour } from "@/lib/tours";
import { cn } from "@/lib/utils";

// Logo del propietario sobre el tour (como marca de agua): queda fijo en una esquina en todas las
// fotos y, si tiene enlace, al tocarlo abre la página del propietario.

type Brand = Pick<Tour, "brand_logo_url" | "brand_link" | "brand_position" | "brand_size">;

// Abajo queda por encima de la tira de fotos y la barra del visor; arriba, debajo del título
const POSITION: Record<Tour["brand_position"], string> = {
  "bottom-right": "right-3 bottom-[10rem] sm:bottom-[11rem]",
  "bottom-left": "left-3 bottom-[11.5rem]", // sobre el botón "Punto de inicio"
  "top-right": "right-3 top-20 sm:top-24",
  "top-left": "left-3 top-20 sm:top-24",
};

export function BrandLogo({ tour, className }: { tour: Brand; className?: string }) {
  if (!tour.brand_logo_url) return null;
  const href = externalUrl(tour.brand_link);
  const img = (
    <img
      src={mediaUrl(tour.brand_logo_url)}
      alt=""
      draggable={false}
      className="block h-auto max-w-[32vw] sm:max-w-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
      style={{ width: tour.brand_size }}
    />
  );
  const pos = cn("absolute z-10", POSITION[tour.brand_position] ?? POSITION["bottom-right"], className);
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(pos, "hover:scale-105 transition-transform")} title={href}>
      {img}
    </a>
  ) : (
    <div className={cn(pos, "pointer-events-none")}>{img}</div>
  );
}
