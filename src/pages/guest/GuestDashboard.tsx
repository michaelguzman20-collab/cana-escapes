import { useState, useMemo } from "react";
import { Home, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProperties } from "@/hooks/useProperties";
import { useReservations, useAllReservations } from "@/hooks/useReservations";
import { useBrackets, getActiveBracket, resolveBracketsForProperty } from "@/hooks/useBrackets";
import { useMyOwner, useMyCharges, useMyMaintenanceTickets, useMyOwnerPayments } from "@/hooks/useOwnerPortal";

import { PortalHeader, type ViewMode } from "./sections/PortalHeader";
import { FinancialSummary } from "./sections/FinancialSummary";
import { OccupancyMetrics } from "./sections/OccupancyMetrics";
import { ReservationsList } from "./sections/ReservationsList";
import { CalendarSection } from "./sections/CalendarSection";
import { MonthlyTrend } from "./sections/MonthlyTrend";
import { PlatformBreakdown } from "./sections/PlatformBreakdown";
import { MaintenanceStatus } from "./sections/MaintenanceStatus";
import { ChargesSection } from "./sections/ChargesSection";
import { PaymentStatus } from "./sections/PaymentStatus";

const isDevPortal = () => window.location.pathname === "/dev/portal";

export function GuestDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  const { data: properties = [], isLoading: propsLoading } = useProperties();
  const { data: allBrackets = [] } = useBrackets();
  const { data: owner } = useMyOwner();

  const [devPropertyId, setDevPropertyId] = useState<string>("");

  const myProperty = useMemo(() => {
    if (isDevPortal() && properties.length > 0) {
      if (devPropertyId) return properties.find((p) => p.id === devPropertyId) ?? properties[0];
      const villaCoral = properties.find((p) => p.name.toLowerCase().includes("villa coral"));
      return villaCoral ?? properties[0];
    }
    return properties[0] ?? null;
  }, [properties, devPropertyId]);

  const propId = myProperty?.id ?? "";
  const brackets = useMemo(() => resolveBracketsForProperty(allBrackets, propId), [allBrackets, propId]);

  const { data: monthReservations = [] } = useReservations(propId, month, year);
  const { data: allReservations = [] } = useAllReservations(propId);
  const { data: tickets = [] } = useMyMaintenanceTickets(propId);
  const { data: charges = [] } = useMyCharges(propId);
  const { data: payments = [] } = useMyOwnerPayments(owner?.id ?? null);

  const quarterMonths = useMemo(() => {
    const q = Math.ceil(month / 3);
    return [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3];
  }, [month]);

  const reservations = useMemo(() => {
    if (viewMode === "month") return monthReservations;
    return allReservations.filter(
      (r) => r.period_year === year && quarterMonths.includes(r.period_month)
    );
  }, [viewMode, monthReservations, allReservations, year, quarterMonths]);

  const bracket = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === "Completada" || r.status === "Confirmada");
    const toUSD = (r: { currency: string; exchange_rate: number }, val: number) =>
      r.currency === "RD$" && r.exchange_rate > 0 ? val / r.exchange_rate : val;
    const grossUSD = confirmed.reduce((s, r) => s + toUSD(r, r.gross_amount), 0);
    return getActiveBracket(brackets, grossUSD);
  }, [reservations, brackets]);

  function prevPeriod() {
    if (viewMode === "month") {
      if (month === 1) { setMonth(12); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else {
      const q = Math.ceil(month / 3);
      if (q === 1) { setMonth(10); setYear((y) => y - 1); }
      else setMonth((q - 2) * 3 + 1);
    }
  }

  function nextPeriod() {
    if (viewMode === "month") {
      if (month === 12) { setMonth(1); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    } else {
      const q = Math.ceil(month / 3);
      if (q === 4) { setMonth(1); setYear((y) => y + 1); }
      else setMonth(q * 3 + 1);
    }
  }

  if (propsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#0F2B4C]/40">
        <Loader2 size={24} className="animate-spin mr-2" />
        Cargando portal...
      </div>
    );
  }

  if (!myProperty) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <Card>
          <CardContent className="py-16 text-center space-y-2">
            <Home size={32} className="mx-auto text-[#0F2B4C]/15" />
            <p className="text-[#0F2B4C]/50 font-medium">Aún no tienes una propiedad asignada.</p>
            <p className="text-sm text-[#0F2B4C]/30">Contacta al administrador para que asigne tu propiedad.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* Dev property selector */}
      {isDevPortal() && properties.length > 1 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
          <span className="text-amber-700 font-medium">DEV:</span>
          <select
            value={myProperty.id}
            onChange={(e) => setDevPropertyId(e.target.value)}
            className="bg-white border border-amber-200 rounded px-2 py-1 text-xs text-[#0F2B4C]"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <PortalHeader
        property={myProperty}
        ownerName={owner?.full_name}
        month={month}
        year={year}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={prevPeriod}
        onNext={nextPeriod}
      />

      <FinancialSummary
        reservations={reservations}
        bracket={bracket}
        referenceRate={myProperty.reference_rate}
      />

      <OccupancyMetrics
        reservations={reservations}
        month={month}
        year={year}
        viewMode={viewMode}
      />

      <ReservationsList
        reservations={reservations}
        month={month}
        year={year}
        viewMode={viewMode}
      />

      {viewMode === "month" ? (
        <CalendarSection
          reservations={reservations}
          tickets={tickets}
          month={month}
          year={year}
        />
      ) : (
        <>
          {quarterMonths.map((m) => (
            <CalendarSection
              key={m}
              reservations={allReservations.filter((r) => r.period_month === m && r.period_year === year)}
              tickets={tickets}
              month={m}
              year={year}
            />
          ))}
        </>
      )}

      <MonthlyTrend
        allReservations={allReservations}
        ownerPct={bracket?.owner_pct ?? 0}
      />

      <PlatformBreakdown
        reservations={reservations}
        allReservations={allReservations}
      />

      <MaintenanceStatus tickets={tickets} />

      <ChargesSection charges={charges} />

      <PaymentStatus payments={payments} />
    </div>
  );
}
