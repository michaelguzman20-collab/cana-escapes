import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ClipboardList, Download, ExternalLink, FileText, Loader2, Plus, Rotate3d, Trash2, UploadCloud, Check, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/tours";
import {
  INTAKE_SECTIONS, isChecks, isRow, isTable, picked, text, summaryOf, filledCount, readIntakePdf, uploadAttachment,
  attachmentUrl, removeAttachment, createDraftTour, type IntakeData, type TourIntake,
} from "@/lib/tourIntake";
import blankPdfUrl from "@/assets/ficha-cliente-tours360.pdf?url";

// Fichas de clientes de Tours 360: se llenan aquí mientras se habla con el cliente (PC, tableta o teléfono),
// o se sube el PDF rellenado en la tableta / una foto de la ficha en papel. Con "Crear tour en borrador"
// los datos pasan al tour y solo falta subir las fotos 360.

const SAVE_DELAY = 1200;

function fail(title: string, e: unknown) {
  console.error(title, e);
  toast({ title, description: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e), variant: "destructive" });
}

export function AdminTourIntakes() {
  const [list, setList] = useState<TourIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("tour_intakes").select("*").order("created_at", { ascending: false });
    if (error) fail("Error al cargar las fichas", error);
    setList(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function create(data: IntakeData = {}) {
    const { data: row, error } = await db.from("tour_intakes").insert({ data, ...summaryOf(data) }).select().single();
    if (error) throw error;
    setList((l) => [row, ...l]);
    return row as TourIntake;
  }

  // Sube un PDF rellenado (se leen sus campos) o una foto de la ficha en papel (queda al lado para copiar los datos)
  async function importFile(file: File) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf && !file.type.startsWith("image/")) return toast({ title: "Sube el PDF de la ficha o una foto (JPG, PNG)", variant: "destructive" });
    setBusy(true);
    try {
      let data: IntakeData = {};
      if (isPdf) data = (await readIntakePdf(file).catch(() => null)) ?? {};
      const intake = await create(data);
      const path = await uploadAttachment(intake.id, file);
      const { data: row, error } = await db
        .from("tour_intakes")
        .update({ attachment_path: path, attachment_type: file.type || (isPdf ? "application/pdf" : "image/jpeg") })
        .eq("id", intake.id)
        .select()
        .single();
      if (error) throw error;
      setList((l) => l.map((x) => (x.id === row.id ? row : x)));
      setOpenId(row.id);
      const n = filledCount(data);
      toast(
        n
          ? { title: `Ficha importada: ${n} campos leídos`, description: "Revisa los datos y pulsa \"Crear tour en borrador\"." }
          : { title: "Ficha guardada", description: isPdf ? "Este PDF no trae campos rellenables: copia los datos mirando el archivo." : "Copia los datos mirando la foto (queda guardada en la ficha)." },
      );
    } catch (e) {
      fail("No se pudo importar la ficha", e);
    }
    setBusy(false);
  }

  const open = list.find((x) => x.id === openId);
  if (open) {
    return (
      <IntakeEditor
        intake={open}
        onBack={() => {
          setOpenId(null);
          load();
        }}
        onChange={(row) => setList((l) => l.map((x) => (x.id === row.id ? row : x)))}
        onDeleted={() => {
          setOpenId(null);
          setList((l) => l.filter((x) => x.id !== open.id));
        }}
      />
    );
  }

  return (
    <div className="px-3 sm:px-6 pt-6 pb-8 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8]">
      <div className="max-w-screen-lg mx-auto space-y-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-[#0F2B4C]" />
            <div>
              <h1 className="text-xl font-bold text-[#0F2B4C]">Fichas de clientes · Tours 360</h1>
              <p className="text-xs text-gray-500">Llena la ficha mientras hablas con el cliente, o sube la ficha rellenada. Luego crea su tour en borrador.</p>
            </div>
          </div>
          <Link to="/admin/tours" className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]">
            <Rotate3d size={15} /> Ir a Tours 360
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const row = await create();
                setOpenId(row.id);
              } catch (e) {
                fail("No se pudo crear la ficha", e);
              }
              setBusy(false);
            }}
            className="flex items-center gap-3 rounded-xl bg-[#0F2B4C] text-white p-4 text-left hover:bg-[#173a63] disabled:opacity-60"
          >
            <Plus size={22} className="text-[#F0A030] shrink-0" />
            <span>
              <span className="block font-semibold">Nueva ficha</span>
              <span className="block text-xs text-white/70">Llénala aquí con el cliente</span>
            </span>
          </button>
          <button
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-4 text-left hover:shadow-md disabled:opacity-60"
          >
            {busy ? <Loader2 size={22} className="animate-spin text-[#F0A030] shrink-0" /> : <UploadCloud size={22} className="text-[#F0A030] shrink-0" />}
            <span>
              <span className="block font-semibold text-[#0F2B4C]">Subir ficha rellenada</span>
              <span className="block text-xs text-gray-500">PDF de la tableta (se lee solo) o foto de la ficha en papel</span>
            </span>
          </button>
          <a href={blankPdfUrl} download="Ficha-cliente-Tours360.pdf" className="flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-4 hover:shadow-md">
            <Download size={22} className="text-[#F0A030] shrink-0" />
            <span>
              <span className="block font-semibold text-[#0F2B4C]">Descargar ficha en blanco</span>
              <span className="block text-xs text-gray-500">PDF para la tableta o para imprimir</span>
            </span>
          </a>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importFile(f);
            }}
          />
        </div>

        {loading ? (
          <p className="text-gray-500 flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
            <ClipboardList size={34} className="mx-auto mb-3 text-gray-300" />
            Aún no hay fichas. Crea la primera arriba.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            {list.map((x) => (
              <button key={x.id} onClick={() => setOpenId(x.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50">
                <span className="w-9 h-9 rounded-full bg-[#0F2B4C]/5 text-[#0F2B4C] flex items-center justify-center shrink-0">
                  {x.attachment_type?.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#0F2B4C] truncate">{x.company || x.client_name || "Ficha sin nombre"}</span>
                  <span className="block text-xs text-gray-500 truncate">
                    {[x.property_name, x.client_name !== x.company ? x.client_name : null, new Date(x.created_at).toLocaleDateString("es-DO")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={cn("shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", x.tour_id ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                  {x.tour_id ? "Tour creado" : "Pendiente"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
function IntakeEditor({ intake, onBack, onChange, onDeleted }: {
  intake: TourIntake;
  onBack(): void;
  onChange(row: TourIntake): void;
  onDeleted(): void;
}) {
  const navigate = useNavigate();
  const [data, setData] = useState<IntakeData>(intake.data ?? {});
  const [saveState, setSaveState] = useState<"saved" | "pending" | "saving">("saved");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const timer = useRef<number>();
  const latest = useRef(data);
  latest.current = data;

  useEffect(() => {
    if (!intake.attachment_path) return;
    attachmentUrl(intake.attachment_path).then(setFileUrl).catch((e) => fail("No se pudo abrir el archivo de la ficha", e));
  }, [intake.attachment_path]);

  const save = useCallback(async (d: IntakeData) => {
    setSaveState("saving");
    const { data: row, error } = await db
      .from("tour_intakes")
      .update({ data: d, ...summaryOf(d), updated_at: new Date().toISOString() })
      .eq("id", intake.id)
      .select()
      .single();
    if (error) {
      setSaveState("pending");
      return fail("No se pudo guardar la ficha", error);
    }
    onChange(row);
    setSaveState(JSON.stringify(latest.current) === JSON.stringify(d) ? "saved" : "pending");
  }, [intake.id, onChange]);

  // Guardado automático un momento después de dejar de escribir; también al salir
  function update(patch: IntakeData) {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setData(next);
    setSaveState("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(next), SAVE_DELAY);
  }
  async function flush() {
    window.clearTimeout(timer.current);
    if (saveState !== "saved") await save(latest.current);
  }

  async function createTour() {
    if (!text(data, "prop_nombre") && !text(data, "tour_titulo") && !text(data, "cliente_empresa") && !text(data, "cliente_nombre")) {
      return toast({ title: "Escribe al menos el nombre del cliente o de la propiedad", variant: "destructive" });
    }
    setCreating(true);
    try {
      await flush();
      const tour = await createDraftTour({ ...intake, data: latest.current });
      onChange({ ...intake, data: latest.current, tour_id: tour.id });
      toast({ title: "Tour creado en borrador", description: "Ya tiene los datos de la ficha: solo falta subir las fotos 360." });
      navigate(`/admin/tours?tour=${tour.id}`);
    } catch (e) {
      fail("No se pudo crear el tour", e);
    }
    setCreating(false);
  }

  async function remove() {
    if (!window.confirm("¿Borrar esta ficha? El tour (si se creó) no se borra.")) return;
    window.clearTimeout(timer.current);
    if (intake.attachment_path) await removeAttachment(intake.attachment_path);
    const { error } = await db.from("tour_intakes").delete().eq("id", intake.id);
    if (error) return fail("No se pudo borrar la ficha", error);
    onDeleted();
  }

  const field = "block text-xs font-semibold text-gray-600 mb-1";
  const isImage = intake.attachment_type?.startsWith("image/");
  const title = text(data, "cliente_empresa") || text(data, "cliente_nombre") || "Ficha nueva";

  return (
    <div className="px-3 sm:px-6 pt-5 min-h-screen bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] text-sm">
      <div className="max-w-screen-lg mx-auto space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={async () => { await flush(); onBack(); }}>
            <ArrowLeft size={15} className="mr-1" /> Fichas
          </Button>
          <h1 className="text-lg font-bold text-[#0F2B4C] truncate flex-1 min-w-0">{title}</h1>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {saveState === "saved" ? <><Check size={13} className="text-green-600" /> Guardado</> : saveState === "saving" ? <><Loader2 size={13} className="animate-spin" /> Guardando…</> : "Sin guardar"}
          </span>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={remove}>
            <Trash2 size={14} />
          </Button>
        </div>

        <div className={cn("grid gap-4", intake.attachment_path && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]")}>
          {/* Foto o PDF de la ficha: queda al lado para copiar los datos */}
          {intake.attachment_path && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 lg:sticky lg:top-4 lg:self-start space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-[#0F2B4C]">Ficha original</p>
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#b8761a] inline-flex items-center gap-1 hover:underline">
                    Abrir <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {!fileUrl ? (
                <p className="text-gray-500 flex items-center gap-2 py-8 justify-center"><Loader2 size={15} className="animate-spin" /> Cargando…</p>
              ) : isImage ? (
                <a href={fileUrl} target="_blank" rel="noreferrer"><img src={fileUrl} alt="Ficha" className="w-full rounded-lg border" /></a>
              ) : (
                <iframe src={fileUrl} title="Ficha PDF" className="w-full h-[70vh] rounded-lg border" />
              )}
            </div>
          )}

          <div className="space-y-4">
            {INTAKE_SECTIONS.map((sec) => (
              <section key={sec.title} className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <h2 className="font-bold text-[#0F2B4C] flex items-center gap-2">
                  <span className="w-1 h-4 rounded bg-[#F0A030]" /> {sec.title}
                </h2>
                {sec.items.map((it, i) => {
                  if (isRow(it)) {
                    const tall = (it.height ?? 20) > 24;
                    return (
                      <div key={i} className={cn("grid gap-3", it.row.length > 1 && "sm:grid-cols-2", it.row.length > 3 && "lg:grid-cols-4")}>
                        {it.row.map(([k, label]) => (
                          <div key={k} className={cn(tall && "sm:col-span-2")}>
                            <label htmlFor={`f-${k}`} className={field}>{label}</label>
                            {tall ? (
                              <Textarea id={`f-${k}`} value={text(data, k)} onChange={(e) => update({ [k]: e.target.value })} rows={3} />
                            ) : (
                              <Input
                                id={`f-${k}`}
                                value={(data[k] as string) ?? ""}
                                onChange={(e) => update({ [k]: e.target.value })}
                                inputMode={/telefono|whatsapp|tel$/.test(k) ? "tel" : /habitaciones|banos|m2|niveles/.test(k) ? "decimal" : undefined}
                                type={/correo/.test(k) ? "email" : "text"}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (isChecks(it)) {
                    const sel = picked(data, it.checks);
                    return (
                      <div key={i}>
                        {it.label && <p className={field}>{it.label}</p>}
                        <div className="flex flex-wrap gap-2">
                          {it.options.map((opt) => {
                            const on = sel.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => update({ [it.checks]: on ? sel.filter((o) => o !== opt) : [...sel, opt] })}
                                className={cn(
                                  "px-3 py-2 rounded-lg border text-left text-sm min-h-[40px] inline-flex items-center gap-2",
                                  on ? "border-[#F0A030] bg-amber-50 text-[#0F2B4C] font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50",
                                )}
                              >
                                <span className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", on ? "bg-[#F0A030] border-[#F0A030] text-white" : "border-gray-300")}>
                                  {on && <Check size={12} strokeWidth={3} />}
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  if (isTable(it)) {
                    return (
                      <div key={i} className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm">
                          <thead>
                            <tr>{it.columns.map(([h]) => <th key={h} className="text-left text-xs font-semibold text-gray-600 pb-1 pr-2">{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: it.rows }, (_, r) => (
                              <tr key={r}>
                                {it.columns.map(([h], j) => {
                                  const k = `${it.table}_${r}_${j}`;
                                  return (
                                    <td key={h} className="pr-2 pb-1.5">
                                      <Input aria-label={`${h} ${r + 1}`} value={(data[k] as string) ?? ""} onChange={(e) => update({ [k]: e.target.value })} className="h-9" />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return null; // firmas: solo en el PDF impreso
                })}
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* Barra fija: crear el tour o abrirlo si ya existe */}
      <div className="sticky bottom-0 z-30 mt-4 -mx-3 sm:-mx-6 bg-white/95 backdrop-blur border-t border-gray-200 px-3 py-3">
        <div className="max-w-screen-lg mx-auto flex items-center justify-end gap-3">
          {intake.tour_id ? (
            <>
              <span className="text-xs text-gray-500 hidden sm:inline">Esta ficha ya tiene su tour.</span>
              <Button onClick={async () => { await flush(); navigate(`/admin/tours?tour=${intake.tour_id}`); }} className="bg-[#0F2B4C] hover:bg-[#173a63]">
                <Rotate3d size={15} className="mr-1.5" /> Abrir el tour
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-500 hidden sm:inline">Cuando termines con el cliente:</span>
              <Button onClick={createTour} disabled={creating} className="bg-green-600 hover:bg-green-700 text-white">
                {creating ? <Loader2 size={15} className="animate-spin mr-1.5" /> : <Rotate3d size={15} className="mr-1.5" />}
                Crear tour en borrador
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
