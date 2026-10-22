import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dna, Save, Plus, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { canaScore, MONTHS, type MarketZone, type MarketMonth, type MarketNote } from "@/lib/canaDna";

// Panel para mantener los datos de Cana DNA (canaescapes.com/cana-dna).
// Zonas (Cana Score, propiedades, descripción), métricas mensuales y notas de mercado.

type Tab = "monthly" | "zones" | "notes";

const SCORE_FIELDS = [
  ["score_demand", "Demanda"],
  ["score_investability", "Inversión"],
  ["score_growth", "Crecimiento"],
  ["score_seasonality", "Estabilidad"],
  ["score_regulation", "Regulación"],
] as const;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
}

export function AdminCanaDna() {
  const [tab, setTab] = useState<Tab>("monthly");
  const [zones, setZones] = useState<MarketZone[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadZones() {
    setLoading(true);
    const { data, error } = await supabase.from("market_zones").select("*").order("sort_order");
    if (error) toast({ title: "Error al cargar zonas", description: error.message, variant: "destructive" });
    setZones((data ?? []) as MarketZone[]);
    setLoading(false);
  }
  useEffect(() => {
    loadZones();
  }, []);

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] overflow-x-hidden">
      <div className="max-w-screen-xl mx-auto space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Dna size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Cana DNA</h1>
              <p className="text-xs text-gray-500">Datos del mercado que se muestran en la página pública. Marca "estimado" lo que no esté verificado.</p>
            </div>
          </div>
          <Link to="/cana-dna" target="_blank" className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]">
            Ver página pública <ExternalLink size={14} />
          </Link>
        </div>

        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 w-fit">
          {([["monthly", "Datos mensuales"], ["zones", "Zonas"], ["notes", "Notas de mercado"]] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-lg font-semibold ${tab === k ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]/70 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 rounded-xl bg-white animate-pulse" />
        ) : tab === "monthly" ? (
          <MonthlyEditor zones={zones} />
        ) : tab === "zones" ? (
          <ZonesEditor zones={zones} onSaved={loadZones} />
        ) : (
          <NotesEditor />
        )}
      </div>
    </div>
  );
}

// ── Datos mensuales: zona + año → 12 filas editables ─────────────────────────

type MonthDraft = { occupancy: string; adr: string; active_listings: string; is_estimate: boolean; source: string };

function MonthlyEditor({ zones }: { zones: MarketZone[] }) {
  const now = new Date();
  const [zone, setZone] = useState(zones[0]?.slug ?? "");
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Record<number, MonthDraft>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!zone) return;
    const { data, error } = await supabase.from("market_monthly").select("*").eq("zone_slug", zone).eq("year", year);
    if (error) {
      toast({ title: "Error al cargar", description: error.message, variant: "destructive" });
      return;
    }
    const byMonth: Record<number, MonthDraft> = {};
    for (const m of (data ?? []) as MarketMonth[]) {
      byMonth[m.month] = {
        occupancy: String(m.occupancy),
        adr: String(m.adr),
        active_listings: m.active_listings == null ? "" : String(m.active_listings),
        is_estimate: m.is_estimate,
        source: m.source ?? "",
      };
    }
    setRows(byMonth);
  }
  useEffect(() => {
    load();
  }, [zone, year]);

  const empty: MonthDraft = { occupancy: "", adr: "", active_listings: "", is_estimate: false, source: "" };
  const set = (month: number, patch: Partial<MonthDraft>) => setRows((r) => ({ ...r, [month]: { ...(r[month] ?? empty), ...patch } }));

  async function save() {
    const upserts = Object.entries(rows)
      .filter(([, d]) => d.occupancy !== "" && d.adr !== "")
      .map(([month, d]) => ({
        zone_slug: zone,
        year,
        month: Number(month),
        occupancy: Number(d.occupancy),
        adr: Number(d.adr),
        active_listings: d.active_listings === "" ? null : Number(d.active_listings),
        is_estimate: d.is_estimate,
        source: d.source || null,
        updated_at: new Date().toISOString(),
      }));
    if (upserts.some((u) => !(u.occupancy >= 0 && u.occupancy <= 100) || !(u.adr >= 0))) {
      toast({ title: "Revisa los valores", description: "La ocupación va de 0 a 100 y la tarifa no puede ser negativa.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("market_monthly").upsert(upserts as any, { onConflict: "zone_slug,year,month" });
    setSaving(false);
    if (error) toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${upserts.length} meses guardados`, variant: "success" });
      load();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-xs text-gray-500">Zona</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="h-9 rounded-md border border-gray-300 px-2">
            {zones.map((z) => <option key={z.slug} value={z.slug}>{z.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-gray-500">Año</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 rounded-md border border-gray-300 px-2">
            {Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <Button onClick={save} disabled={saving} className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90">
          <Save size={14} className="mr-1.5" /> {saving ? "Guardando…" : "Guardar meses"}
        </Button>
        <Button variant="outline" onClick={load}><RefreshCw size={14} /></Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 pr-2">Mes</th>
              <th className="py-2 px-2">Ocupación %</th>
              <th className="py-2 px-2">Tarifa (ADR) USD</th>
              <th className="py-2 px-2">RevPAR</th>
              <th className="py-2 px-2">Propiedades</th>
              <th className="py-2 px-2">Estimado</th>
              <th className="py-2 pl-2">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const d = rows[m] ?? empty;
              const revpar = d.occupancy && d.adr ? (Number(d.occupancy) * Number(d.adr)) / 100 : null;
              return (
                <tr key={m} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2 font-medium text-[#0F2B4C]">{MONTHS.es[m - 1]}</td>
                  <td className="py-1.5 px-2"><Input type="number" step="0.1" min={0} max={100} value={d.occupancy} onChange={(e) => set(m, { occupancy: e.target.value })} className="h-8 w-24" /></td>
                  <td className="py-1.5 px-2"><Input type="number" step="1" min={0} value={d.adr} onChange={(e) => set(m, { adr: e.target.value })} className="h-8 w-24" /></td>
                  <td className="py-1.5 px-2 tabular-nums text-gray-500">{revpar != null ? `$${revpar.toFixed(0)}` : "—"}</td>
                  <td className="py-1.5 px-2"><Input type="number" min={0} value={d.active_listings} onChange={(e) => set(m, { active_listings: e.target.value })} className="h-8 w-24" /></td>
                  <td className="py-1.5 px-2"><input type="checkbox" checked={d.is_estimate} onChange={(e) => set(m, { is_estimate: e.target.checked })} className="w-4 h-4 accent-[#F0A030]" /></td>
                  <td className="py-1.5 pl-2"><Input value={d.source} onChange={(e) => set(m, { source: e.target.value })} placeholder="ej. Reservas Cana Escapes" className="h-8" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Los meses sin ocupación o tarifa no se guardan. La página pública usa los últimos 24 meses para tendencias, comparación anual y proyección.</p>
    </div>
  );
}

// ── Zonas ────────────────────────────────────────────────────────────────────

function ZonesEditor({ zones, onSaved }: { zones: MarketZone[]; onSaved: () => void }) {
  const [drafts, setDrafts] = useState<Record<string, MarketZone>>(() => Object.fromEntries(zones.map((z) => [z.slug, z])));
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const set = (slug: string, patch: Partial<MarketZone>) => setDrafts((d) => ({ ...d, [slug]: { ...d[slug], ...patch } }));

  async function save(slug: string) {
    const z = drafts[slug];
    setSavingSlug(slug);
    // Tabla fuera de los tipos generados: update() sin tipar
    const { error } = await (supabase.from("market_zones") as any)
      .update({
        name: z.name,
        description_es: z.description_es,
        description_en: z.description_en,
        highlights_es: z.highlights_es,
        highlights_en: z.highlights_en,
        active_listings: z.active_listings,
        listings_growth_pct: z.listings_growth_pct,
        avg_property_price: z.avg_property_price,
        score_demand: z.score_demand,
        score_investability: z.score_investability,
        score_growth: z.score_growth,
        score_seasonality: z.score_seasonality,
        score_regulation: z.score_regulation,
        sort_order: z.sort_order,
        active: z.active,
        is_estimate: z.is_estimate,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    setSavingSlug(null);
    if (error) toast({ title: "Error al guardar", description: errMsg(error), variant: "destructive" });
    else {
      toast({ title: `${z.name} guardada`, variant: "success" });
      onSaved();
    }
  }

  const numOrNull = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {Object.values(drafts).sort((a, b) => a.sort_order - b.sort_order).map((z) => (
        <div key={z.slug} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Input value={z.name} onChange={(e) => set(z.slug, { name: e.target.value })} className="h-9 font-semibold text-[#0F2B4C]" />
            <span className="flex-shrink-0 px-3 py-1 rounded-full bg-[#0F2B4C] text-white font-bold">{canaScore(z)}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {SCORE_FIELDS.map(([k, label]) => (
              <label key={k} className="space-y-1">
                <span className="block text-[11px] text-gray-500">{label}</span>
                <Input type="number" min={0} max={100} value={z[k]} onChange={(e) => set(z.slug, { [k]: Math.max(0, Math.min(100, Number(e.target.value))) } as Partial<MarketZone>)} className="h-8" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="block text-[11px] text-gray-500">Propiedades activas</span>
              <Input type="number" value={z.active_listings ?? ""} onChange={(e) => set(z.slug, { active_listings: numOrNull(e.target.value) })} className="h-8" />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-gray-500">Crec. oferta %</span>
              <Input type="number" value={z.listings_growth_pct ?? ""} onChange={(e) => set(z.slug, { listings_growth_pct: numOrNull(e.target.value) })} className="h-8" />
            </label>
            <label className="space-y-1">
              <span className="block text-[11px] text-gray-500">Precio típico USD</span>
              <Input type="number" value={z.avg_property_price ?? ""} onChange={(e) => set(z.slug, { avg_property_price: numOrNull(e.target.value) })} className="h-8" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="block text-[11px] text-gray-500">Descripción (ES)</span>
            <textarea value={z.description_es ?? ""} onChange={(e) => set(z.slug, { description_es: e.target.value })} rows={2} className="w-full rounded-md border border-gray-300 p-2" />
          </label>
          <label className="block space-y-1">
            <span className="block text-[11px] text-gray-500">Description (EN)</span>
            <textarea value={z.description_en ?? ""} onChange={(e) => set(z.slug, { description_en: e.target.value })} rows={2} className="w-full rounded-md border border-gray-300 p-2" />
          </label>
          <label className="block space-y-1">
            <span className="block text-[11px] text-gray-500">Puntos clave ES (separados por ;)</span>
            <Input value={z.highlights_es.join("; ")} onChange={(e) => set(z.slug, { highlights_es: e.target.value.split(";").map((s) => s.trim()).filter(Boolean) })} className="h-8" />
          </label>
          <label className="block space-y-1">
            <span className="block text-[11px] text-gray-500">Highlights EN (separated by ;)</span>
            <Input value={z.highlights_en.join("; ")} onChange={(e) => set(z.slug, { highlights_en: e.target.value.split(";").map((s) => s.trim()).filter(Boolean) })} className="h-8" />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={z.active} onChange={(e) => set(z.slug, { active: e.target.checked })} className="accent-[#F0A030]" /> Visible</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={z.is_estimate} onChange={(e) => set(z.slug, { is_estimate: e.target.checked })} className="accent-[#F0A030]" /> Estimado</label>
            <label className="flex items-center gap-1.5">Orden <Input type="number" value={z.sort_order} onChange={(e) => set(z.slug, { sort_order: Number(e.target.value) })} className="h-8 w-16" /></label>
            <Button size="sm" onClick={() => save(z.slug)} disabled={savingSlug === z.slug} className="ml-auto bg-[#0F2B4C] hover:bg-[#0F2B4C]/90">
              <Save size={14} className="mr-1.5" /> {savingSlug === z.slug ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Notas de mercado ────────────────────────────────────────────────────────

const KIND_LABEL: Record<MarketNote["kind"], string> = { stat: "Dato de turismo", alert: "Alerta", opportunity: "Oportunidad" };

function NotesEditor() {
  const [notes, setNotes] = useState<MarketNote[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  async function load() {
    const { data, error } = await supabase.from("market_notes").select("*").order("sort_order");
    if (error) toast({ title: "Error al cargar notas", description: error.message, variant: "destructive" });
    setNotes((data ?? []) as MarketNote[]);
    setDirty(new Set());
  }
  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => [...notes].sort((a, b) => a.sort_order - b.sort_order), [notes]);
  const set = (id: string, patch: Partial<MarketNote>) => {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    setDirty((d) => new Set(d).add(id));
  };

  async function add() {
    const { error } = await supabase.from("market_notes").insert({
      kind: "stat", title_es: "Nuevo dato", title_en: "New fact",
      sort_order: (notes.at(-1)?.sort_order ?? 0) + 1,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  }

  async function save(n: MarketNote) {
    const { id, updated_at: _u, ...rest } = n;
    const { error } = await (supabase.from("market_notes") as any).update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Nota guardada", variant: "success" });
      setDirty((d) => {
        const next = new Set(d);
        next.delete(id);
        return next;
      });
    }
  }

  async function remove(n: MarketNote) {
    if (!window.confirm(`¿Borrar "${n.title_es}"?`)) return;
    const { error } = await supabase.from("market_notes").delete().eq("id", n.id);
    if (error) toast({ title: "Error al borrar", description: error.message, variant: "destructive" });
    else load();
  }

  return (
    <div className="space-y-3">
      <Button onClick={add} variant="outline"><Plus size={14} className="mr-1.5" /> Agregar nota</Button>
      {sorted.map((n) => (
        <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-4 grid md:grid-cols-[160px_100px_1fr_1fr] gap-2 items-start">
          <div className="space-y-2">
            <select value={n.kind} onChange={(e) => set(n.id, { kind: e.target.value as MarketNote["kind"] })} className="h-8 w-full rounded-md border border-gray-300 px-2">
              {(Object.keys(KIND_LABEL) as MarketNote["kind"][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={n.active} onChange={(e) => set(n.id, { active: e.target.checked })} className="accent-[#F0A030]" /> Visible</label>
            <label className="flex items-center gap-1.5 text-xs">Orden <Input type="number" value={n.sort_order} onChange={(e) => set(n.id, { sort_order: Number(e.target.value) })} className="h-7 w-16" /></label>
          </div>
          <Input value={n.value ?? ""} onChange={(e) => set(n.id, { value: e.target.value || null })} placeholder="Cifra" className="h-8" />
          <div className="space-y-1.5">
            <Input value={n.title_es} onChange={(e) => set(n.id, { title_es: e.target.value })} placeholder="Título ES" className="h-8 font-semibold" />
            <textarea value={n.body_es ?? ""} onChange={(e) => set(n.id, { body_es: e.target.value || null })} placeholder="Texto ES" rows={2} className="w-full rounded-md border border-gray-300 p-2" />
            <Input value={n.source ?? ""} onChange={(e) => set(n.id, { source: e.target.value || null })} placeholder="Fuente" className="h-8" />
          </div>
          <div className="space-y-1.5">
            <Input value={n.title_en} onChange={(e) => set(n.id, { title_en: e.target.value })} placeholder="Title EN" className="h-8 font-semibold" />
            <textarea value={n.body_en ?? ""} onChange={(e) => set(n.id, { body_en: e.target.value || null })} placeholder="Text EN" rows={2} className="w-full rounded-md border border-gray-300 p-2" />
            <div className="flex gap-2">
              <Input value={n.source_url ?? ""} onChange={(e) => set(n.id, { source_url: e.target.value || null })} placeholder="URL de la fuente" className="h-8" />
              <Button size="sm" onClick={() => save(n)} disabled={!dirty.has(n.id)} className="bg-[#0F2B4C] hover:bg-[#0F2B4C]/90"><Save size={14} /></Button>
              <Button size="sm" variant="outline" onClick={() => remove(n)}><Trash2 size={14} className="text-rose-600" /></Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
