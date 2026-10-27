import { useRef, useState } from "react";
import { Save, Trash2, X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ICONS, iconSvg } from "./tourAddons";
import { sceneLabel, type AddonAction, type AddonPlacement, type AddonStyle, type TourHotspot, type TourScene } from "@/lib/tours";

// Panel de propiedades de un addon en el editor 360 (equivalente a la pestaña "Addon" de Kuula).

const input = "h-8 text-xs bg-white/10 border-white/15 text-white placeholder:text-white/40";
const h3 = "text-[11px] font-bold uppercase tracking-wider text-white/50";

function Range({ label, value, min, max, step = 1, unit = "", onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange(v: number): void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] text-white/70">
        {label} <b className="text-white tabular-nums">{value}{unit}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#F0A030] h-5" />
    </label>
  );
}

function Color({ label, value, onChange, allowNone }: { label: string; value: string | undefined; onChange(v: string): void; allowNone?: boolean }) {
  const hex = value && /^#[0-9a-f]{6}$/i.test(value) ? value : value?.startsWith("rgba(0,0,0") ? "#000000" : value?.startsWith("rgba(15,43,76") ? "#0f2b4c" : "#ffffff";
  return (
    <label className="flex items-center justify-between gap-2 text-[11px] text-white/70">
      {label}
      <span className="flex items-center gap-1.5">
        {allowNone && (
          <button type="button" onClick={() => onChange("")} className={cn("px-1.5 rounded border text-[10px]", !value ? "border-[#F0A030] text-[#F0A030]" : "border-white/20 text-white/50")}>
            sin
          </button>
        )}
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 rounded bg-transparent border border-white/20 cursor-pointer" />
      </span>
    </label>
  );
}

export function AddonPanel({ addon, onChange, scenes, sceneId, busy, onSave, onDelete, onCancel, onUploadImage }: {
  addon: TourHotspot;
  onChange(a: TourHotspot): void;
  scenes: TourScene[];
  sceneId: string;
  busy: boolean;
  onSave(): void;
  onDelete(): void;
  onCancel(): void;
  onUploadImage(file: File): Promise<{ url: string; path: string } | null>;
}) {
  const [iconsOpen, setIconsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = addon.style ?? {};
  const set = (patch: Partial<TourHotspot>) => onChange({ ...addon, ...patch });
  const st = (patch: Partial<AddonStyle>) => onChange({ ...addon, style: { ...s, ...patch } });
  const isNew = addon.id === "new";
  const title = addon.kind === "text" ? "Texto" : addon.kind === "image" ? "Imagen" : "Ícono";

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const up = await onUploadImage(file);
    setUploading(false);
    if (up) set({ image_url: up.url, image_path: up.path });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#F0A030]">{isNew ? "Nuevo" : "Editar"} · {title}</h3>
        <button onClick={onCancel} className="text-white/50 hover:text-white" title="Cerrar sin guardar"><X size={15} /></button>
      </div>
      <p className="text-[11px] text-white/40 -mt-2">Arrástralo en la foto o haz clic donde quieras moverlo.</p>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = ""; }} />

      {/* Contenido */}
      {addon.kind === "icon" && (
        <section className="space-y-2">
          <h4 className={h3}>Ícono</h4>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-[repeating-conic-gradient(#333_0_25%,#222_0_50%)] bg-[length:12px_12px] flex items-center justify-center">
              {addon.image_url ? (
                <img src={addon.image_url} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full p-1.5" style={{ background: s.bg || "transparent" }} dangerouslySetInnerHTML={{ __html: iconSvg(addon.icon ?? "target", s.tint ?? "#fff") }} />
              )}
            </div>
            <div className="flex flex-col items-start gap-1 text-xs">
              <button onClick={() => setIconsOpen((v) => !v)} className="font-semibold text-[#F0A030] hover:underline">Cambiar ícono</button>
              <button onClick={() => fileRef.current?.click()} className="text-white/70 hover:text-white hover:underline">
                {uploading ? "Subiendo…" : "Usar imagen propia"}
              </button>
              {addon.image_url && <button onClick={() => set({ image_url: null, image_path: null })} className="text-white/50 hover:text-white hover:underline">Volver a íconos</button>}
            </div>
          </div>
          {iconsOpen && (
            <div className="grid grid-cols-6 gap-1.5 rounded-lg bg-black/40 p-2">
              {Object.entries(ICONS).map(([id, ic]) => (
                <button
                  key={id}
                  title={ic.label}
                  onClick={() => { set({ icon: id, image_url: null, image_path: null }); setIconsOpen(false); }}
                  className={cn("aspect-square rounded-md p-1.5 hover:bg-white/15", addon.icon === id && !addon.image_url && "ring-2 ring-[#F0A030]")}
                  dangerouslySetInnerHTML={{ __html: iconSvg(id, "#fff") }}
                />
              ))}
            </div>
          )}
          {!addon.image_url && (
            <>
              <Color label="Color del ícono" value={s.tint} onChange={(v) => st({ tint: v || "#ffffff" })} />
              <Color label="Fondo (círculo)" value={s.bg} onChange={(v) => st({ bg: v })} allowNone />
            </>
          )}
        </section>
      )}

      {addon.kind === "image" && (
        <section className="space-y-2">
          <h4 className={h3}>Imagen</h4>
          {addon.image_url && <img src={addon.image_url} alt="" className="max-h-24 rounded border border-white/10" />}
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white">
            {uploading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Upload size={14} className="mr-2" />}
            {addon.image_url ? "Cambiar imagen" : "Elegir imagen"}
          </Button>
        </section>
      )}

      {/* Apariencia */}
      <section className="space-y-2">
        <h4 className={h3}>Apariencia</h4>
        {addon.kind !== "text" && <Range label={addon.kind === "image" ? "Ancho" : "Tamaño"} value={s.size ?? 44} min={16} max={addon.kind === "image" ? 800 : 160} unit="px" onChange={(v) => st({ size: v })} />}
        <Range label="Opacidad" value={s.opacity ?? 100} min={10} max={100} unit="%" onChange={(v) => st({ opacity: v })} />
        <Range label="Rotación" value={s.rotation ?? 0} min={-180} max={180} unit="°" onChange={(v) => st({ rotation: v })} />
        <label className="flex items-center gap-2 text-[11px] text-white/70">
          <Switch checked={!!s.shadow} onCheckedChange={(v) => st({ shadow: v })} /> Sombra
        </label>
      </section>

      {/* Posición */}
      <section className="space-y-2">
        <h4 className={h3}>Posición</h4>
        <div className="grid grid-cols-4 gap-1">
          {([["2d", "2D"], ["wall", "Pared"], ["floor", "Piso"], ["ceiling", "Techo"]] as [AddonPlacement, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => st({ placement: k })}
              className={cn("rounded-md py-1 text-[11px] font-semibold", (s.placement ?? "2d") === k ? "bg-[#F0A030] text-[#0F2B4C]" : "bg-white/10 text-white/70 hover:bg-white/15")}
            >
              {label}
            </button>
          ))}
        </div>
        {(s.placement ?? "2d") === "2d" ? (
          <label className="flex items-center gap-2 text-[11px] text-white/70">
            <Switch checked={!!s.scaleOnZoom} onCheckedChange={(v) => st({ scaleOnZoom: v })} /> Crecer con el zoom
          </label>
        ) : (
          <Range label={s.placement === "wall" ? "Ángulo en la pared" : "Girar sobre el plano"} value={s.wallAngle ?? 0} min={-90} max={90} unit="°" onChange={(v) => st({ wallAngle: v })} />
        )}
        <p className="text-[10px] text-white/40">2D = siempre mira de frente. Pared/Piso/Techo = pegado a la superficie, con perspectiva.</p>
      </section>

      {/* Texto / etiqueta */}
      <section className="space-y-2">
        <h4 className={h3}>{addon.kind === "text" ? "Texto" : "Etiqueta"}</h4>
        {addon.kind === "text" ? (
          <Textarea value={s.label ?? ""} onChange={(e) => st({ label: e.target.value })} rows={2} placeholder="Escribe el texto" className={cn("text-xs", input)} />
        ) : (
          <Input value={s.label ?? ""} onChange={(e) => st({ label: e.target.value })} placeholder={addon.action === "scene" ? "Por defecto: nombre de la escena" : "Texto debajo (opcional)"} className={input} />
        )}
        <Range label="Tamaño de letra" value={s.fontSize ?? (addon.kind === "text" ? 22 : 13)} min={8} max={72} unit="px" onChange={(v) => st({ fontSize: v })} />
        <Color label="Color del texto" value={s.color} onChange={(v) => st({ color: v || "#ffffff" })} />
        <Color label="Fondo del texto" value={s.labelBg} onChange={(v) => st({ labelBg: v })} allowNone />
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className="flex items-center gap-2 text-[11px] text-white/70"><Switch checked={!!s.bold} onCheckedChange={(v) => st({ bold: v })} /> Negrita</label>
          {addon.kind !== "text" && <label className="flex items-center gap-2 text-[11px] text-white/70"><Switch checked={!!s.onlyHover} onCheckedChange={(v) => st({ onlyHover: v })} /> Solo al pasar</label>}
        </div>
      </section>

      {/* Acción */}
      <section className="space-y-2">
        <h4 className={h3}>Acción al tocar</h4>
        <select
          value={addon.action}
          onChange={(e) => set({ action: e.target.value as AddonAction })}
          className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-xs [&>option]:text-black"
        >
          <option value="none">Ninguna</option>
          <option value="scene">Ir a otra foto</option>
          <option value="card">Abrir tarjeta (texto, imagen, video)</option>
          <option value="url">Abrir enlace</option>
        </select>
        {addon.action === "scene" && (
          <select
            value={addon.target_scene_id ?? ""}
            onChange={(e) => set({ target_scene_id: e.target.value || null })}
            className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-xs [&>option]:text-black"
          >
            <option value="">— Elige la foto —</option>
            {scenes.filter((x) => x.id !== sceneId).map((x) => (
              <option key={x.id} value={x.id}>{sceneLabel(x)}</option>
            ))}
          </select>
        )}
        {addon.action === "card" && (
          <>
            <Input value={addon.title ?? ""} onChange={(e) => set({ title: e.target.value || null })} placeholder="Título, ej. Cocina equipada" className={input} />
            <Textarea value={addon.text ?? ""} onChange={(e) => set({ text: e.target.value || null })} rows={3} placeholder="Texto de la tarjeta" className={cn("text-xs", input)} />
            <Input value={addon.url ?? ""} onChange={(e) => set({ url: e.target.value || null })} placeholder="Video o imagen (YouTube, .mp4, .jpg) — opcional" className={input} />
          </>
        )}
        {addon.action === "url" && (
          <Input value={addon.url ?? ""} onChange={(e) => set({ url: e.target.value || null })} placeholder="https://…" className={input} />
        )}
      </section>

      {/* Animación */}
      <section className="space-y-2">
        <h4 className={h3}>Animación</h4>
        <div className="grid grid-cols-4 gap-1">
          {([["none", "Ninguna"], ["bounce", "Rebote"], ["pulse", "Pulso"], ["wave", "Onda"]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => st({ animation: k })}
              className={cn("rounded-md py-1 text-[11px] font-semibold", (s.animation ?? "none") === k ? "bg-[#F0A030] text-[#0F2B4C]" : "bg-white/10 text-white/70 hover:bg-white/15")}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Master */}
      <section className="space-y-2">
        <h4 className={h3}>Master</h4>
        <label className="flex items-center gap-2 text-[11px] text-white/70">
          <Switch checked={addon.master} onCheckedChange={(v) => set({ master: v, hide_in: v ? addon.hide_in : [] })} /> Mostrar en todas las fotos del tour
        </label>
        {addon.master && (
          <label className="flex items-center gap-2 text-[11px] text-white/70 pl-2">
            <Switch
              checked={addon.hide_in.includes(sceneId)}
              onCheckedChange={(v) => set({ hide_in: v ? [...addon.hide_in, sceneId] : addon.hide_in.filter((x) => x !== sceneId) })}
            />
            No mostrar en esta foto
          </label>
        )}
      </section>

      <div className="flex gap-2 sticky bottom-0 bg-[#0b1220] py-2">
        <Button size="sm" onClick={onSave} disabled={busy || uploading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          <Save size={13} className="mr-1" /> Guardar
        </Button>
        {!isNew && (
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Borrar">
            <Trash2 size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}
