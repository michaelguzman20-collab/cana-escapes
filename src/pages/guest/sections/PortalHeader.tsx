import { ChevronLeft, ChevronRight, Home, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Property } from "@/types/database";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const QUARTERS_ES = ["Ene – Mar", "Abr – Jun", "Jul – Sep", "Oct – Dic"];

export type ViewMode = "month" | "quarter";

interface Props {
  property: Property | null;
  ownerName?: string;
  month: number;
  year: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function PortalHeader({ property, ownerName, month, year, viewMode, onViewModeChange, onPrev, onNext }: Props) {
  const quarter = Math.ceil(month / 3);
  const periodLabel = viewMode === "month"
    ? `${MONTHS_ES[month - 1]} ${year}`
    : `${QUARTERS_ES[quarter - 1]} ${year}`;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F2B4C] via-[#1a3d66] to-[#2D6A9F] p-5 sm:p-8 text-white">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#F0A030]/10 rounded-full translate-y-1/2 -translate-x-1/4" />

      <div className="relative space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-widest">
              <Shield size={12} />
              Portal del Propietario
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
              {property?.name ?? "Mi Propiedad"}
            </h1>
            {(ownerName || property?.owner_name) && (
              <p className="flex items-center gap-1.5 text-white/70 text-sm">
                <Home size={13} />
                {ownerName || property?.owner_name}
              </p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            {/* View mode toggle */}
            <div className="flex rounded-lg bg-white/10 p-0.5">
              <button
                onClick={() => onViewModeChange("month")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "month" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => onViewModeChange("quarter")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "quarter" ? "bg-white/20 text-white" : "text-white/50 hover:text-white/80"
                }`}
              >
                Trimestre
              </button>
            </div>

            {/* Period nav */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-xl px-1 py-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-semibold min-w-[140px] text-center">
                {periodLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
