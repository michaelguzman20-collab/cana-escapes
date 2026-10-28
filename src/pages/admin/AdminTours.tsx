import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Rotate3d, Plus, ArrowLeft, ExternalLink, Copy, Save, Trash2, UploadCloud, Star, LayoutGrid, Pencil,
  Navigation, Info, Crosshair, Eye, Loader2, Settings2, Image as ImageIcon, X, GripVertical, RefreshCw, Download, MoveRight, Type, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { tourStorage, processPanorama, extOf } from "@/lib/tourStorage";
import { PanoThumb } from "@/components/tours/PanoThumb";
import { applyFilters as renderFilters, canvasToBlob, cssPreview, thumbFrom } from "@/lib/panoFilters";
import {
  db, fetchTourContent, slugify, tourUrl, hasFilters, FILTER_KEYS, mediaUrl, fetchRetry, withTimeout, translateArea, genericDescription,
  addonsForScene, sceneLabel, AREA_SUGGESTIONS, type Tour, type TourScene, type TourHotspot, type PanoFilters,
} from "@/lib/tours";
import { AddonPanel } from "@/components/tours/AddonPanel";
import { ICONS, PRESETS, iconSvg } from "@/components/tours/tourAddons";
import type { EditorViewerApi } from "@/components/tours/TourEditorViewer";

// Tours 360 (reemplazo de Kuula). Flujo parecido al de Kuula:
//  · Lista de tours → abrir uno.
//  · "Fotos" (cuadrícula): subir/arrastrar fotos 360, nombrarlas, ordenarlas, borrar varias.
//  · "Editor": panorama grande + panel derecho (puntos, nombre, vista inicial) + tira de miniaturas.
//  · "Ajustes del tour": enlace, datos de la propiedad, autorrotación.

const TourEditorViewer = lazy(() => import("@/components/tours/TourEditorViewer"));

const DEG = 180 / Math.PI;
// Tiempo máximo de una escritura en la BD antes de avisar (para que "Guardar" no quede colgado)
const DB_TIMEOUT = 20000;
const round1 = (n: number) => Math.round(n * 10) / 10;

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
}

function fail(title: string, e: unknown) {
  toast({ title, description: errMsg(e), variant: "destructive" });
}

function thumbPath(p: string) {
  return p.replace(/\.(\w+)$/, "-thumb.$1");
}

// Todos los archivos de una escena (foto, miniatura y, si tiene filtros, la original)
function scenePaths(s: TourScene) {
  return [s.storage_path, s.base_path].flatMap((p) => (p ? [p, thumbPath(p)] : []));
}

async function copyLink(slug: string) {
  try {
    await navigator.clipboard.writeText(tourUrl(slug));
    toast({ title: "Enlace copiado", description: tourUrl(slug) });
  } catch {
    toast({ title: "Copia este enlace", description: tourUrl(slug) });
  }
}

// ════════════════════════════════════════════════════════════════════════════
export function AdminTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("tours").select("*").order("created_at", { ascending: false });
    if (error) fail("Error al cargar tours", error);
    setTours(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    let slug = slugify(title) || "tour";
    if (tours.some((t) => t.slug === slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await db.from("tours").insert({ title, slug }).select().single();
    setCreating(false);
    if (error) return fail("No se pudo crear el tour", error);
    setNewTitle("");
    setTours((t) => [data, ...t]);
    setOpenId(data.id);
  }

  const open = tours.find((t) => t.id === openId);
  if (open) {
    return (
      <TourEditor
        tour={open}
        allTours={tours}
        onBack={() => {
          setOpenId(null);
          load();
        }}
        onChange={(t) => setTours((list) => list.map((x) => (x.id === t.id ? t : x)))}
        onDeleted={() => {
          setOpenId(null);
          setTours((list) => list.filter((x) => x.id !== open.id));
        }}
      />
    );
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <div className="max-w-screen-xl mx-auto space-y-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Rotate3d size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Tours 360</h1>
              <p className="text-xs text-gray-500">Sube fotos 360, únelas con flechas y comparte el enlace del recorrido.</p>
            </div>
          </div>
          <Link to="/tours" target="_blank" className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]">
            Ver galería pública <ExternalLink size={14} />
          </Link>
        </div>

        <StorageNotice />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
          className="flex flex-wrap gap-2 bg-white rounded-xl border border-gray-200 p-3"
        >
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nombre del tour nuevo, ej. Villa Cocotal" className="flex-1 min-w-[200px]" />
          <Button type="submit" disabled={creating || !newTitle.trim()} className="bg-[#0F2B4C] hover:bg-[#173a63]">
            {creating ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Plus size={15} className="mr-1.5" />}
            Crear tour
          </Button>
        </form>

        {loading ? (
          <p className="text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
        ) : tours.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            <Rotate3d size={36} className="mx-auto mb-3 text-gray-300" />
            Aún no hay tours. Crea el primero arriba.
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tours.map((t) => (
              <button key={t.id} onClick={() => setOpenId(t.id)} className="text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[2/1] bg-gray-100 flex items-center justify-center">
                  {t.cover_url ? <img src={t.cover_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-gray-300" />}
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#0F2B4C] truncate">{t.title}</p>
                    <span className={cn("shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", t.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                      {t.published ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">/tour/{t.slug}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StorageNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
      Fotos guardadas en <b>{tourStorage.name}</b>. Usa solo 1-2 tours de prueba hasta activar Cloudflare R2 (el plan gratis de Supabase tiene 1 GB).
      Cada foto se reduce a 8K (8192×4096) en WebP antes de subir.
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
type View = "grid" | "editor" | "settings";

function TourEditor({ tour, allTours, onBack, onChange, onDeleted }: {
  tour: Tour;
  allTours: Tour[];
  onBack(): void;
  onChange(t: Tour): void;
  onDeleted(): void;
}) {
  const [view, setView] = useState<View>("grid");
  const [scenes, setScenes] = useState<TourScene[]>([]);
  const [hotspots, setHotspots] = useState<TourHotspot[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [form, setForm] = useState(tour);
  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(tour);

  useEffect(() => {
    fetchTourContent(tour)
      .then((f) => {
        setScenes(f.scenes);
        setHotspots(f.hotspots);
        setCurrentId(f.tour.start_scene_id ?? f.scenes[0]?.id ?? null);
      })
      .catch((e) => fail("Error al cargar el tour", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.id]);

  async function patchTour(patch: Partial<Tour>) {
    let res: { data: Tour; error: unknown };
    try {
      res = await withTimeout(db.from("tours").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", tour.id).select().single(), DB_TIMEOUT);
    } catch (e) {
      fail("No se pudo guardar", e);
      return false;
    }
    const { data, error } = res;
    if (error) {
      fail("No se pudo guardar", error);
      return false;
    }
    onChange(data);
    setForm((f) => ({ ...f, ...patch, updated_at: data.updated_at }));
    return true;
  }

  async function saveForm() {
    const slug = slugify(form.slug);
    if (!slug) {
      toast({ title: "El enlace no puede quedar vacío", variant: "destructive" });
      return false;
    }
    setSaving(true);
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = form;
    const ok = await patchTour({ ...rest, slug, title: form.title.trim() || tour.title });
    setSaving(false);
    if (ok) toast({ title: "Tour guardado" });
    return ok;
  }

  // ── Aviso de cambios sin guardar ──
  // Cambios del tour (nombre, descripción, ajustes) + lo que el editor 360 tenga abierto sin guardar
  // (un addon o filtros sin aplicar). Antes de salir, cambiar de pestaña/foto o abrir "Ver" se pregunta.
  const sceneGuard = useRef<SceneGuard | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const navigate = useNavigate();
  const isDirty = () => dirty || !!sceneGuard.current?.isDirty();
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;

  function guard(action: () => void, onlyScene = false) {
    const pendingScene = !!sceneGuard.current?.isDirty();
    if (pendingScene || (!onlyScene && dirty)) setPendingAction(() => action);
    else action();
  }

  async function saveAll() {
    setSavingAll(true);
    let ok = true;
    if (dirty) ok = await saveForm();
    if (ok && sceneGuard.current?.isDirty()) ok = await sceneGuard.current.save();
    setSavingAll(false);
    return ok;
  }

  function flushPending() {
    for (const [id, p] of Object.entries(pending.current)) {
      clearTimeout(p.timer);
      delete pending.current[id];
      db.from("tour_scenes").update(p.patch).eq("id", id).then(() => undefined);
    }
    if (tourTimer.current) {
      clearTimeout(tourTimer.current);
      tourTimer.current = undefined;
      const { nadir_logo, nadir_size, nadir_opacity } = formRef.current;
      db.from("tours").update({ nadir_logo, nadir_size, nadir_opacity }).eq("id", tour.id).then(() => undefined);
    }
  }
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    // Cerrar/recargar la pestaña del navegador
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flushPending();
      if (dirtyRef.current()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    // Enlaces de la app (menú lateral, etc.)
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !dirtyRef.current()) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingAction(() => () => navigate(url.pathname + url.search + url.hash));
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      flushPending();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function togglePublished(v: boolean) {
    if (v && scenes.length === 0) return toast({ title: "Sube al menos una foto antes de publicar", variant: "destructive" });
    if (await patchTour({ published: v })) toast({ title: v ? "Tour publicado" : "Tour oculto (borrador)" });
  }

  // ── Subida de fotos ──
  async function addFiles(files: File[]) {
    const imgs = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!imgs.length) return toast({ title: "Elige fotos JPG, PNG o WebP", variant: "destructive" });
    let order = scenes.reduce((m, s) => Math.max(m, s.sort_order), -1) + 1;
    const added: TourScene[] = [];
    for (let i = 0; i < imgs.length; i++) {
      const file = imgs[i];
      const label = `${i + 1}/${imgs.length}`;
      try {
        setUploadMsg(`Procesando ${label}: ${file.name}`);
        const p = await processPanorama(file);
        if (p.warning) toast({ title: file.name, description: p.warning });
        setUploadMsg(`Subiendo ${label} (${(p.pano.size / 1048576).toFixed(1)} MB)…`);
        const path = `${tour.id}/${crypto.randomUUID()}.${extOf(p.pano)}`;
        const pano = await tourStorage.upload(path, p.pano);
        const thumb = await tourStorage.upload(thumbPath(path), p.thumb);
        const { data, error } = await db
          .from("tour_scenes")
          .insert({
            tour_id: tour.id,
            title: form.title.trim() || tour.title, // nombre del tour; el área se pone luego (Entrada, Sala…)
            image_url: pano.url,
            thumb_url: thumb.url,
            storage_path: pano.path,
            sort_order: order++,
          })
          .select()
          .single();
        if (error) throw error;
        added.push(data);
        setScenes((s) => [...s, data]);
      } catch (e) {
        fail(`No se pudo subir ${file.name}`, e);
      }
    }
    setUploadMsg(null);
    if (added.length) {
      toast({ title: `${added.length} foto(s) añadidas` });
      const patch: Partial<Tour> = {};
      if (!form.start_scene_id) patch.start_scene_id = added[0].id;
      if (!form.cover_url) patch.cover_url = added[0].thumb_url;
      if (Object.keys(patch).length) await patchTour(patch);
      if (!currentId) setCurrentId(added[0].id);
    }
  }

  // Con `debounce` (controles deslizantes) se ve al instante y se guarda al soltar
  const pending = useRef<Record<string, { patch: Partial<TourScene>; timer: number }>>({});
  async function updateScene(id: string, patch: Partial<TourScene>, debounce = false) {
    setScenes((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    if (debounce) {
      const prev = pending.current[id];
      if (prev) clearTimeout(prev.timer);
      const merged = { ...prev?.patch, ...patch };
      pending.current[id] = {
        patch: merged,
        timer: window.setTimeout(() => {
          delete pending.current[id];
          updateScene(id, merged);
        }, 600),
      };
      return;
    }
    try {
      const { error } = await withTimeout<{ error: unknown }>(db.from("tour_scenes").update(patch).eq("id", id), DB_TIMEOUT);
      if (error) fail("No se pudo guardar la escena", error);
    } catch (e) {
      fail("No se pudo guardar la escena", e);
    }
  }

  const tourTimer = useRef<number>();
  function updateTourLive(patch: Partial<Tour>) {
    setForm((f) => ({ ...f, ...patch }));
    clearTimeout(tourTimer.current);
    tourTimer.current = window.setTimeout(() => patchTour(patch), 600);
  }

  // Sube una foto ya procesada y devuelve sus datos de escena
  async function uploadPano(pano: Blob, thumb: Blob) {
    const path = `${tour.id}/${crypto.randomUUID()}.${extOf(pano)}`;
    const p = await tourStorage.upload(path, pano);
    const t = await tourStorage.upload(thumbPath(path), thumb);
    return { image_url: p.url, thumb_url: t.url, storage_path: p.path };
  }

  async function swapCover(oldThumb: string | null, newThumb: string | null) {
    if (oldThumb && form.cover_url === oldThumb) await patchTour({ cover_url: newThumb });
  }

  async function replacePhoto(scene: TourScene, file: File) {
    try {
      setUploadMsg(`Procesando ${file.name}…`);
      const p = await processPanorama(file);
      if (p.warning) toast({ title: file.name, description: p.warning });
      setUploadMsg(`Subiendo (${(p.pano.size / 1048576).toFixed(1)} MB)…`);
      const up = await uploadPano(p.pano, p.thumb);
      await updateScene(scene.id, { ...up, base_url: null, base_path: null, filters: {} });
      await swapCover(scene.thumb_url, up.thumb_url);
      tourStorage.remove(scenePaths(scene)).catch(() => undefined);
      toast({ title: "Foto reemplazada", description: "Las flechas y puntos se mantienen." });
    } catch (e) {
      fail("No se pudo reemplazar la foto", e);
    }
    setUploadMsg(null);
  }

  async function applySceneFilters(scene: TourScene, f: PanoFilters) {
    if (!hasFilters(f)) return clearSceneFilters(scene);
    const baseUrl = scene.base_url ?? scene.image_url;
    const basePath = scene.base_path ?? scene.storage_path;
    try {
      setUploadMsg("Aplicando filtros… 0%");
      const canvas = await renderFilters(baseUrl, f, (pct) => setUploadMsg(`Aplicando filtros… ${pct}%`));
      setUploadMsg("Guardando foto con filtros…");
      const [pano, thumb] = await Promise.all([canvasToBlob(canvas), thumbFrom(canvas)]);
      canvas.width = canvas.height = 0;
      const up = await uploadPano(pano, thumb);
      const old = scene.base_path ? scene.storage_path : null; // versión con filtros anterior
      await updateScene(scene.id, { ...up, base_url: baseUrl, base_path: basePath, filters: f });
      await swapCover(scene.thumb_url, up.thumb_url);
      if (old) tourStorage.remove([old, thumbPath(old)]).catch(() => undefined);
      toast({ title: "Filtros aplicados" });
    } catch (e) {
      fail("No se pudieron aplicar los filtros", e);
    }
    setUploadMsg(null);
  }

  async function clearSceneFilters(scene: TourScene) {
    if (!scene.base_url || !scene.base_path) return updateScene(scene.id, { filters: {} });
    const thumb = thumbPath(scene.base_url);
    const old = scene.storage_path;
    await updateScene(scene.id, { image_url: scene.base_url, thumb_url: thumb, storage_path: scene.base_path, base_url: null, base_path: null, filters: {} });
    await swapCover(scene.thumb_url, thumb);
    if (old) tourStorage.remove([old, thumbPath(old)]).catch(() => undefined);
    toast({ title: "Filtros quitados: foto original" });
  }

  async function downloadPhoto(scene: TourScene) {
    try {
      setUploadMsg("Descargando…");
      const blob = await (await fetchRetry(mediaUrl(scene.base_url ?? scene.image_url))).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slugify(sceneLabel(scene)) || "escena"}.${blob.type === "image/webp" ? "webp" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      fail("No se pudo descargar", e);
    }
    setUploadMsg(null);
  }

  async function moveScene(scene: TourScene, targetTourId: string) {
    const target = allTours.find((t) => t.id === targetTourId);
    if (!target || !confirm(`¿Mover "${scene.title || "esta foto"}" al tour "${target.title}"? Se quitan sus flechas y puntos.`)) return;
    const { error: e1 } = await db.from("tour_hotspots").delete().or(`scene_id.eq.${scene.id},target_scene_id.eq.${scene.id}`);
    if (e1) return fail("No se pudo mover", e1);
    const { error } = await db.from("tour_scenes").update({ tour_id: target.id, sort_order: 10000 }).eq("id", scene.id);
    if (error) return fail("No se pudo mover", error);
    const rest = scenes.filter((s) => s.id !== scene.id);
    setScenes(rest);
    setHotspots((h) => h.filter((x) => x.scene_id !== scene.id && x.target_scene_id !== scene.id));
    if (currentId === scene.id) setCurrentId(rest[0]?.id ?? null);
    const patch: Partial<Tour> = {};
    if (form.start_scene_id === scene.id) patch.start_scene_id = rest[0]?.id ?? null;
    if (form.cover_url === scene.thumb_url) patch.cover_url = rest[0]?.thumb_url ?? null;
    if (!rest.length) patch.published = false;
    if (Object.keys(patch).length) await patchTour(patch);
    if (!target.cover_url) await db.from("tours").update({ cover_url: scene.thumb_url, start_scene_id: target.start_scene_id ?? scene.id }).eq("id", target.id);
    toast({ title: `Foto movida a "${target.title}"` });
    if (!rest.length) setView("grid");
  }

  async function deleteScenes(ids: string[]) {
    const del = scenes.filter((s) => ids.includes(s.id));
    if (!del.length || !confirm(`¿Borrar ${del.length} foto(s)? También se borran sus flechas y puntos.`)) return;
    const { error } = await db.from("tour_scenes").delete().in("id", ids);
    if (error) return fail("No se pudo borrar", error);
    const addonImgs = hotspots.filter((h) => ids.includes(h.scene_id) && h.image_path).map((h) => h.image_path!);
    tourStorage.remove([...del.flatMap(scenePaths), ...addonImgs]).catch((e) => fail("Fotos borradas del tour, pero no del almacenamiento", e));
    const rest = scenes.filter((s) => !ids.includes(s.id));
    setScenes(rest);
    setHotspots((h) => h.filter((x) => !ids.includes(x.scene_id) && !ids.includes(x.target_scene_id ?? "")));
    if (currentId && ids.includes(currentId)) setCurrentId(rest[0]?.id ?? null);
    const patch: Partial<Tour> = {};
    if (form.start_scene_id && ids.includes(form.start_scene_id)) patch.start_scene_id = rest[0]?.id ?? null;
    if (del.some((s) => s.thumb_url === form.cover_url)) patch.cover_url = (rest.find((s) => s.id === (patch.start_scene_id ?? form.start_scene_id)) ?? rest[0])?.thumb_url ?? null;
    if (!rest.length) patch.published = false;
    if (Object.keys(patch).length) await patchTour(patch);
  }

  async function reorder(next: TourScene[]) {
    const withOrder = next.map((s, i) => ({ ...s, sort_order: i }));
    setScenes(withOrder);
    const changed = withOrder.filter((s, i) => scenes.find((x) => x.id === s.id)?.sort_order !== i);
    const results = await Promise.all(changed.map((s) => db.from("tour_scenes").update({ sort_order: s.sort_order }).eq("id", s.id)));
    const err = results.find((r: { error: unknown }) => r.error);
    if (err) fail("No se pudo guardar el orden", err.error);
  }

  async function setStart(s: TourScene) {
    if (await patchTour({ start_scene_id: s.id, cover_url: s.thumb_url })) toast({ title: `"${s.title || "Escena"}" es ahora la escena inicial y portada` });
  }

  async function deleteTour() {
    if (!confirm(`¿Borrar el tour "${tour.title}" con todas sus fotos? No se puede deshacer.`)) return;
    const paths = [...scenes.flatMap(scenePaths), ...hotspots.flatMap((h) => (h.image_path ? [h.image_path] : []))];
    const { error } = await db.from("tours").delete().eq("id", tour.id);
    if (error) return fail("No se pudo borrar el tour", error);
    tourStorage.remove(paths).catch(() => undefined);
    toast({ title: "Tour borrado" });
    onDeleted();
  }

  const isEditor = view === "editor";

  return (
    <div className={cn("min-h-screen text-sm", isEditor ? "bg-[#111827]" : "bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]")}>
      {/* ── Barra superior ── */}
      <div className={cn("px-3 sm:px-6 pt-4 pb-3 border-b", isEditor ? "border-white/10 text-white" : "border-gray-200 bg-white")}>
        <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => guard(onBack)} className={cn(isEditor && "text-white hover:bg-white/10 hover:text-white")}>
            <ArrowLeft size={15} className="mr-1" /> Tours
          </Button>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={cn("flex-1 min-w-[180px] max-w-md font-semibold", isEditor && "bg-white/10 border-white/15 text-white")}
          />
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <label className={cn("flex items-center gap-2 px-2 text-xs font-semibold", isEditor ? "text-white/80" : "text-gray-600")}>
              <Switch checked={tour.published} onCheckedChange={togglePublished} />
              {tour.published ? "Publicado" : "Borrador"}
            </label>
            <Button variant="outline" size="sm" onClick={() => copyLink(tour.slug)} className={cn(isEditor && "bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white")}>
              <Copy size={14} className="mr-1.5" /> Copiar enlace
            </Button>
            <a
              href={`/tour/${tour.slug}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (!isDirty()) return;
                e.preventDefault();
                guard(() => window.open(`/tour/${tour.slug}`, "_blank"));
              }}
            >
              <Button variant="outline" size="sm" className={cn(isEditor && "bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white")}>
                <Eye size={14} className="mr-1.5" /> Ver
              </Button>
            </a>
            <Button size="sm" onClick={saveForm} disabled={!dirty || saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />} Guardar
            </Button>
          </div>
        </div>
        {view === "grid" && (
          <div className="max-w-screen-2xl mx-auto mt-2">
            <div className="grid gap-2 lg:grid-cols-2 max-w-5xl">
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                placeholder="Descripción del tour (español, opcional)"
                rows={3}
              />
              <Textarea
                value={form.description_en ?? ""}
                onChange={(e) => setForm({ ...form, description_en: e.target.value || null })}
                placeholder="Description (English, optional) — se muestra con el botón EN"
                rows={3}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const hasText = !!(form.description?.trim() || form.description_en?.trim());
                if (hasText && !confirm("¿Reemplazar las descripciones actuales por una genérica?")) return;
                const d = genericDescription(form, scenes.map((s) => s.area ?? ""));
                setForm({ ...form, description: d.es, description_en: d.en });
                toast({ title: "Descripción genérica lista", description: "Ajusta los detalles y pulsa Guardar." });
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#b8761a] hover:underline"
            >
              <Wand2 size={13} /> Generar descripción genérica (ES + EN)
            </button>
          </div>
        )}
        <div className="max-w-screen-2xl mx-auto mt-3 flex gap-1">
          {([
            ["grid", "Fotos", LayoutGrid],
            ["editor", "Editor 360", Pencil],
            ["settings", "Ajustes del tour", Settings2],
          ] as [View, string, typeof LayoutGrid][]).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => k !== view && guard(() => setView(k), true)}
              disabled={k === "editor" && !scenes.length}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40",
                view === k
                  ? "bg-[#F0A030] text-[#0F2B4C]"
                  : isEditor ? "text-white/70 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && !savingAll && setPendingAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tienes cambios sin guardar</DialogTitle>
            <DialogDescription>
              {dirty && "Nombre, descripción o ajustes del tour. "}
              {sceneGuard.current?.describe()}
              ¿Quieres guardarlos antes de continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" disabled={savingAll} onClick={() => setPendingAction(null)}>Cancelar</Button>
            <Button
              variant="outline"
              disabled={savingAll}
              onClick={() => {
                const act = pendingAction;
                sceneGuard.current?.discard();
                setForm(tour);
                setPendingAction(null);
                act?.();
              }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Salir sin guardar
            </Button>
            <Button
              disabled={savingAll}
              onClick={async () => {
                const act = pendingAction;
                if (await saveAll()) {
                  setPendingAction(null);
                  act?.();
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {savingAll ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
              Guardar y continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {uploadMsg && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 bg-[#0F2B4C] text-white px-4 py-3 rounded-xl shadow-xl text-xs">
          <Loader2 size={15} className="animate-spin" /> {uploadMsg}
        </div>
      )}

      {view === "grid" && (
        <PhotoGrid
          scenes={scenes}
          startId={form.start_scene_id}
          busy={!!uploadMsg}
          onAdd={addFiles}
          onRename={(id, patch) => updateScene(id, patch)}
          onDelete={deleteScenes}
          onReorder={reorder}
          onStart={setStart}
          onOpen={(id) => {
            setCurrentId(id);
            setView("editor");
          }}
        />
      )}
      {view === "editor" && currentId && (
        <SceneEditor
          scenes={scenes}
          hotspots={hotspots}
          setHotspots={setHotspots}
          currentId={currentId}
          setCurrentId={setCurrentId}
          startId={form.start_scene_id}
          onStart={setStart}
          onUpdateScene={updateScene}
          onDelete={(id) => deleteScenes([id])}
          busy={!!uploadMsg}
          otherTours={allTours.filter((t) => t.id !== tour.id)}
          nadir={{ enabled: form.nadir_logo, size: form.nadir_size, opacity: form.nadir_opacity }}
          onNadir={updateTourLive}
          onReplace={replacePhoto}
          onApplyFilters={applySceneFilters}
          onClearFilters={clearSceneFilters}
          onDownload={downloadPhoto}
          onMove={moveScene}
          onGrid={() => guard(() => setView("grid"), true)}
          guard={(fn) => guard(fn, true)}
          registerGuard={(g) => (sceneGuard.current = g)}
        />
      )}
      {view === "settings" && <TourSettings form={form} setForm={setForm} onSave={saveForm} dirty={dirty} onDelete={deleteTour} />}
    </div>
  );
}

// ── Cuadrícula de fotos ──────────────────────────────────────────────────────
function PhotoGrid({ scenes, startId, busy, onAdd, onRename, onDelete, onReorder, onStart, onOpen }: {
  scenes: TourScene[];
  startId: string | null;
  busy: boolean;
  onAdd(files: File[]): void;
  onRename(id: string, patch: Partial<TourScene>): void;
  onDelete(ids: string[]): void;
  onReorder(next: TourScene[]): void;
  onStart(s: TourScene): void;
  onOpen(id: string): void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = scenes.findIndex((s) => s.id === e.active.id);
    const to = scenes.findIndex((s) => s.id === e.over!.id);
    onReorder(arrayMove(scenes, from, to));
  }

  function sortBy(kind: "name" | "date") {
    const next = [...scenes].sort((a, b) =>
      kind === "name" ? a.title.localeCompare(b.title, "es", { numeric: true }) : a.created_at.localeCompare(b.created_at)
    );
    onReorder(next);
  }

  return (
    <div
      className="px-3 sm:px-6 py-4 max-w-screen-2xl mx-auto"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragOver(false);
        if (!busy) onAdd(Array.from(e.dataTransfer.files));
      }}
    >
      <datalist id="tour-areas">
        {AREA_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
      </datalist>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          onAdd(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-gray-500">
        <span>{scenes.length} fotos</span>
        <span className="flex items-center gap-2">
          Ordenar por:
          <button onClick={() => sortBy("name")} className="font-semibold text-gray-700 hover:text-[#b8761a]">Nombre</button>
          <button onClick={() => sortBy("date")} className="font-semibold text-gray-700 hover:text-[#b8761a]">Fecha</button>
        </span>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-1 font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">
          <UploadCloud size={15} /> Añadir fotos
        </button>
        {selected.length > 0 && (
          <>
            <button onClick={() => setSelected([])} className="text-gray-500 hover:text-gray-700">Quitar selección</button>
            <button
              onClick={() => {
                onDelete(selected);
                setSelected([]);
              }}
              className="flex items-center gap-1 font-semibold text-red-600 hover:text-red-700"
            >
              <X size={13} /> Borrar seleccionadas ({selected.length})
            </button>
          </>
        )}
        <span className="text-gray-400">Arrastra las fotos para cambiar el orden · ★ = escena inicial y portada · Escribe el área de cada foto: se verá "Nombre (Área)"</span>
      </div>

      {scenes.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className={cn(
            "w-full py-20 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3 transition-colors",
            dragOver ? "border-[#F0A030] bg-amber-50" : "border-gray-300 bg-white hover:border-[#F0A030]"
          )}
        >
          <UploadCloud size={40} className="text-[#F0A030]" />
          <span className="font-semibold text-[#0F2B4C]">Arrastra aquí tus fotos 360 o haz clic para elegirlas</span>
          <span className="text-xs text-gray-500">Fotos equirectangulares (2:1) de tu cámara 360 · JPG, PNG o WebP</span>
        </button>
      ) : (
        <div className={cn("rounded-2xl transition-colors", dragOver && "ring-2 ring-[#F0A030] bg-amber-50/50")}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={scenes.map((s) => s.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {scenes.map((s) => (
                  <SceneCard
                    key={s.id}
                    scene={s}
                    isStart={s.id === startId}
                    selected={selected.includes(s.id)}
                    onSelect={(v) => setSelected((x) => (v ? [...x, s.id] : x.filter((y) => y !== s.id)))}
                    onRename={(patch) => onRename(s.id, patch)}
                    onStart={() => onStart(s)}
                    onOpen={() => onOpen(s.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SceneCard({ scene, isStart, selected, onSelect, onRename, onStart, onOpen }: {
  scene: TourScene;
  isStart: boolean;
  selected: boolean;
  onSelect(v: boolean): void;
  onRename(patch: Partial<TourScene>): void;
  onStart(): void;
  onOpen(): void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
  const [title, setTitle] = useState(scene.title);
  const [area, setArea] = useState(scene.area ?? "");
  useEffect(() => setTitle(scene.title), [scene.title]);
  useEffect(() => setArea(scene.area ?? ""), [scene.area]);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("bg-white rounded-xl border overflow-hidden shadow-sm", selected ? "border-red-400 ring-2 ring-red-200" : "border-gray-200", isDragging && "opacity-60 z-10")}
    >
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border-b border-gray-100">
        <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 p-0.5" aria-label="Arrastrar para ordenar">
          <GripVertical size={14} />
        </button>
        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} className="accent-red-500" aria-label="Seleccionar" />
        <button onClick={onStart} title="Escena inicial y portada" className={cn("ml-auto p-0.5", isStart ? "text-[#F0A030]" : "text-gray-300 hover:text-[#F0A030]")}>
          <Star size={15} fill={isStart ? "currentColor" : "none"} />
        </button>
        <button onClick={onOpen} title="Editar en 360" className="p-0.5 text-gray-400 hover:text-[#0F2B4C]">
          <Pencil size={14} />
        </button>
      </div>
      <button onClick={onOpen} className="block w-full">
        <PanoThumb src={scene.thumb_url} yaw={scene.initial_yaw} pitch={scene.initial_pitch} fov={scene.fov_initial} className="bg-gray-100" />
      </button>
      <div className="px-2.5 py-1.5 text-xs">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() !== scene.title && onRename({ title: title.trim() })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Nombre"
          className="w-full font-medium text-gray-700 border-0 focus:outline-none focus:bg-amber-50 rounded px-0.5"
        />
        <div className="flex items-center gap-0.5">
        <span className="text-gray-400">(</span>
        <input
          value={area}
          list="tour-areas"
          onChange={(e) => setArea(e.target.value)}
          onBlur={() => area.trim() !== (scene.area ?? "") && onRename({ area: area.trim() || null })}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Área: Entrada, Sala…"
          className={cn("min-w-0 flex-1 border-0 focus:outline-none focus:bg-amber-50 rounded px-0.5", area ? "text-[#b8761a] font-semibold" : "placeholder:text-red-300")}
        />
        <span className="text-gray-400">)</span>
        </div>
      </div>
    </div>
  );
}

// ── Herramientas de foto (estilo Kuula) ─────────────────────────────────────
const FILTER_LABELS: Record<keyof PanoFilters, { label: string; min: number }> = {
  brightness: { label: "Brillo", min: -100 },
  contrast: { label: "Contraste", min: -100 },
  saturation: { label: "Saturación", min: -100 },
  hdr: { label: "HDR (sombras y luces)", min: 0 },
  sharpness: { label: "Nitidez", min: 0 },
};

function normFilters(f: PanoFilters | null | undefined) {
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, f?.[k] ?? 0]));
}

// La foto mostrada ya puede tener filtros: la vista previa solo añade la diferencia
function relativePreview(next: PanoFilters, applied: PanoFilters | null | undefined) {
  const a = normFilters(applied);
  return cssPreview(Object.fromEntries(FILTER_KEYS.map((k) => [k, (next[k] ?? 0) - a[k]])) as PanoFilters);
}

function Slider({ label, value, min, max, step = 1, unit = "", onChange, onReset }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange(v: number): void;
  onReset?(): void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-white/70">
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <b className="text-white tabular-nums">{value}{unit}</b>
          {onReset && (
            <button onClick={onReset} className="text-white/40 hover:text-[#F0A030]" title="Restablecer">↺</button>
          )}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#F0A030] h-5"
      />
    </div>
  );
}

// Barra de zoom estilo Kuula: izquierda = lejos (gran angular), derecha = cerca.
// [ = límite para alejar (fov_max), ] = límite para acercar (fov_min), ● = zoom al entrar (fov_initial).
const FOV_WIDE = 120;
const FOV_CLOSE = 10;
type ZoomHandle = "fov_max" | "fov_initial" | "fov_min";

function ZoomBar({ fovMax, fovMin, fovInitial, onChange }: {
  fovMax: number;
  fovMin: number;
  fovInitial: number;
  onChange(patch: Partial<Pick<TourScene, ZoomHandle>>): void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const toPct = (fov: number) => ((FOV_WIDE - fov) / (FOV_WIDE - FOV_CLOSE)) * 100;
  const fromX = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.round(FOV_WIDE - t * (FOV_WIDE - FOV_CLOSE));
  };
  function drag(handle: ZoomHandle, e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const fov = fromX(ev.clientX);
      if (handle === "fov_max") onChange({ fov_max: Math.max(fov, fovInitial) });
      else if (handle === "fov_min") onChange({ fov_min: Math.min(fov, fovInitial) });
      else onChange({ fov_initial: Math.min(fovMax, Math.max(fovMin, fov)) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  const zoomX = (fov: number) => (fovMax / fov).toFixed(1); // aumento relativo al más alejado
  return (
    <div className="select-none">
      <div ref={trackRef} className="relative h-8 mx-2 select-none touch-none">
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded bg-white/15" />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-[#F0A030]/60" style={{ left: `${toPct(fovMax)}%`, right: `${100 - toPct(fovMin)}%` }} />
        <button
          onPointerDown={(e) => drag("fov_max", e)}
          title={`Alejar hasta ${fovMax}°`}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-6 text-xl font-light text-white cursor-ew-resize touch-none"
          style={{ left: `${toPct(fovMax)}%` }}
        >
          [
        </button>
        <button
          onPointerDown={(e) => drag("fov_min", e)}
          title={`Acercar hasta ${fovMin}°`}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-6 text-xl font-light text-white cursor-ew-resize touch-none"
          style={{ left: `${toPct(fovMin)}%` }}
        >
          ]
        </button>
        <button
          onPointerDown={(e) => drag("fov_initial", e)}
          title={`Zoom inicial ${fovInitial}°`}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#F0A030] cursor-ew-resize touch-none shadow"
          style={{ left: `${toPct(fovInitial)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/50 px-1">
        <span>Lejos</span>
        <span className="text-white/70">
          Inicial {fovInitial}° · máx. {zoomX(fovMin)}×
        </span>
        <span>Cerca</span>
      </div>
    </div>
  );
}


// ── Editor 360 de una escena ─────────────────────────────────────────────────
type PresetKey = keyof typeof PRESETS;

/** Lo que el editor 360 tiene sin guardar (addon abierto o filtros sin aplicar) */
interface SceneGuard {
  isDirty(): boolean;
  describe(): string;
  save(): Promise<boolean>;
  discard(): void;
}
const PLACE_LABEL: Record<PresetKey, string> = {
  arrow: "la flecha",
  info: "el punto de info",
  icon: "el ícono",
  text: "el texto",
  image: "la imagen",
};

// Imagen propia para un addon: se reduce (máx. 1024 px) y se guarda junto a las fotos del tour
async function prepareAddonImage(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml") return file;
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return canvasToBlob(c, 0.9);
}

function addonSummary(h: TourHotspot, titles: Map<string, string>) {
  const what = h.kind === "text" ? `"${(h.style?.label ?? "Texto").slice(0, 24)}"` : h.kind === "image" ? "Imagen" : ICONS[h.icon ?? ""]?.label ?? "Ícono";
  const act =
    h.action === "scene" ? ` → ${titles.get(h.target_scene_id ?? "") ?? "?"}` : h.action === "card" ? " · tarjeta" : h.action === "url" ? " · enlace" : "";
  return what + act;
}

function SceneEditor({
  scenes, hotspots, setHotspots, currentId, setCurrentId, startId, onStart, onUpdateScene, onDelete, onGrid,
  busy, otherTours, nadir, onNadir, onReplace, onApplyFilters, onClearFilters, onDownload, onMove, guard, registerGuard,
}: {
  guard(action: () => void): void;
  registerGuard(g: SceneGuard | null): void;
  busy: boolean;
  otherTours: Tour[];
  nadir: { enabled: boolean; size: number; opacity: number };
  onNadir(patch: Partial<Tour>): void;
  onReplace(s: TourScene, file: File): void;
  onApplyFilters(s: TourScene, f: PanoFilters): Promise<void> | void;
  onClearFilters(s: TourScene): void;
  onDownload(s: TourScene): void;
  onMove(s: TourScene, tourId: string): void;
  scenes: TourScene[];
  hotspots: TourHotspot[];
  setHotspots: React.Dispatch<React.SetStateAction<TourHotspot[]>>;
  currentId: string;
  setCurrentId(id: string): void;
  startId: string | null;
  onStart(s: TourScene): void;
  onUpdateScene(id: string, patch: Partial<TourScene>, debounce?: boolean): void;
  onDelete(id: string): void;
  onGrid(): void;
}) {
  const scene = scenes.find((s) => s.id === currentId) ?? scenes[0];
  const [placing, setPlacing] = useState<PresetKey | null>(null);
  const [editing, setEditing] = useState<TourHotspot | null>(null);
  const [savingAddon, setSavingAddon] = useState(false);
  const [title, setTitle] = useState(scene.title);
  const [heading, setHeading] = useState({ x: round1(scene.initial_yaw * DEG), y: round1(scene.initial_pitch * DEG) });
  const apiRef = useRef<EditorViewerApi | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const sceneAddons = useMemo(() => addonsForScene(hotspots, scene.id), [hotspots, scene.id]);
  const titles = useMemo(() => new Map(scenes.map((s) => [s.id, s.area?.trim() || s.title || "Escena"])), [scenes]);
  const [pickingStart, setPickingStart] = useState(false);
  const [area, setArea] = useState(scene.area ?? "");
  useEffect(() => setArea(scene.area ?? ""), [scene.area]);
  const [areaEn, setAreaEn] = useState(scene.area_en ?? "");
  useEffect(() => setAreaEn(scene.area_en ?? ""), [scene.area_en, scene.id]);
  const stripRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"puntos" | "foto">("puntos");
  const [filters, setFilters] = useState<PanoFilters>(scene.filters ?? {});
  const filtersDirty = JSON.stringify(normFilters(filters)) !== JSON.stringify(normFilters(scene.filters));

  useEffect(() => {
    setFilters(scene.filters ?? {});
  }, [scene.id, scene.image_url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTitle(scene.title);
    setHeading({ x: round1(scene.initial_yaw * DEG), y: round1(scene.initial_pitch * DEG) });
    stripRef.current?.querySelector(`[data-id="${scene.id}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [scene.id, scene.title, scene.initial_yaw, scene.initial_pitch]);

  useEffect(() => {
    setEditing(null);
    setPlacing(null);
  }, [scene.id]);

  function defaultTarget() {
    const linked = new Set(sceneAddons.map((h) => h.target_scene_id));
    const i = scenes.findIndex((s) => s.id === scene.id);
    const ordered = [...scenes.slice(i + 1), ...scenes.slice(0, i)];
    return (ordered.find((s) => !linked.has(s.id)) ?? ordered[0])?.id ?? null;
  }

  function onPanoClick(pos: { yaw: number; pitch: number }) {
    if (pickingStart) {
      saveHeading(pos.yaw * DEG, pos.pitch * DEG);
      apiRef.current?.lookAt(pos);
      setPickingStart(false);
      toast({ title: "Punto de inicio guardado", description: "Al entrar a esta foto se mirará hacia ahí." });
      return;
    }
    if (placing) {
      const preset = PRESETS[placing];
      setEditing({
        id: "new",
        scene_id: scene.id,
        kind: preset.kind ?? "icon",
        icon: preset.icon ?? null,
        image_url: null,
        image_path: null,
        action: preset.action ?? "none",
        target_scene_id: preset.action === "scene" ? defaultTarget() : null,
        url: null,
        title: null,
        text: null,
        yaw: pos.yaw,
        pitch: pos.pitch,
        style: { ...preset.style },
        master: false,
        hide_in: [],
      });
      setPlacing(null);
      setTab("puntos");
    } else if (editing) {
      setEditing({ ...editing, ...pos }); // mover el addon que se está editando
    }
  }

  function editAddon(h: TourHotspot) {
    setPlacing(null);
    setTab("puntos");
    setEditing({ ...h, style: { ...h.style }, hide_in: [...(h.hide_in ?? [])] });
  }

  async function uploadAddonImage(file: File) {
    try {
      const blob = await prepareAddonImage(file);
      const ext = blob.type === "image/svg+xml" ? "svg" : extOf(blob);
      if (ext === "svg" && tourStorage.name.startsWith("Cloudflare")) throw new Error("Usa PNG o WebP para íconos propios");
      const up = await tourStorage.upload(`${scene.tour_id}/a-${crypto.randomUUID()}.${ext}`, blob);
      return { url: up.url, path: up.path };
    } catch (e) {
      fail("No se pudo subir la imagen", e);
      return null;
    }
  }

  async function saveAddon(): Promise<boolean> {
    if (!editing) return true;
    if (editing.action === "scene" && !editing.target_scene_id) {
      toast({ title: "Elige a qué foto lleva", variant: "destructive" });
      return false;
    }
    if (editing.kind === "image" && !editing.image_url) {
      toast({ title: "Elige una imagen", variant: "destructive" });
      return false;
    }
    const { id, ...row } = editing;
    setSavingAddon(true);
    const isNew = id === "new";
    const prev = hotspots.find((h) => h.id === id);
    const q = isNew ? db.from("tour_hotspots").insert(row) : db.from("tour_hotspots").update(row).eq("id", id);
    let data: TourHotspot | null = null;
    let error: unknown = null;
    try {
      ({ data, error } = await withTimeout<{ data: TourHotspot | null; error: unknown }>(q.select().single(), DB_TIMEOUT));
    } catch (e) {
      error = e;
    }
    setSavingAddon(false);
    if (error) {
      fail("No se pudo guardar", error);
      return false;
    }
    const saved = data!;
    setHotspots((h) => (isNew ? [...h, saved] : h.map((x) => (x.id === id ? saved : x))));
    if (prev?.image_path && prev.image_path !== saved.image_path) tourStorage.remove([prev.image_path]).catch(() => undefined);
    setEditing(null);
    toast({ title: "Guardado" });
    return true;
  }

  // Registrar lo pendiente de esta pantalla para el aviso de "cambios sin guardar"
  const addonDirty =
    !!editing && (editing.id === "new" || JSON.stringify(editing) !== JSON.stringify(hotspots.find((h) => h.id === editing.id)));
  const guardState = useRef({ addonDirty, filtersDirty, saveAddon, filters, scene, cancelEditing: () => {} });
  guardState.current = { addonDirty, filtersDirty, saveAddon, filters, scene, cancelEditing: () => cancelEditing() };
  useEffect(() => {
    registerGuard({
      isDirty: () => guardState.current.addonDirty || guardState.current.filtersDirty,
      describe: () =>
        [guardState.current.addonDirty && "Un addon sin guardar. ", guardState.current.filtersDirty && "Filtros sin aplicar. "].filter(Boolean).join(""),
      save: async () => {
        const g = guardState.current;
        if (g.addonDirty && !(await g.saveAddon())) return false;
        if (g.filtersDirty) await onApplyFilters(g.scene, g.filters);
        return true;
      },
      discard: () => {
        guardState.current.cancelEditing();
        setFilters(guardState.current.scene.filters ?? {});
      },
    });
    return () => registerGuard(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteAddon(h: TourHotspot) {
    if (h.master && !confirm("Este addon es master: se borrará de todas las fotos. ¿Seguir?")) return;
    const { error } = await db.from("tour_hotspots").delete().eq("id", h.id);
    if (error) return fail("No se pudo borrar", error);
    setHotspots((list) => list.filter((x) => x.id !== h.id));
    if (h.image_path) tourStorage.remove([h.image_path]).catch(() => undefined);
    if (editing?.id === h.id) setEditing(null);
  }

  function cancelEditing() {
    // Imagen subida para un addon que no se guardó
    const saved = hotspots.find((h) => h.id === editing?.id);
    if (editing?.image_path && editing.image_path !== saved?.image_path) tourStorage.remove([editing.image_path]).catch(() => undefined);
    setEditing(null);
  }

  function saveHeading(x: number, y: number) {
    setHeading({ x: round1(x), y: round1(y) });
    onUpdateScene(scene.id, { initial_yaw: x / DEG, initial_pitch: Math.max(-90, Math.min(90, y)) / DEG });
  }



  const panelInput = "bg-white/10 border-white/15 text-white placeholder:text-white/40";

  return (
    <div className="text-white">
      <div className="flex flex-col lg:flex-row">
        {/* Panorama */}
        <div className={cn("relative flex-1 h-[55vh] lg:h-[calc(100vh-200px)] min-h-[320px] bg-black", (placing || pickingStart) && "ce-placing")}>
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-white/60"><Loader2 className="animate-spin mr-2" size={18} /> Cargando visor…</div>}>
            <TourEditorViewer
              scene={scene}
              addons={sceneAddons}
              sceneTitles={titles}
              editing={editing}
              onPanoClick={onPanoClick}
              onAddonClick={editAddon}
              onAddonMoved={(pos) => setEditing((e) => (e ? { ...e, ...pos } : e))}
              onApi={(a) => (apiRef.current = a)}
              nadir={nadir}
              start={{ yaw: scene.initial_yaw, pitch: scene.initial_pitch }}
              cssFilter={filtersDirty ? relativePreview(filters, scene.filters) : undefined}
            />
          </Suspense>
          <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-2">
            <button
              onClick={() => { setPlacing(null); setPickingStart((v) => !v); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow", pickingStart ? "bg-[#F0A030] text-[#0F2B4C]" : "bg-black/60 hover:bg-black/80")}
            >
              <Crosshair size={13} /> Punto de inicio
            </button>
            <button
              onClick={() => apiRef.current?.lookAt({ yaw: scene.initial_yaw, pitch: scene.initial_pitch, fov: scene.fov_initial })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/60 text-xs font-semibold hover:bg-black/80"
            >
              <Eye size={13} /> Ir al inicio
            </button>
          </div>
          {pickingStart && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#F0A030] text-[#0F2B4C] font-semibold text-xs px-4 py-2 rounded-full shadow-lg">
              <Crosshair size={14} /> Haz clic en el punto hacia donde debe mirar al entrar
              <button onClick={() => setPickingStart(false)} className="ml-1"><X size={14} /></button>
            </div>
          )}
          {placing && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#F0A030] text-[#0F2B4C] font-semibold text-xs px-4 py-2 rounded-full shadow-lg">
              <Crosshair size={14} /> Haz clic en la foto donde va {PLACE_LABEL[placing]}
              <button onClick={() => setPlacing(null)} className="ml-1"><X size={14} /></button>
            </div>
          )}
          <button onClick={onGrid} className="absolute bottom-14 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/60 text-xs font-semibold hover:bg-black/80">
            <LayoutGrid size={13} /> Cuadrícula
          </button>
        </div>

        {/* Panel derecho */}
        <aside className="w-full lg:w-80 shrink-0 bg-[#0b1220] border-l border-white/10 p-4 space-y-5 lg:h-[calc(100vh-200px)] lg:overflow-y-auto">
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {([["puntos", "Addons"], ["foto", "Foto"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn("flex-1 rounded-md py-1.5 text-xs font-bold uppercase tracking-wider", tab === k ? "bg-[#F0A030] text-[#0F2B4C]" : "text-white/60 hover:text-white")}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "puntos" && (
          <>
          {editing ? (
            <AddonPanel
              addon={editing}
              onChange={setEditing}
              scenes={scenes}
              sceneId={scene.id}
              busy={savingAddon}
              onSave={saveAddon}
              onDelete={() => deleteAddon(editing)}
              onCancel={cancelEditing}
              onUploadImage={uploadAddonImage}
            />
          ) : (
          <>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Añadir</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => setPlacing("arrow")} className={cn("bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]", placing === "arrow" && "ring-2 ring-white")}>
                <Navigation size={14} className="mr-1.5" /> Flecha
              </Button>
              <Button size="sm" onClick={() => setPlacing("info")} className={cn("bg-white text-[#0F2B4C] hover:bg-gray-100", placing === "info" && "ring-2 ring-[#F0A030]")}>
                <Info size={14} className="mr-1.5" /> Info
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {([["icon", "Ícono", Crosshair], ["text", "Texto", Type], ["image", "Imagen", ImageIcon]] as const).map(([k, label, Icon]) => (
                <Button key={k} size="sm" variant="ghost" onClick={() => setPlacing(k)} className={cn("bg-white/10 text-white hover:bg-white/20 hover:text-white", placing === k && "ring-2 ring-[#F0A030]")}>
                  <Icon size={14} className="mr-1" /> {label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-white/40">Elige uno y haz clic en la foto donde va. Toca un addon en la foto para editarlo o arrastrarlo.</p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">En esta foto ({sceneAddons.length})</h3>
            {sceneAddons.length === 0 ? (
              <p className="text-[11px] text-white/40">Ninguno todavía.</p>
            ) : (
              <ul className="space-y-1">
                {sceneAddons.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs bg-white/5">
                    <span className="w-4 h-4 shrink-0" dangerouslySetInnerHTML={{ __html: h.kind === "icon" ? iconSvg(h.icon ?? "target", "#F0A030") : "" }} />
                    {h.kind === "text" && <Type size={12} className="shrink-0 -ml-5" />}
                    {h.kind === "image" && <ImageIcon size={12} className="shrink-0 -ml-5" />}
                    <button onClick={() => editAddon(h)} className="flex-1 text-left truncate hover:underline">
                      {addonSummary(h, titles)}
                      {h.master && <span className="ml-1 text-[9px] font-bold text-[#F0A030]">MASTER</span>}
                    </button>
                    {h.action === "scene" && h.target_scene_id && (
                      <button onClick={() => guard(() => setCurrentId(h.target_scene_id!))} title="Ir a esa foto" className="text-white/40 hover:text-[#F0A030]"><Navigation size={12} /></button>
                    )}
                    <button onClick={() => deleteAddon(h)} className="text-white/40 hover:text-red-400"><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </>
          )}
          </>
          )}

          {tab === "foto" && (
          <>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Nombre y área</h3>
            <div className="flex items-center gap-1.5">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() !== scene.title && onUpdateScene(scene.id, { title: title.trim() })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Nombre"
                className={cn("h-8 text-xs flex-1", panelInput)}
              />
              <Input
                value={area}
                list="tour-areas-editor"
                onChange={(e) => setArea(e.target.value)}
                onBlur={() => area.trim() !== (scene.area ?? "") && onUpdateScene(scene.id, { area: area.trim() || null })}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                placeholder="Área (Entrada…)"
                className={cn("h-8 text-xs flex-1", panelInput)}
              />
              <datalist id="tour-areas-editor">
                {AREA_SUGGESTIONS.map((a) => <option key={a} value={a} />)}
              </datalist>
            </div>
            <Input
              value={areaEn}
              onChange={(e) => setAreaEn(e.target.value)}
              onBlur={() => areaEn.trim() !== (scene.area_en ?? "") && onUpdateScene(scene.id, { area_en: areaEn.trim() || null })}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              placeholder={`Inglés: ${(area.trim() && translateArea(area)) || "escríbelo (ej. Living room)"}`}
              className={cn("h-8 text-xs mt-1.5", panelInput)}
            />
            <p className="mt-1 text-[11px] text-white/40">
              Se verá como: <b className="text-white/70">{sceneLabel({ title, area })}</b>
              {area.trim() && <> · EN: <b className="text-white/70">{sceneLabel({ title, area, area_en: areaEn }, "en")}</b></>}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Vista inicial</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/50">X</span>
              <Input type="number" step="1" value={heading.x} onChange={(e) => setHeading({ ...heading, x: Number(e.target.value) })} onBlur={() => saveHeading(heading.x, heading.y)} className={cn("h-8 w-20 text-xs", panelInput)} />
              <span className="text-white/50">Y</span>
              <Input type="number" step="1" value={heading.y} onChange={(e) => setHeading({ ...heading, y: Number(e.target.value) })} onBlur={() => saveHeading(heading.x, heading.y)} className={cn("h-8 w-20 text-xs", panelInput)} />
            </div>
            <div className="flex gap-3 mt-2 text-xs">
              <button
                onClick={() => {
                  const p = apiRef.current?.getPosition();
                  if (p) {
                    saveHeading(p.yaw * DEG, p.pitch * DEG);
                    onUpdateScene(scene.id, { fov_initial: Math.round(apiRef.current!.getFov()) });
                    toast({ title: "Vista inicial guardada (dirección y zoom)" });
                  }
                }}
                className="font-semibold text-[#F0A030] hover:underline"
              >
                Usar la vista actual
              </button>
              <button
                onClick={() => apiRef.current?.lookAt({ yaw: scene.initial_yaw, pitch: scene.initial_pitch, fov: scene.fov_initial })}
                className="font-semibold text-white/60 hover:text-white hover:underline"
              >
                Ir a la vista inicial
              </button>
            </div>
            <p className="mt-1 text-[11px] text-white/40">Hacia dónde mira la cámara al entrar (grados). También puedes usar el botón "Punto de inicio" sobre la foto.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Zoom</h3>
            <ZoomBar
              fovMax={scene.fov_max}
              fovMin={scene.fov_min}
              fovInitial={scene.fov_initial}
              onChange={(patch) => {
                onUpdateScene(scene.id, patch, true);
                if (patch.fov_initial != null) apiRef.current?.lookAt({ ...apiRef.current.getPosition(), fov: patch.fov_initial });
              }}
            />
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => {
                  const f = apiRef.current?.getFov();
                  if (f != null) onUpdateScene(scene.id, { fov_initial: Math.round(f) });
                }}
                className="font-semibold text-[#F0A030] hover:underline"
              >
                Usar el zoom actual
              </button>
              <button onClick={() => onUpdateScene(scene.id, { fov_min: 30, fov_max: 120, fov_initial: 110 })} className="text-white/60 hover:text-white hover:underline">
                Restablecer
              </button>
            </div>
            <p className="text-[11px] text-white/40">Corchetes = hasta dónde se puede alejar [ y acercar ]. Punto = zoom al entrar.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Límite vertical</h3>
            <Slider label="Mirar arriba/abajo hasta" value={scene.pitch_limit} min={0} max={90} unit="°" onChange={(v) => onUpdateScene(scene.id, { pitch_limit: v }, true)} onReset={() => onUpdateScene(scene.id, { pitch_limit: 90 })} />
            <p className="text-[11px] text-white/40">90° = sin límite. Útil para no mostrar el techo o el trípode.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Nivelación</h3>
            <Slider label="Girar (horizonte torcido)" value={round1(scene.correction_roll)} min={-15} max={15} step={0.1} unit="°" onChange={(v) => onUpdateScene(scene.id, { correction_roll: v }, true)} onReset={() => onUpdateScene(scene.id, { correction_roll: 0 })} />
            <Slider label="Inclinar adelante/atrás" value={round1(scene.correction_tilt)} min={-15} max={15} step={0.1} unit="°" onChange={(v) => onUpdateScene(scene.id, { correction_tilt: v }, true)} onReset={() => onUpdateScene(scene.id, { correction_tilt: 0 })} />
            <p className="text-[11px] text-white/40">Endereza columnas y puertas que salen inclinadas.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Filtros</h3>
            {FILTER_KEYS.map((k) => (
              <Slider
                key={k}
                label={FILTER_LABELS[k].label}
                value={filters[k] ?? 0}
                min={FILTER_LABELS[k].min}
                max={100}
                onChange={(v) => setFilters({ ...filters, [k]: v })}
                onReset={() => setFilters({ ...filters, [k]: 0 })}
              />
            ))}
            <p className="text-[11px] text-white/40">Vista previa aproximada; la nitidez solo se ve al aplicar. Se guarda la original para poder cambiarlos.</p>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy || !filtersDirty} onClick={() => onApplyFilters(scene, filters)} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                Aplicar filtros
              </Button>
              {(hasFilters(scene.filters) || filtersDirty) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => (hasFilters(scene.filters) ? onClearFilters(scene) : setFilters(scene.filters ?? {}))}
                  className="text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {hasFilters(scene.filters) ? "Quitar" : "Deshacer"}
                </Button>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Logo en el suelo</h3>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <Switch checked={nadir.enabled} onCheckedChange={(v) => onNadir({ nadir_logo: v })} />
              Tapar el trípode con el logo (todo el tour)
            </label>
            {nadir.enabled && (
              <>
                <Slider label="Tamaño" value={nadir.size} min={5} max={45} unit="°" onChange={(v) => onNadir({ nadir_size: v })} onReset={() => onNadir({ nadir_size: 22 })} />
                <Slider label="Opacidad" value={nadir.opacity} min={10} max={100} unit="%" onChange={(v) => onNadir({ nadir_opacity: v })} onReset={() => onNadir({ nadir_opacity: 100 })} />
              </>
            )}
            <button
              onClick={() => apiRef.current?.lookAt({ yaw: apiRef.current.getPosition().yaw, pitch: -Math.PI / 2 })}
              className="text-xs font-semibold text-[#F0A030] hover:underline"
            >
              Mirar al suelo
            </button>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Foto</h3>
            <input
              ref={replaceRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onReplace(scene, f);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => replaceRef.current?.click()} className="justify-start text-white/80 hover:bg-white/10 hover:text-white">
                <RefreshCw size={14} className="mr-2" /> Reemplazar
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDownload(scene)} className="justify-start text-white/80 hover:bg-white/10 hover:text-white">
                <Download size={14} className="mr-2" /> Descargar
              </Button>
            </div>
            {otherTours.length > 0 && (
              <div className="flex items-center gap-2">
                <MoveRight size={14} className="text-white/60 shrink-0" />
                <select
                  value=""
                  disabled={busy}
                  onChange={(e) => e.target.value && onMove(scene, e.target.value)}
                  className="flex-1 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-xs [&>option]:text-black"
                >
                  <option value="">Mover a otro tour…</option>
                  {otherTours.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <Button size="sm" variant="ghost" onClick={() => onStart(scene)} disabled={scene.id === startId} className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white">
              <Star size={14} className="mr-2" fill={scene.id === startId ? "#F0A030" : "none"} color="#F0A030" />
              {scene.id === startId ? "Es la escena inicial y portada" : "Usar como escena inicial y portada"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(scene.id)} className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300">
              <Trash2 size={14} className="mr-2" /> Borrar esta foto
            </Button>
          </section>
          </>
          )}
        </aside>
      </div>

      {/* Tira de miniaturas */}
      <div ref={stripRef} className="flex gap-2 overflow-x-auto px-3 py-2 bg-black/60 border-t border-white/10" style={{ scrollbarWidth: "thin" }}>
        {scenes.map((s) => (
          <button
            key={s.id}
            data-id={s.id}
            onClick={() => s.id !== scene.id && guard(() => setCurrentId(s.id))}
            title={sceneLabel(s)}
            className={cn("relative shrink-0 w-16 rounded overflow-hidden border-2", s.id === scene.id ? "border-[#F0A030]" : "border-transparent opacity-70 hover:opacity-100")}
          >
            <PanoThumb src={s.thumb_url} yaw={s.initial_yaw} pitch={s.initial_pitch} fov={s.fov_initial} />
            {s.id === startId && <Star size={11} className="absolute top-0.5 left-0.5 text-[#F0A030]" fill="currentColor" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Ajustes del tour ─────────────────────────────────────────────────────────
function TourSettings({ form, setForm, onSave, dirty, onDelete }: {
  form: Tour;
  setForm(t: Tour): void;
  onSave(): void;
  dirty: boolean;
  onDelete(): void;
}) {
  const field = "block text-xs font-semibold text-gray-600 mb-1";
  return (
    <div className="px-3 sm:px-6 py-5 max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div>
          <label className={field}>Enlace del tour</label>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="shrink-0">canaescapes.com/tour/</span>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="h-8 text-xs" />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Si lo cambias, los enlaces que ya enviaste dejan de funcionar.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={field}>Propiedad</label>
            <Input value={form.property_name ?? ""} onChange={(e) => setForm({ ...form, property_name: e.target.value || null })} placeholder="ej. Villa Cocotal 135" />
          </div>
          <div>
            <label className={field}>Ubicación</label>
            <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value || null })} placeholder="ej. Cocotal, Bávaro" />
          </div>
          <div>
            <label className={field}>Habitaciones</label>
            <Input type="number" min={0} value={form.bedrooms ?? ""} onChange={(e) => setForm({ ...form, bedrooms: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
          <div>
            <label className={field}>Baños</label>
            <Input type="number" min={0} step="0.5" value={form.bathrooms ?? ""} onChange={(e) => setForm({ ...form, bathrooms: e.target.value === "" ? null : Number(e.target.value) })} />
          </div>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={form.autorotate} onCheckedChange={(v) => setForm({ ...form, autorotate: v })} />
          Girar solo cuando nadie lo toca (autorrotación)
        </label>
        <Button onClick={onSave} disabled={!dirty} className="bg-green-600 hover:bg-green-700 text-white">
          <Save size={14} className="mr-1.5" /> Guardar ajustes
        </Button>
      </div>
      <div className="bg-white rounded-xl border border-red-200 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-red-700">Borrar tour</p>
          <p className="text-xs text-gray-500">Borra el tour, sus puntos y todas sus fotos.</p>
        </div>
        <Button variant="destructive" onClick={onDelete}><Trash2 size={14} className="mr-1.5" /> Borrar</Button>
      </div>
    </div>
  );
}
