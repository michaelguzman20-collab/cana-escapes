import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MapPin, BellRing, MessageCircle, Battery, BatteryCharging, BatteryLow, Navigation,
  History, Phone, Car, Save, ExternalLink, CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase as typedSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Las tablas fleet_* (app Cana Track) no están en los tipos generados.
const supabase = typedSupabase as unknown as SupabaseClient;

const NAVY = "#0F2B4C";
const AMBER = "#F0A030";
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
const PUNTA_CANA = { lat: 18.58, lng: -68.4 };
const STALE_MS = 3 * 60 * 1000;
const TRACK_HOURS = 3;

type Driver = { id: string; name: string; phone: string | null; vehicle: string | null; active: boolean };
type Position = {
  driver_id: string; lat: number; lng: number; speed: number | null; battery: number | null;
  charging: boolean | null; on_duty: boolean; updated_at: string;
};
type Session = {
  id: string; driver_id: string; started_at: string; ended_at: string | null;
  last_seen_at: string; battery_start: number | null; battery_end: number | null;
};
type Status = "live" | "stale" | "off";

const STATUS: Record<Status, { label: string; color: string }> = {
  live:  { label: "Compartiendo",       color: "#1E9E5A" },
  stale: { label: "Sin señal reciente", color: AMBER },
  off:   { label: "Sin compartir",      color: "#9AA5B4" },
};

function statusOf(p?: Position): Status {
  if (!p || !p.on_duty) return "off";
  return Date.now() - new Date(p.updated_at).getTime() < STALE_MS ? "live" : "stale";
}

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("es-DO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function duration(from: string, to: string) {
  const m = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

function pct(b: number | null) {
  return b == null ? "—" : `${Math.round(b * 100)}%`;
}

function waNumber(phone: string | null) {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length === 10 ? `1${d}` : d;
}

// Carga el script de Google Maps una sola vez
let mapsPromise: Promise<any> | null = null;
function loadGoogleMaps(): Promise<any> {
  if (!MAPS_KEY) return Promise.reject(new Error("sin llave"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  mapsPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&language=es&region=DO`;
    s.async = true;
    s.onload = () => resolve((window as any).google);
    s.onerror = () => reject(new Error("No se pudo cargar Google Maps"));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

// ════════════════════════════════════════════════════════════════════════════
export function AdminTrack() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [officePhone, setOfficePhone] = useState("");
  const [savedOffice, setSavedOffice] = useState("");
  const [traffic, setTraffic] = useState(true);
  const [area, setArea] = useState<string | null>(null);
  const [ping, setPing] = useState<{ id: string; driverId: string; delivered: boolean } | null>(null);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const [d, p, s] = await Promise.all([
      supabase.from("fleet_drivers").select("id,name,phone,vehicle,active").order("name"),
      supabase.from("fleet_positions").select("*"),
      supabase.from("fleet_settings").select("dispatcher_whatsapp").maybeSingle(),
    ]);
    if (d.data) setDrivers(d.data as Driver[]);
    if (p.data) setPositions(Object.fromEntries((p.data as Position[]).map((x) => [x.driver_id, x])));
    const office = (s.data as { dispatcher_whatsapp: string | null } | null)?.dispatcher_whatsapp ?? "";
    setSavedOffice(office);
    setOfficePhone((cur) => cur || office);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-track")
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet_positions" }, (msg) => {
        const row = msg.new as Position;
        if (row?.driver_id) setPositions((prev) => ({ ...prev, [row.driver_id]: row }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fleet_pings" }, (msg) => {
        const row = msg.new as { id: string; delivered_at: string | null };
        setPing((prev) => (prev && prev.id === row.id && row.delivered_at ? { ...prev, delivered: true } : prev));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet_drivers" }, () => load())
      .subscribe();
    const poll = window.setInterval(load, 30000);
    const clock = window.setInterval(() => tick((n) => n + 1), 10000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [load]);

  // Historial del usuario elegido (o de todos)
  const loadSessions = useCallback(async () => {
    let q = supabase.from("fleet_sessions").select("*").order("started_at", { ascending: false }).limit(50);
    if (selected) q = q.eq("driver_id", selected);
    const { data } = await q;
    setSessions((data ?? []) as Session[]);
  }, [selected]);
  useEffect(() => {
    loadSessions();
  }, [loadSessions, positions[selected ?? ""]?.on_duty]);

  const sorted = useMemo(() => {
    const rank: Record<Status, number> = { live: 0, stale: 1, off: 2 };
    return [...drivers].sort(
      (a, b) => Number(b.active) - Number(a.active) || rank[statusOf(positions[a.id])] - rank[statusOf(positions[b.id])]
    );
  }, [drivers, positions]);

  const sel = drivers.find((d) => d.id === selected) ?? null;
  const selPos = selected ? positions[selected] : undefined;
  const liveCount = drivers.filter((d) => statusOf(positions[d.id]) === "live").length;

  async function saveOffice() {
    await supabase.from("fleet_settings").update({ dispatcher_whatsapp: officePhone.trim() || null }).eq("id", 1);
    setSavedOffice(officePhone.trim());
  }

  async function ring(d: Driver) {
    if (!savedOffice) {
      alert("Primero guarda el WhatsApp de la oficina (arriba a la derecha).");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("fleet_pings")
      .insert({ driver_id: d.id, message: "Escríbeme por WhatsApp, por favor.", reply_phone: savedOffice, created_by: auth.user?.id })
      .select("id")
      .single();
    if (error) return alert(error.message);
    setPing({ id: (data as { id: string }).id, driverId: d.id, delivered: false });
  }

  async function setActive(d: Driver, active: boolean) {
    await supabase.from("fleet_drivers").update({ active }).eq("id", d.id);
    load();
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: NAVY }}>
            <MapPin size={26} style={{ color: AMBER }} />
            Cana Track
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {liveCount} compartiendo ahora · {drivers.length} usuario{drivers.length === 1 ? "" : "s"} registrado{drivers.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">WhatsApp de la oficina (para el timbre)</label>
            <Input value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} placeholder="809 555 1234" className="w-52" />
          </div>
          <Button onClick={saveOffice} disabled={officePhone.trim() === savedOffice} style={{ backgroundColor: NAVY }}>
            <Save size={14} className="mr-1.5" /> Guardar
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <TrackMap
            drivers={drivers}
            positions={positions}
            selected={selected}
            onSelect={setSelected}
            traffic={traffic}
            onTraffic={setTraffic}
            onArea={setArea}
          />

          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-4" style={{ color: NAVY }}>
                <History size={18} style={{ color: AMBER }} />
                Historial {sel ? `de ${sel.name}` : "de todos"}
              </h2>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no hay sesiones.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        {!sel && <th className="py-2 pr-3 font-medium">Usuario</th>}
                        <th className="py-2 pr-3 font-medium">Empezó</th>
                        <th className="py-2 pr-3 font-medium">Terminó</th>
                        <th className="py-2 pr-3 font-medium">Duración</th>
                        <th className="py-2 font-medium">Batería</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => {
                        const open = !s.ended_at;
                        const lost = open && Date.now() - new Date(s.last_seen_at).getTime() > STALE_MS;
                        return (
                          <tr key={s.id} className="border-b last:border-0">
                            {!sel && <td className="py-2 pr-3 font-medium">{drivers.find((d) => d.id === s.driver_id)?.name ?? "—"}</td>}
                            <td className="py-2 pr-3 whitespace-nowrap">{fmt(s.started_at)}</td>
                            <td className="py-2 pr-3 whitespace-nowrap">
                              {s.ended_at ? fmt(s.ended_at) : lost ? (
                                <span className="text-amber-600">Sin señal desde {fmt(s.last_seen_at)}</span>
                              ) : (
                                <span className="text-green-700 font-medium">Compartiendo</span>
                              )}
                            </td>
                            <td className="py-2 pr-3 whitespace-nowrap">{duration(s.started_at, s.ended_at ?? s.last_seen_at)}</td>
                            <td className="py-2 whitespace-nowrap">{pct(s.battery_start)} → {pct(s.battery_end)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 order-first lg:order-none">
          {sel && (
            <Card className="border-2" style={{ borderColor: AMBER }}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-bold" style={{ color: NAVY }}>{sel.name}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-3 mt-0.5">
                      {sel.phone && <span className="flex items-center gap-1"><Phone size={12} />{sel.phone}</span>}
                      {sel.vehicle && <span className="flex items-center gap-1"><Car size={12} />{sel.vehicle}</span>}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
                </div>
                {selPos ? (
                  <>
                    <p className="text-sm flex items-start gap-1.5" style={{ color: NAVY }}>
                      <Navigation size={14} className="mt-0.5 shrink-0" style={{ color: AMBER }} />
                      {area ?? `${selPos.lat.toFixed(5)}, ${selPos.lng.toFixed(5)}`}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Stat label="Estado" value={STATUS[statusOf(selPos)].label} color={STATUS[statusOf(selPos)].color} />
                      <Stat label="Velocidad" value={selPos.speed != null ? `${Math.round(selPos.speed * 3.6)} km/h` : "—"} />
                      <Stat label="Batería" value={`${pct(selPos.battery)}${selPos.charging ? " ⚡" : ""}`} color={selPos.battery != null && selPos.battery < 0.2 ? "#C0392B" : undefined} />
                      <Stat label="Último envío" value={ago(selPos.updated_at)} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Todavía no ha compartido su ubicación.</p>
                )}
                {ping?.driverId === sel.id && (
                  <p className={cn("text-sm flex items-center gap-1.5", ping.delivered ? "text-green-700" : "text-muted-foreground")}>
                    {ping.delivered ? <><CheckCircle2 size={14} /> Recibió el timbre</> : "🔔 Timbre enviado, esperando a su teléfono…"}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => ring(sel)} className="text-[#0F2B4C] hover:opacity-90" style={{ backgroundColor: AMBER }}>
                    <BellRing size={15} className="mr-1.5" /> Timbre
                  </Button>
                  <Button asChild disabled={!sel.phone} className="bg-[#25D366] hover:bg-[#1fb857] text-white">
                    <a href={`https://wa.me/${waNumber(sel.phone)}`} target="_blank" rel="noreferrer">
                      <MessageCircle size={15} className="mr-1.5" /> WhatsApp
                    </a>
                  </Button>
                </div>
                {selPos && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selPos.lat},${selPos.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink size={12} /> Abrir en Google Maps
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0 divide-y">
              {sorted.length === 0 && (
                <p className="p-5 text-sm text-muted-foreground">
                  Todavía nadie se ha unido. Que descarguen Cana Track desde canaescapes.com/apps y pongan su nombre y WhatsApp.
                </p>
              )}
              {sorted.map((d) => {
                const p = positions[d.id];
                const st = statusOf(p);
                const BatIcon = p?.charging ? BatteryCharging : p?.battery != null && p.battery < 0.2 ? BatteryLow : Battery;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors",
                      selected === d.id && "bg-amber-50",
                      !d.active && "opacity-50"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS[st].color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: NAVY }}>{d.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.active ? (p ? `${STATUS[st].label} · ${ago(p.updated_at)}` : "Sin ubicación") : "Acceso desactivado"}
                      </p>
                    </div>
                    {p?.battery != null && (
                      <span className={cn("text-xs flex items-center gap-1", p.battery < 0.2 ? "text-red-600" : "text-muted-foreground")}>
                        <BatIcon size={14} /> {pct(p.battery)}
                      </span>
                    )}
                    <div onClick={(e) => e.stopPropagation()} title={d.active ? "Desactivar acceso" : "Activar acceso"}>
                      <Switch checked={d.active} onCheckedChange={(v) => setActive(d, v)} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold" style={{ color: color ?? NAVY }}>{value}</p>
    </div>
  );
}

// ── Mapa de Google con tráfico, marcadores y recorrido ──────────────────────
function TrackMap({
  drivers, positions, selected, onSelect, traffic, onTraffic, onArea,
}: {
  drivers: Driver[];
  positions: Record<string, Position>;
  selected: string | null;
  onSelect: (id: string | null) => void;
  traffic: boolean;
  onTraffic: (v: boolean) => void;
  onArea: (a: string | null) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const g = useRef<any>(null);
  const map = useRef<any>(null);
  const trafficLayer = useRef<any>(null);
  const markers = useRef<Record<string, any>>({});
  const line = useRef<any>(null);
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(MAPS_KEY ? null : "Falta la llave de Google Maps");

  useEffect(() => {
    loadGoogleMaps()
      .then((google) => {
        g.current = google;
        map.current = new google.maps.Map(el.current, {
          center: PUNTA_CANA, zoom: 11, mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        });
        trafficLayer.current = new google.maps.TrafficLayer();
        map.current.addListener("click", () => onSelect(null));
        setReady(true);
      })
      .catch((e) => setError(e.message === "sin llave" ? "Falta la llave de Google Maps" : e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    trafficLayer.current.setMap(traffic ? map.current : null);
  }, [ready, traffic]);

  // Marcadores
  useEffect(() => {
    if (!ready) return;
    const google = g.current;
    const seen = new Set<string>();
    for (const d of drivers) {
      const p = positions[d.id];
      if (!p || !d.active) continue;
      seen.add(d.id);
      const st = statusOf(p);
      const icon = {
        path: google.maps.SymbolPath.CIRCLE, scale: selected === d.id ? 11 : 8,
        fillColor: STATUS[st].color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3,
      };
      let m = markers.current[d.id];
      if (!m) {
        m = new google.maps.Marker({ map: map.current, title: d.name });
        m.addListener("click", () => onSelect(d.id));
        markers.current[d.id] = m;
      }
      m.setPosition({ lat: p.lat, lng: p.lng });
      m.setIcon(icon);
      m.setLabel({ text: d.name.split(" ")[0], color: NAVY, fontWeight: "600", fontSize: "12px", className: "track-label" });
    }
    for (const id of Object.keys(markers.current)) {
      if (!seen.has(id)) {
        markers.current[id].setMap(null);
        delete markers.current[id];
      }
    }
    if (!fitted.current && seen.size > 0) {
      fitted.current = true;
      const b = new google.maps.LatLngBounds();
      seen.forEach((id) => b.extend(markers.current[id].getPosition()));
      map.current.fitBounds(b, 80);
      if (seen.size === 1) map.current.setZoom(15);
    }
  }, [ready, drivers, positions, selected, onSelect]);

  // Recorrido y sector del usuario elegido
  const selPos = selected ? positions[selected] : undefined;
  useEffect(() => {
    onArea(null);
    if (!ready) return;
    line.current?.setMap(null);
    if (!selected) return;
    const p = positions[selected];
    if (p) map.current.panTo({ lat: p.lat, lng: p.lng });
    const since = new Date(Date.now() - TRACK_HOURS * 3600 * 1000).toISOString();
    supabase
      .from("fleet_track")
      .select("lat,lng")
      .eq("driver_id", selected)
      .gte("recorded_at", since)
      .order("recorded_at")
      .limit(5000)
      .then(({ data }) => {
        line.current?.setMap(null);
        line.current = new g.current.maps.Polyline({
          map: map.current, path: (data ?? []).map((r: any) => ({ lat: r.lat, lng: r.lng })),
          strokeColor: NAVY, strokeOpacity: 0.85, strokeWeight: 4,
        });
      });
    if (p) {
      new g.current.maps.Geocoder().geocode({ location: { lat: p.lat, lng: p.lng } }, (res: any[] | null, status: string) => {
        if (status === "OK" && res?.[0]) onArea(res[0].formatted_address);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected, selPos?.lat, selPos?.lng]);

  return (
    <div className={cn("relative rounded-2xl overflow-hidden border bg-gray-100", error ? "h-56" : "h-[55vh] min-h-[360px]")}>
      <div ref={el} className="absolute inset-0" />
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 gap-2">
          <MapPin size={32} style={{ color: AMBER }} />
          <p className="font-semibold" style={{ color: NAVY }}>{error}</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            La lista, la batería, el timbre y el historial funcionan igual. Usa «Abrir en Google Maps» en cada usuario para ver dónde está.
          </p>
        </div>
      ) : (
        <button
          onClick={() => onTraffic(!traffic)}
          className={cn(
            "absolute top-3 left-3 px-3 py-1.5 rounded-full text-sm font-semibold shadow",
            traffic ? "bg-[#0F2B4C] text-white" : "bg-white text-[#0F2B4C]"
          )}
        >
          🚦 Tráfico
        </button>
      )}
    </div>
  );
}
