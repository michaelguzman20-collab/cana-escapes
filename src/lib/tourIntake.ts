import { supabase } from "@/lib/supabase";
import { db, instagramUser, normalizeWhatsapp, slugify, type Tour } from "@/lib/tours";
import schemaJson from "@/content/tourIntakeSchema.json";

// Fichas de clientes de Tours 360 (tabla tour_intakes, solo admin). La ficha se llena en /admin/tours/fichas
// mientras se habla con el cliente, o se importa el PDF rellenado en la tableta (mismas claves que el PDF).
// Con los datos se crea un tour en borrador: solo falta subir las fotos.

export type IntakeValue = string | string[];
export type IntakeData = Record<string, IntakeValue>;

export interface TourIntake {
  id: string;
  client_name: string | null;
  company: string | null;
  property_name: string | null;
  data: IntakeData;
  attachment_path: string | null;
  attachment_type: string | null;
  tour_id: string | null;
  created_at: string;
  updated_at: string;
}

type RowItem = { row: [string, string, number][]; height?: number };
type ChecksItem = { checks: string; label?: string; cols?: number; options: string[] };
type TableItem = { table: string; rows: number; columns: [string, number][] };
type SignaturesItem = { signatures: string[] };
export type IntakeItem = RowItem | ChecksItem | TableItem | SignaturesItem;
export interface IntakeSection { title: string; items: IntakeItem[] }

export const INTAKE_SECTIONS: IntakeSection[] = (schemaJson as { pages: { sections: IntakeSection[] }[] }).pages.flatMap((p) => p.sections);

export const isRow = (it: IntakeItem): it is RowItem => "row" in it;
export const isChecks = (it: IntakeItem): it is ChecksItem => "checks" in it;
export const isTable = (it: IntakeItem): it is TableItem => "table" in it;

export const BUCKET = "tour-intakes";
const CANA_LOGO = "/brand/logo-light.png";
// Tipo de propiedad marcado en la ficha → ilustración de presentación en /tours (PropertyArt)
const CARD_BY_TYPE: Record<string, string> = {
  Villa: "villa", Apartamento: "apartamento", Casa: "casa", Penthouse: "penthouse",
  "Local / tienda": "local", Oficina: "oficina", "Terreno / proyecto": "proyecto", Condominio: "condominio",
};

export const text = (d: IntakeData, k: string) => (typeof d[k] === "string" ? (d[k] as string).trim() : "");
export const picked = (d: IntakeData, k: string) => (Array.isArray(d[k]) ? (d[k] as string[]) : []);

/** Columnas de búsqueda/listado que se copian de la ficha */
export function summaryOf(d: IntakeData) {
  return {
    client_name: text(d, "cliente_nombre") || null,
    company: text(d, "cliente_empresa") || null,
    property_name: text(d, "prop_nombre") || null,
  };
}

/** Cuántos campos tienen algo escrito o marcado */
export function filledCount(d: IntakeData) {
  return Object.values(d).filter((v) => (Array.isArray(v) ? v.length > 0 : v.trim() !== "")).length;
}

/**
 * Lee los campos de un PDF de la ficha rellenado (en la tableta, con Adobe, Xodo, Samsung Notes…).
 * Devuelve null si el PDF no tiene campos (por ejemplo, si se "aplanó" o se escaneó en papel).
 */
export async function readIntakePdf(file: Blob): Promise<IntakeData | null> {
  const { PDFDocument, PDFCheckBox, PDFTextField } = await import("pdf-lib");
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const fields = pdf.getForm().getFields();
  if (!fields.length) return null;
  const byName = new Map(fields.map((f) => [f.getName(), f]));
  const txt = (name: string) => {
    const f = byName.get(name);
    return f instanceof PDFTextField ? (f.getText() ?? "").trim() : "";
  };
  const checked = (name: string) => {
    const f = byName.get(name);
    return f instanceof PDFCheckBox && f.isChecked();
  };
  const out: IntakeData = {};
  const date = txt("fecha_ficha");
  if (date) out.fecha_ficha = date;
  for (const sec of INTAKE_SECTIONS) {
    for (const it of sec.items) {
      if (isRow(it)) for (const [k] of it.row) { const v = txt(k); if (v) out[k] = v; }
      else if (isChecks(it)) { const sel = it.options.filter((_, i) => checked(`${it.checks}_${i}`)); if (sel.length) out[it.checks] = sel; }
      else if (isTable(it)) {
        for (let r = 0; r < it.rows; r++) for (let j = 0; j < it.columns.length; j++) {
          const v = txt(`${it.table}_${r}_${j}`);
          if (v) out[`${it.table}_${r}_${j}`] = v;
        }
      }
    }
  }
  return out;
}

export async function uploadAttachment(intakeId: string, file: File) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${intakeId}/ficha-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

/** Enlace temporal (1 hora) para ver la foto/PDF de la ficha: el bucket es privado */
export async function attachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeAttachment(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

const num = (s: string) => {
  const m = s.replace(",", ".").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/** Datos del tour que salen de la ficha */
export function tourFieldsFrom(d: IntakeData): Partial<Tour> {
  const title = text(d, "tour_titulo") || text(d, "prop_nombre") || text(d, "cliente_empresa") || text(d, "cliente_nombre") || "Tour nuevo";
  const fields: Partial<Tour> = {
    title,
    property_name: text(d, "prop_nombre") || null,
    location: text(d, "prop_ubicacion") || null,
    bedrooms: num(text(d, "prop_habitaciones")),
    bathrooms: num(text(d, "prop_banos")),
    whatsapp: normalizeWhatsapp(text(d, "cliente_whatsapp")) ? text(d, "cliente_whatsapp") : null,
    instagram: instagramUser(text(d, "cliente_instagram")) || null,
    description: text(d, "tour_descripcion") || null,
    brand_link: text(d, "tour_enlace_logo") || text(d, "cliente_web") || null,
    showcase: picked(d, "autoriza").some((o) => o.includes("ejemplo")),
    card_image: CARD_BY_TYPE[picked(d, "prop_tipo")[0]] ?? null,
  };
  if (fields.bedrooms != null) fields.bedrooms = Math.round(fields.bedrooms);
  if (picked(d, "logo").includes("Usar logo de Cana Escapes")) {
    fields.brand_logo_url = CANA_LOGO;
    fields.brand_logo_path = null;
    fields.brand_link = "https://canaescapes.com/tours";
  }
  return fields;
}

/** Crea el tour en borrador con los datos de la ficha y lo enlaza a ella */
export async function createDraftTour(intake: TourIntake): Promise<Tour> {
  const fields = tourFieldsFrom(intake.data);
  const base = slugify(fields.title ?? "") || "tour";
  const { data: taken } = await db.from("tours").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((t: { slug: string }) => t.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  const { data: tour, error } = await db.from("tours").insert({ ...fields, slug, published: false }).select().single();
  if (error) throw error;
  const { error: e2 } = await db.from("tour_intakes").update({ tour_id: tour.id, updated_at: new Date().toISOString() }).eq("id", intake.id);
  if (e2) throw e2;
  return tour;
}
