import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Landmark, BarChart3, FileInput, FileOutput, Hash, Scale, FileSpreadsheet, Building2, Layers, Download, BookOpen, BookText, TableProperties, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProperties } from "@/hooks/useProperties";
import { useProperty } from "@/contexts/PropertyContext";
import { ResumenTab } from "./contabilidad/ResumenTab";
import { IngresosTab } from "./contabilidad/IngresosTab";
import { GastosTab } from "./contabilidad/GastosTab";
import { NcfTab } from "./contabilidad/NcfTab";
import { RetencionesTab } from "./contabilidad/RetencionesTab";
import { ReportesTab } from "./contabilidad/ReportesTab";
import { CatalogoTab } from "./contabilidad/CatalogoTab";
import { LibroDiarioTab } from "./contabilidad/LibroDiarioTab";
import { BalanceComprobacionTab } from "./contabilidad/BalanceComprobacionTab";
import { EstadosFinancierosTab } from "./contabilidad/EstadosFinancierosTab";

const TABS = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "ingresos", label: "Ingresos (607)", icon: FileInput },
  { id: "gastos", label: "Gastos (606)", icon: FileOutput },
  { id: "ncf", label: "NCF / e-CF", icon: Hash },
  { id: "retenciones", label: "Retenciones", icon: Scale },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "diario", label: "Libro Diario", icon: BookText },
  { id: "balance", label: "Balance Comp.", icon: TableProperties },
  { id: "eeff", label: "Estados Financieros", icon: PieChart },
  { id: "reportes", label: "Reportes DGII", icon: FileSpreadsheet },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminContabilidad() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : "resumen");
  const { data: properties = [] } = useProperties();

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) setActiveTab(tabParam);
  }, [tabParam]);
  const { selectedPropertyId: globalPropertyId } = useProperty();
  const [fiscalFilter, setFiscalFilter] = useState<string>("__global__");

  const effectivePropertyId = fiscalFilter === "__global__"
    ? globalPropertyId
    : fiscalFilter === "__all__"
      ? ""
      : fiscalFilter;

  const filterLabel = fiscalFilter === "__all__"
    ? "Todas las propiedades"
    : fiscalFilter === "__global__"
      ? properties.find(p => p.id === globalPropertyId)?.name ?? "Propiedad activa"
      : properties.find(p => p.id === fiscalFilter)?.name ?? "Propiedad";

  return (
    <div className="px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Landmark size={22} className="text-[#0F2B4C]" />
          <h1 className="text-xl font-bold text-[#0F2B4C]">Contabilidad / Financiero</h1>
          <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0F2B4C]/10 text-[#0F2B4C]">
            RNC: 133-70382-3
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setActiveTab("reportes")}
        >
          <Download size={14} />
          Exportar
        </Button>
      </div>

      {/* Property filter bar */}
      <div className="flex items-center gap-2 mb-4 bg-white/80 backdrop-blur rounded-xl px-3 py-2 border shadow-sm overflow-x-auto">
        <Building2 size={14} className="text-[#0F2B4C]/50 shrink-0" />
        <span className="text-[10px] font-semibold text-[#0F2B4C]/50 uppercase tracking-wider shrink-0">Vista:</span>
        <button
          onClick={() => setFiscalFilter("__all__")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
            fiscalFilter === "__all__"
              ? "bg-[#0F2B4C] text-white shadow-sm"
              : "text-[#0F2B4C]/60 hover:bg-[#0F2B4C]/5"
          )}
        >
          <Layers size={12} />
          General (Todas)
        </button>
        <button
          onClick={() => setFiscalFilter("__global__")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
            fiscalFilter === "__global__"
              ? "bg-[#F0A030] text-[#0F2B4C] shadow-sm"
              : "text-[#0F2B4C]/60 hover:bg-[#0F2B4C]/5"
          )}
        >
          Prop. Activa
        </button>
        <div className="w-px h-5 bg-[#0F2B4C]/10 shrink-0" />
        {properties.map((p) => (
          <button
            key={p.id}
            onClick={() => setFiscalFilter(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              fiscalFilter === p.id
                ? "bg-[#2D6A9F] text-white shadow-sm"
                : "text-[#0F2B4C]/60 hover:bg-[#0F2B4C]/5"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Active filter indicator */}
      <div className="flex items-center gap-2 mb-4 text-xs text-[#0F2B4C]/60">
        <span>Mostrando datos de:</span>
        <span className="font-semibold text-[#0F2B4C]">{filterLabel}</span>
      </div>

      {/* Tab navigation */}
      <div className="relative mb-5">
        <div className="flex gap-1 bg-white/70 backdrop-blur rounded-xl p-1 overflow-x-auto border scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                activeTab === id
                  ? "bg-[#0F2B4C] text-white shadow-sm"
                  : "text-[#0F2B4C]/70 hover:bg-[#0F2B4C]/5"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#eef3f9] to-transparent pointer-events-none rounded-r-xl" />
      </div>

      {/* Tab content */}
      {activeTab === "resumen" && <ResumenTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "ingresos" && <IngresosTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "gastos" && <GastosTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "ncf" && <NcfTab />}
      {activeTab === "retenciones" && <RetencionesTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "catalogo" && <CatalogoTab />}
      {activeTab === "diario" && <LibroDiarioTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "balance" && <BalanceComprobacionTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "eeff" && <EstadosFinancierosTab fiscalPropertyId={effectivePropertyId} />}
      {activeTab === "reportes" && <ReportesTab fiscalPropertyId={effectivePropertyId} />}
    </div>
  );
}
