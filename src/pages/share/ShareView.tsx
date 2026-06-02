import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Moon,
  TrendingUp,
  Home,
  Lock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/layout/Logo";
import {
  useSharedProperty,
  useSharedReservations,
  useSharedBrackets,
} from "@/hooks/useSharedProperty";
import { getActiveBracket } from "@/hooks/useBrackets";

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const STATUS_BADGE: Record<string, { label: string; icon: typeof CheckCircle2; class: string }> = {
  Completada: { label: "Completada", icon: CheckCircle2, class: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  Pendiente:  { label: "Pendiente",  icon: Clock,        class: "bg-amber-100 text-amber-800 border-amber-200" },
  Cancelada:  { label: "Cancelada",  icon: XCircle,      class: "bg-red-100 text-red-800 border-red-200" },
};

function fmt(n: number, cur = "$") {
  return `${cur}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-[#2D6A9F]/30 bg-[#2D6A9F]/5" : ""}>
      <CardHeader className="pb-1">
        <CardDescription className="text-xs uppercase tracking-wider">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-serif font-semibold ${accent ? "text-[#2D6A9F]" : ""}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Inactive / error states ───────────────────────────────────────────────
function InactivePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] p-6">
      <Logo size="lg" className="mb-10" />
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Lock size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-xl font-serif font-semibold">Enlace no disponible</h2>
          <p className="text-sm text-muted-foreground">
            Este enlace de visualización no está activo o no existe.
            Contacta al administrador para obtener acceso.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main share view ──────────────────────────────────────────────────────
export function ShareView() {
  const { token } = useParams<{ token: string }>();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const { data: property, isLoading: propLoading } = useSharedProperty(token ?? "");
  const { data: brackets = [] } = useSharedBrackets();
  const { data: reservations = [], isLoading: resLoading } = useSharedReservations(
    property?.id ?? "",
    month,
    year
  );

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const kpis = useMemo(() => {
    const active  = reservations.filter((r) => r.status !== "Cancelada");
    const grossUSD = active.filter((r) => r.currency === "USD").reduce((s, r) => s + r.gross_amount, 0);
    const netUSD   = active.filter((r) => r.currency === "USD").reduce((s, r) => s + r.net_amount, 0);
    const ownerUSD = active.filter((r) => r.currency === "USD").reduce((s, r) => s + r.owner_amount, 0);
    const ownerRDS = active.reduce((s, r) => s + r.owner_rds, 0);
    const platComm = active.filter((r) => r.currency === "USD").reduce((s, r) => s + r.platform_comm_usd, 0);
    const cardFees = active.filter((r) => r.currency === "USD").reduce((s, r) => s + r.card_fee_usd, 0);
    const extras   = active.filter((r) => r.currency === "USD").reduce((s, r) => s + r.extra_usd, 0);
    const nights   = active.reduce((s, r) => s + r.nights, 0);
    const daysInMonth = new Date(year, month, 0).getDate();
    const bracket  = getActiveBracket(brackets, grossUSD);
    return { grossUSD, netUSD, ownerUSD, ownerRDS, platComm, cardFees, extras, nights, daysInMonth, bracket, count: active.length };
  }, [reservations, brackets, month, year]);

  // Loading
  if (propLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef3f9] to-[#e8f0f8]">
        <Loader2 size={32} className="animate-spin text-[#2D6A9F]" />
      </div>
    );
  }

  // Not found or disabled
  if (!property || !property.share_enabled) {
    return <InactivePage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-[#0F2B4C] border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" variant="light" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 hidden sm:block uppercase tracking-wider">
              Vista propietario
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#F0A030]/20 text-[#F0A030] border border-[#F0A030]/30 font-medium">
              Solo lectura
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Property header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-[#0F2B4C]">
              {property.name}
            </h1>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Home size={13} />
              Propietario: <strong>{property.owner_name}</strong>
            </p>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium min-w-40 text-center">
              {MONTHS_ES[month - 1]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* ── Resumen de ingresos ─────────────────────────────────────── */}
        <div className="rounded-xl border bg-white/70 backdrop-blur-sm p-5 space-y-4 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Resumen del mes
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Ingreso bruto"
              value={fmt(kpis.grossUSD)}
              sub={`${kpis.count} reserva${kpis.count !== 1 ? "s" : ""} activas`}
            />
            <KpiCard
              label="Deducciones"
              value={fmt(kpis.platComm + kpis.cardFees + kpis.extras)}
              sub="Com. plat. + tarjeta + extras"
            />
            <KpiCard
              label="Neto"
              value={fmt(kpis.netUSD)}
              sub="Después de deducciones"
            />
            <KpiCard
              label="Tu ingreso (USD)"
              value={fmt(kpis.ownerUSD)}
              accent
              sub={kpis.bracket ? `${kpis.bracket.owner_pct}% de reparto` : undefined}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard
              label="Tu ingreso (RD$)"
              value={fmt(kpis.ownerRDS, "RD$")}
              sub={`Tasa ref: RD$${property.reference_rate}`}
            />
            <KpiCard
              label="Ocupación"
              value={`${kpis.nights} / ${kpis.daysInMonth} noches`}
              sub={`${((kpis.nights / kpis.daysInMonth) * 100).toFixed(1)}%`}
            />
            <KpiCard
              label="Modelo de reparto"
              value={kpis.bracket ? `${kpis.bracket.owner_pct}% / ${kpis.bracket.ce_pct}%` : "—"}
              sub={kpis.bracket?.description ?? "Propietario / Cana Escapes"}
            />
          </div>
        </div>

        {/* ── Desglose deducciones ────────────────────────────────────── */}
        {kpis.count > 0 && (
          <div className="rounded-xl border bg-white/70 backdrop-blur-sm p-5 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">
              Desglose de deducciones (USD)
            </h2>
            <div className="space-y-2">
              {[
                { label: "Ingreso bruto", value: kpis.grossUSD, sign: "", bold: false },
                { label: "Comisiones de plataformas", value: kpis.platComm, sign: "−", bold: false },
                { label: "Tarifas de tarjeta de crédito", value: kpis.cardFees, sign: "−", bold: false },
                { label: "Deducciones adicionales", value: kpis.extras, sign: "−", bold: false },
                { label: "Neto disponible", value: kpis.netUSD, sign: "", bold: true },
                { label: `Tu ingreso (${kpis.bracket?.owner_pct ?? "—"}%)`, value: kpis.ownerUSD, sign: "", bold: true, accent: true },
                { label: `Cana Escapes (${kpis.bracket?.ce_pct ?? "—"}%)`, value: kpis.netUSD - kpis.ownerUSD, sign: "", bold: false },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between py-1.5 ${
                    row.bold ? "border-t mt-1 pt-2.5" : ""
                  }`}
                >
                  <span className={`text-sm ${row.accent ? "font-semibold text-[#2D6A9F]" : row.bold ? "font-medium" : "text-muted-foreground"}`}>
                    {row.label}
                  </span>
                  <span className={`text-sm font-mono ${row.accent ? "font-bold text-[#2D6A9F]" : row.bold ? "font-semibold" : "text-muted-foreground"}`}>
                    {row.sign}${row.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* ── Tabla de reservas ────────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-serif font-medium mb-4">
            Reservas — {MONTHS_ES[month - 1]} {year}
          </h2>

          {resLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse bg-white/70">
                  <CardContent className="h-14" />
                </Card>
              ))}
            </div>
          ) : reservations.length === 0 ? (
            <Card className="bg-white/70">
              <CardContent className="py-12 text-center">
                <Moon size={28} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  No hay reservas registradas para este período.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border bg-white/70 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entrada</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Salida</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground">Noches</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plataforma</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Pago</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bruto</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deducciones</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Neto</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tu ingreso</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r, i) => {
                      const st   = STATUS_BADGE[r.status] ?? STATUS_BADGE["Pendiente"];
                      const Icon = st.icon;
                      const cur  = r.currency === "RD$" ? "RD$" : "$";
                      const totalDed = r.platform_comm_usd + r.card_fee_usd + r.extra_usd;
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{r.checkin}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{r.checkout}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center gap-1">
                              <Moon size={10} className="text-muted-foreground" />
                              <span className="font-medium">{r.nights}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block text-xs px-2 py-0.5 rounded bg-[#0F2B4C]/10 text-[#0F2B4C] font-medium">
                              {r.platform}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.payment_type}</td>
                          <td className="px-4 py-3 text-right font-mono">{cur}{r.gross_amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-red-600 text-xs">
                            {totalDed > 0 ? `−${cur}${totalDed.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{cur}{r.net_amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                            {cur}{r.owner_amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${st.class}`}>
                              <Icon size={10} />
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-semibold">
                      <td colSpan={6} className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={13} />
                          Totales del mes
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">${kpis.grossUSD.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600 text-xs">
                        −${(kpis.platComm + kpis.cardFees + kpis.extras).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">${kpis.netUSD.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">${kpis.ownerUSD.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {kpis.ownerRDS > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Equivalente en pesos dominicanos:{" "}
                  <strong className="text-[#0F2B4C]">
                    RD${kpis.ownerRDS.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </strong>{" "}
                  (tasa ref. RD${property.reference_rate})
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="text-center py-6 border-t">
          <Logo size="sm" className="mx-auto mb-2 opacity-60" />
          <p className="text-xs text-muted-foreground">
            Información generada por Cana Escapes · Solo lectura
          </p>
        </div>
      </main>
    </div>
  );
}
