import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MapPin, BellRing, MessageCircle, Battery, BatteryCharging, BatteryLow, Navigation,
  History, Phone, Save, ExternalLink, CheckCircle2, RefreshCw, Trash2, Users, Map as MapIcon,
  GripVertical, ShieldCheck,
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

type Driver = {
  id: string; name: string; phone: string | null; vehicle: string | null;
  vehicle_type: string; admin_id: string | null; active: boolean; nickname: string | null;
};
type TeamAdmin = { id: string; user_id: string | null; name: string; email: string | null; phone: string | null; active: boolean };
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

const VEHICLES: Record<string, { emoji: string; label: string }> = {
  moto: { emoji: "🏍️", label: "Moto" },
  carro: { emoji: "🚗", label: "Carro" },
  jeepeta: { emoji: "🚙", label: "Jeepeta" },
  minivan: { emoji: "🚐", label: "Minivan" },
  camioneta: { emoji: "🛻", label: "Camioneta" },
  guagua: { emoji: "🚌", label: "Guagua" },
  camion: { emoji: "🚚", label: "Camión" },
  bicicleta: { emoji: "🚲", label: "Bicicleta" },
  a_pie: { emoji: "🚶", label: "A pie" },
};
const emojiOf = (t: string | null | undefined) => VEHICLES[t ?? ""]?.emoji ?? "📍";
// "Juan Pérez (El Flaco)": el apodo lo pone el administrador
const nameOf = (d: Pick<Driver, "name" | "nickname">) => (d.nickname ? `${d.name} (${d.nickname})` : d.name);

// Distancia aproximada en metros (para no pedir el nombre del sector en cada paso)
function meters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

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

async function functionError(error: any) {
  try {
    return (await error?.context?.json())?.error ?? error.message;
  } catch {
    return error?.message ?? "Error";
  }
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
// mode "super": administrador principal (/admin/track) — ve todo, arma equipos y borra.
// mode "team": administrador de equipo (/track) — Supabase solo le entrega su equipo.
export function AdminTrack({ mode = "super" }: { mode?: "super" | "team" }) {
  const isSuper = mode === "super";
  const [tab, setTab] = useState<"map" | "teams">("map");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [admins, setAdmins] = useState<TeamAdmin[]>([]);
  const [me, setMe] = useState<TeamAdmin | null>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [officePhone, setOfficePhone] = useState("");
  const [savedOffice, setSavedOffice] = useState("");
  const [traffic, setTraffic] = useState(true);
  const [area, setArea] = useState<string | null>(null);
  const [ping, setPing] = useState<{ id: string; driverId: string; delivered: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from("fleet_drivers").select("id,name,nickname,phone,vehicle,vehicle_type,admin_id,active").order("name"),
      supabase.from("fleet_positions").select("*"),
    ]);
    if (d.data) setDrivers(d.data as Driver[]);
    if (p.data) setPositions(Object.fromEntries((p.data as Position[]).map((x) => [x.driver_id, x])));

    let office = "";
    if (isSuper) {
      const [a, s] = await Promise.all([
        supabase.from("fleet_admins").select("*").order("created_at"),
        supabase.from("fleet_settings").select("dispatcher_whatsapp").maybeSingle(),
      ]);
      if (a.data) setAdmins(a.data as TeamAdmin[]);
      office = (s.data as { dispatcher_whatsapp: string | null } | null)?.dispatcher_whatsapp ?? "";
    } else {
      const { data: auth } = await supabase.auth.getUser();
      const { data: mine } = await supabase.from("fleet_admins").select("*").eq("user_id", auth.user?.id ?? "").maybeSingle();
      setMe((mine as TeamAdmin) ?? null);
      office = (mine as TeamAdmin | null)?.phone ?? "";
    }
    setSavedOffice(office);
    setOfficePhone((cur) => cur || office);
  }, [isSuper]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`track-${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet_positions" }, (msg) => {
        const row = msg.new as Position;
        if (row?.driver_id) setPositions((prev) => ({ ...prev, [row.driver_id]: row }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fleet_pings" }, (msg) => {
        const row = msg.new as { id: string; delivered_at: string | null };
        setPing((prev) => (prev && prev.id === row.id && row.delivered_at ? { ...prev, delivered: true } : prev));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet_drivers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "fleet_admins" }, () => load())
      .subscribe();
    const poll = window.setInterval(load, 30000);
    const clock = window.setInterval(() => tick((n) => n + 1), 10000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [load, mode]);

  // Historial del usuario elegido (o de todos los que puedo ver)
  const loadSessions = useCallback(async () => {
    let q = supabase.from("fleet_sessions").select("*").order("started_at", { ascending: false }).limit(50);
    if (selected) q = q.eq("driver_id", selected);
    const { data } = await q;
    setSessions((data ?? []) as Session[]);
  }, [selected]);
  useEffect(() => {
    loadSessions();
  }, [loadSessions, positions[selected ?? ""]?.on_duty]);

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([load(), loadSessions()]).catch(() => {});
    setRefreshing(false);
  }

  const visibleDrivers = useMemo(() => {
    const rank: Record<Status, number> = { live: 0, stale: 1, off: 2 };
    return [...drivers].sort(
      (a, b) => Number(b.active) - Number(a.active) || rank[statusOf(positions[a.id])] - rank[statusOf(positions[b.id])]
    );
  }, [drivers, positions]);

  const sel = drivers.find((d) => d.id === selected) ?? null;
  const selPos = selected ? positions[selected] : undefined;
  const liveCount = drivers.filter((d) => statusOf(positions[d.id]) === "live").length;

  async function saveOffice() {
    if (isSuper) {
      await supabase.from("fleet_settings").update({ dispatcher_whatsapp: officePhone.trim() || null }).eq("id", 1);
    } else if (me) {
      await supabase.rpc("fleet_admin_update_me", { p_name: me.name, p_phone: officePhone });
    }
    setSavedOffice(officePhone.trim());
  }

  async function ring(d: Driver) {
    if (!savedOffice) {
      alert(isSuper ? "Primero guarda el WhatsApp de la oficina (arriba)." : "Primero guarda tu WhatsApp (arriba).");
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

  async function setDriverActive(d: Driver, active: boolean) {
    await supabase.from("fleet_drivers").update({ active }).eq("id", d.id);
    load();
  }

  async function saveNickname(d: Driver, nickname: string) {
    const value = nickname.trim() || null;
    setDrivers((prev) => prev.map((x) => (x.id === d.id ? { ...x, nickname: value } : x)));
    const { error } = await supabase.from("fleet_drivers").update({ nickname: value }).eq("id", d.id);
    if (error) alert(error.message);
  }

  async function assign(driverId: string, adminId: string | null) {
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, admin_id: adminId } : d)));
    const { error } = await supabase.from("fleet_drivers").update({ admin_id: adminId }).eq("id", driverId);
    if (error) alert(error.message);
    load();
  }

  async function setAdminActive(a: TeamAdmin, active: boolean) {
    await supabase.from("fleet_admins").update({ active }).eq("id", a.id);
    load();
  }

  async function remove(kind: "driver" | "admin", id: string, name: string) {
    const what = kind === "driver"
      ? `¿Borrar a ${name}? Se borra su historial y recorridos. Si vuelve a unirse desde la app, entrará como usuario nuevo.`
      : `¿Borrar al administrador ${name}? Sus usuarios quedarán sin asignar.`;
    if (!confirm(what)) return;
    const { error } = await supabase.functions.invoke("fleet-delete", {
      body: kind === "driver" ? { driver_id: id } : { admin_id: id },
    });
    if (error) return alert(await functionError(error));
    if (selected === id) setSelected(null);
    load();
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: NAVY }}>
            <MapPin size={26} style={{ color: AMBER }} />
            Cana Track {!isSuper && me && <span className="text-base font-sans font-medium text-muted-foreground">· Equipo de {me.name}</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {liveCount} compartiendo ahora · {drivers.length} usuario{drivers.length === 1 ? "" : "s"}
            {isSuper && ` · ${admins.length} administrador${admins.length === 1 ? "" : "es"} de equipo`}
          </p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">
              {isSuper ? "WhatsApp de la oficina (para el timbre)" : "Tu WhatsApp (para el timbre)"}
            </label>
            <Input value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} placeholder="809 555 1234" className="w-48" />
          </div>
          <Button onClick={saveOffice} disabled={officePhone.trim() === savedOffice} style={{ backgroundColor: NAVY }}>
            <Save size={14} className="mr-1.5" /> Guardar
          </Button>
          <Button variant="outline" onClick={refreshAll} disabled={refreshing} title="Actualizar">
            <RefreshCw size={15} className={cn("mr-1.5", refreshing && "animate-spin")} /> Actualizar
          </Button>
        </div>
      </div>

      {isSuper && (
        <div className="flex gap-1 mb-5 p-1 bg-white border rounded-xl w-fit">
          {([
            { id: "map", label: "Mapa e historial", icon: MapIcon },
            { id: "teams", label: "Equipos", icon: Users },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
                tab === t.id ? "text-[#0F2B4C]" : "text-muted-foreground hover:text-[#0F2B4C]"
              )}
              style={tab === t.id ? { backgroundColor: AMBER } : undefined}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {isSuper && tab === "teams" ? (
        <TeamsBoard
          drivers={drivers}
          admins={admins}
          positions={positions}
          onAssign={assign}
          onAdminActive={setAdminActive}
          onDriverActive={setDriverActive}
          onRemove={remove}
        />
      ) : (
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
                  Historial {sel ? `de ${nameOf(sel)}` : "de todos"}
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
                          const d = drivers.find((x) => x.id === s.driver_id);
                          return (
                            <tr key={s.id} className="border-b last:border-0">
                              {!sel && <td className="py-2 pr-3 font-medium whitespace-nowrap">{d ? `${emojiOf(d.vehicle_type)} ${nameOf(d)}` : "—"}</td>}
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
                    <div className="flex items-start gap-3">
                      <span className="text-3xl leading-none">{emojiOf(sel.vehicle_type)}</span>
                      <div>
                        <h2 className="text-xl font-serif font-bold" style={{ color: NAVY }}>{nameOf(sel)}</h2>
                        <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 mt-0.5">
                          <span>{VEHICLES[sel.vehicle_type]?.label}{sel.vehicle ? ` · ${sel.vehicle}` : ""}</span>
                          {sel.phone && <span className="flex items-center gap-1"><Phone size={12} />{sel.phone}</span>}
                        </p>
                        {isSuper && (
                          <>
                            <p className="text-xs text-muted-foreground mt-1">
                              Equipo: {admins.find((a) => a.id === sel.admin_id)?.name ?? "sin asignar"}
                            </p>
                            <NicknameField key={sel.id} driver={sel} onSave={saveNickname} />
                          </>
                        )}
                      </div>
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
                  <div className="flex items-center justify-between">
                    {selPos ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selPos.lat},${selPos.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink size={12} /> Abrir en Google Maps
                      </a>
                    ) : <span />}
                    {isSuper && (
                      <button
                        onClick={() => remove("driver", sel.id, nameOf(sel))}
                        className="text-xs flex items-center gap-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={12} /> Borrar usuario
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-0 divide-y">
                {visibleDrivers.length === 0 && (
                  <p className="p-5 text-sm text-muted-foreground">
                    {isSuper
                      ? "Todavía nadie se ha unido. Que descarguen Cana Track desde canaescapes.com/apps y pongan su nombre y WhatsApp."
                      : "Todavía no tienes usuarios asignados. El administrador principal te los asigna."}
                  </p>
                )}
                {visibleDrivers.map((d) => {
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
                      <span className="relative text-2xl leading-none">
                        {emojiOf(d.vehicle_type)}
                        <span
                          className={cn("absolute -right-1 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white", st === "live" && "animate-pulse")}
                          style={{ backgroundColor: STATUS[st].color }}
                        />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: NAVY }}>{nameOf(d)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {d.active ? (p ? `${STATUS[st].label} · ${ago(p.updated_at)}` : "Sin ubicación") : "Acceso desactivado"}
                        </p>
                      </div>
                      {p?.battery != null && (
                        <span className={cn("text-xs flex items-center gap-1", p.battery < 0.2 ? "text-red-600" : "text-muted-foreground")}>
                          <BatIcon size={14} /> {pct(p.battery)}
                        </span>
                      )}
                      {isSuper && (
                        <div onClick={(e) => e.stopPropagation()} title={d.active ? "Desactivar acceso" : "Activar acceso"}>
                          <Switch checked={d.active} onCheckedChange={(v) => setDriverActive(d, v)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
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

// Apodo editable por el administrador principal (se guarda al salir del campo o con Enter)
function NicknameField({ driver, onSave }: { driver: Driver; onSave: (d: Driver, nick: string) => void }) {
  const [value, setValue] = useState(driver.nickname ?? "");
  const save = () => {
    if ((driver.nickname ?? "") !== value.trim()) onSave(driver, value);
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      placeholder="+ Apodo (opcional)"
      className="mt-1.5 w-44 text-xs border rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#F0A030]"
    />
  );
}

// ── Tablero de equipos: arrastra usuarios entre administradores ─────────────
function TeamsBoard({
  drivers, admins, positions, onAssign, onAdminActive, onDriverActive, onRemove,
}: {
  drivers: Driver[];
  admins: TeamAdmin[];
  positions: Record<string, Position>;
  onAssign: (driverId: string, adminId: string | null) => void;
  onAdminActive: (a: TeamAdmin, active: boolean) => void;
  onDriverActive: (d: Driver, active: boolean) => void;
  onRemove: (kind: "driver" | "admin", id: string, name: string) => void;
}) {
  const [over, setOver] = useState<string | null>(null);
  const columns: { id: string | null; admin: TeamAdmin | null }[] = [
    { id: null, admin: null },
    ...admins.map((a) => ({ id: a.id, admin: a })),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arrastra cada usuario a la columna de su administrador. En el celular usa el selector «Mover a…» de cada tarjeta.
        Los administradores de equipo crean su cuenta desde la app (Soy administrador › Crear cuenta) y aquí los activas.
      </p>
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {columns.map(({ id, admin }) => {
          const key = id ?? "none";
          const list = drivers.filter((d) => (d.admin_id ?? null) === id);
          return (
            <div
              key={key}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(key);
              }}
              onDragLeave={() => setOver((o) => (o === key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const driverId = e.dataTransfer.getData("text/plain");
                if (driverId) onAssign(driverId, id);
              }}
              className={cn(
                "w-72 shrink-0 rounded-2xl border-2 bg-white transition-colors",
                over === key ? "border-[#F0A030] bg-amber-50" : "border-transparent shadow-sm",
                admin && !admin.active && "opacity-75"
              )}
            >
              <div className="p-4 border-b">
                {admin ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold flex items-center gap-1.5 truncate" style={{ color: NAVY }}>
                          <ShieldCheck size={15} style={{ color: admin.active ? "#1E9E5A" : "#9AA5B4" }} />
                          {admin.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                        {admin.phone && <p className="text-xs text-muted-foreground">WhatsApp {admin.phone}</p>}
                      </div>
                      <button
                        onClick={() => onRemove("admin", admin.id, admin.name)}
                        className="text-muted-foreground hover:text-red-600"
                        title="Borrar administrador"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <label className="mt-3 flex items-center justify-between text-xs font-medium">
                      <span className={admin.active ? "text-green-700" : "text-amber-700"}>
                        {admin.active ? "Activo" : "Pendiente / desactivado"}
                      </span>
                      <Switch checked={admin.active} onCheckedChange={(v) => onAdminActive(admin, v)} />
                    </label>
                  </>
                ) : (
                  <>
                    <p className="font-semibold" style={{ color: NAVY }}>Sin asignar</p>
                    <p className="text-xs text-muted-foreground">Solo los ves tú (administrador principal)</p>
                  </>
                )}
              </div>
              <div className="p-3 space-y-2 min-h-[120px]">
                {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Suelta aquí</p>}
                {list.map((d) => {
                  const st = statusOf(positions[d.id]);
                  return (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", d.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={cn(
                        "rounded-xl border bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
                        !d.active && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-gray-300 shrink-0" />
                        <span className="text-xl leading-none">{emojiOf(d.vehicle_type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: NAVY }}>{nameOf(d)}</p>
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS[st].color }} />
                            {STATUS[st].label}{d.phone ? ` · ${d.phone}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={d.admin_id ?? ""}
                          onChange={(e) => onAssign(d.id, e.target.value || null)}
                          className="flex-1 min-w-0 text-xs border rounded-md px-2 py-1 bg-white"
                          title="Mover a…"
                        >
                          <option value="">Mover a… sin asignar</option>
                          {admins.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}{a.active ? "" : " (inactivo)"}</option>
                          ))}
                        </select>
                        <Switch checked={d.active} onCheckedChange={(v) => onDriverActive(d, v)} title="Acceso" />
                        <button onClick={() => onRemove("driver", d.id, nameOf(d))} className="text-muted-foreground hover:text-red-600" title="Borrar usuario">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {admins.length === 0 && (
          <div className="w-72 shrink-0 rounded-2xl border-2 border-dashed p-5 text-sm text-muted-foreground">
            Todavía no hay administradores de equipo. Pídeles que abran Cana Track › «Soy administrador» › «Crear cuenta de administrador».
          </div>
        )}
      </div>
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
  const lastGeo = useRef<{ id: string; lat: number; lng: number } | null>(null);
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

  // Marcadores con el icono del vehículo
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
        path: google.maps.SymbolPath.CIRCLE, scale: selected === d.id ? 17 : 14,
        fillColor: "#fff", fillOpacity: 1, strokeColor: STATUS[st].color, strokeWeight: 4,
      };
      let m = markers.current[d.id];
      if (!m) {
        m = new google.maps.Marker({ map: map.current, title: nameOf(d) });
        m.addListener("click", () => onSelect(d.id));
        markers.current[d.id] = m;
      }
      m.setPosition({ lat: p.lat, lng: p.lng });
      m.setIcon(icon);
      m.setLabel({ text: emojiOf(d.vehicle_type), fontSize: selected === d.id ? "18px" : "15px" });
      m.setTitle(`${nameOf(d)} · ${STATUS[st].label}`);
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
    if (!ready) return;
    line.current?.setMap(null);
    if (!selected) {
      onArea(null);
      lastGeo.current = null;
      return;
    }
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
    // El nombre del sector se pide solo al elegir a alguien o si se movió más de 300 m (ahorra consultas)
    const prev = lastGeo.current;
    if (p && (!prev || prev.id !== selected || meters(prev, p) > 300)) {
      if (!prev || prev.id !== selected) onArea(null);
      lastGeo.current = { id: selected, lat: p.lat, lng: p.lng };
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
