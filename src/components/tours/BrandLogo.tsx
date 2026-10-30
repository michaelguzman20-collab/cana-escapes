import { externalUrl, mediaUrl, type Tour } from "@/lib/tours";
import { cn } from "@/lib/utils";

// Logo del propietario sobre el tour (como marca de agua): queda fijo en una esquina en todas las
// fotos y, si tiene enlace, al tocarlo abre la página del propietario.

type Brand = Pick<Tour, "brand_logo_url" | "brand_link" | "brand_position" | "brand_size">;

// Abajo queda por encima de la tira de fotos y la barra del visor; arriba, debajo del título
const POSITION: Record<Tour["brand_position"], string> = {
  "bottom-right": "right-3 bottom-[8.75rem]",
  "bottom-left": "left-3 bottom-[11.5rem]", // sobre el botón "Punto de inicio"
  "top-right": "right-14 top-24 sm:right-3", // en el teléfono, al lado de la columna de botones
  "top-left": "left-3 top-24",
};

// Con la tira de fotos oculta (teléfono) el logo de abajo baja hasta la barra del visor
const POSITION_NO_STRIP: Partial<Record<Tour["brand_position"], string>> = {
  "bottom-right": "right-3 bottom-14",
  "bottom-left": "left-3 bottom-28",
};

// lift = px que ocupa abajo la tira de fotos abierta (con su barra); el logo de abajo se coloca encima
export function BrandLogo({ tour, className, stripHidden, lift }: { tour: Brand; className?: string; stripHidden?: boolean; lift?: number }) {
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
  const place = (stripHidden && POSITION_NO_STRIP[tour.brand_position]) || POSITION[tour.brand_position] || POSITION["bottom-right"];
  const pos = cn("absolute z-10", place, className);
  // Con la tira abierta se mide su alto real (puede variar con la pantalla)
  const bottom = lift && tour.brand_position.startsWith("bottom") ? lift + 8 + (tour.brand_position === "bottom-left" ? 44 : 0) : undefined;
  const style = bottom ? { bottom } : undefined;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(pos, "hover:scale-105 transition-transform")} style={style} title={href}>
      {img}
    </a>
  ) : (
    <div className={cn(pos, "pointer-events-none")} style={style}>{img}</div>
  );
}
