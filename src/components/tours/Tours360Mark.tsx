import { Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";

/** Distintivo de Tours 360: círculo azul con borde ámbar; con `spin` las flechas giran (solo encabezado y portada) */
export function Tours360Mark({ size = 40, spin, iconClassName }: { size?: number; spin?: boolean; iconClassName?: string }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-[#0F2B4C] border-[3px] border-[#F0A030] shrink-0 shadow-lg shadow-[#F0A030]/10"
      style={{ width: size, height: size }}
    >
      <Rotate3d size={size * 0.52} className={cn("text-[#F0A030]", spin && "tours360-spin", iconClassName)} strokeWidth={1.8} />
    </span>
  );
}
