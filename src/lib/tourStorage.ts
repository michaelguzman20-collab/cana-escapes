import { supabase } from "@/lib/supabase";

// Almacenamiento de fotos 360 de Tours 360, detrás de un adaptador para poder cambiar de proveedor.
// · Cloudflare R2 (bucket cana-media, prefijo tours/): se usa cuando existe VITE_R2_PUBLIC_URL. El navegador
//   pide URLs prefirmadas a /api/tours-upload (solo admin) y sube directo a R2.
// · Si no, bucket público de prueba "tours-dev" en Supabase (plan gratis = 1 GB → solo 1-2 tours de prueba).

export interface StoredFile {
  path: string; // ruta dentro del almacenamiento (para borrar)
  url: string;  // URL pública
}

export interface TourStorage {
  name: string;
  upload(path: string, blob: Blob): Promise<StoredFile>;
  remove(paths: string[]): Promise<void>;
}

const BUCKET = "tours-dev";

const supabaseDevStorage: TourStorage = {
  name: "Supabase (tours-dev, temporal)",
  async upload(path, blob) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
  },
  async remove(paths) {
    if (!paths.length) return;
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) throw error;
  },
};

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/+$/, "");

async function toursApi<T>(action: "sign" | "delete", paths: string[]): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/tours-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ action, paths }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status} en /api/tours-upload`);
  return json as T;
}

const r2Storage: TourStorage = {
  name: "Cloudflare R2 (cana-media)",
  async upload(path, blob) {
    const key = `tours/${path}`;
    const { urls } = await toursApi<{ urls: { url: string }[] }>("sign", [key]);
    const res = await fetch(urls[0].url, { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
    if (!res.ok) throw new Error(`R2 rechazó la subida (${res.status})`);
    return { path: key, url: `${R2_PUBLIC_URL}/${key}` };
  },
  async remove(paths) {
    // Fotos subidas antes de activar R2 siguen en tours-dev
    const r2 = paths.filter((p) => p.startsWith("tours/"));
    if (r2.length) await toursApi("delete", r2);
    await supabaseDevStorage.remove(paths.filter((p) => !p.startsWith("tours/")));
  },
};

export const tourStorage: TourStorage = R2_PUBLIC_URL ? r2Storage : supabaseDevStorage;

// ── Procesado en el navegador antes de subir ────────────────────────────────
// Panorama: máx. 8192x4096 en WebP (~0.82) → normalmente 2-4 MB. Miniatura: 640x320.

const PANO_MAX_W = 8192;
const THUMB_W = 640;

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* algunos navegadores no aceptan ciertos JPEG grandes: se usa <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(src: CanvasImageSource, w: number, h: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite procesar la imagen");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => {
        canvas.width = canvas.height = 0; // libera memoria (8K ≈ 128 MB)
        if (!b) return reject(new Error("No se pudo convertir la imagen"));
        // Safari antiguo no sabe codificar WebP y devuelve PNG: se reintenta en JPEG
        if (b.type !== "image/webp") return resolve(encodeJpeg(src, w, h, quality));
        resolve(b);
      },
      "image/webp",
      quality
    )
  );
}

function encodeJpeg(src: CanvasImageSource, w: number, h: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(src, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => {
      canvas.width = canvas.height = 0;
      b ? resolve(b) : reject(new Error("No se pudo convertir la imagen"));
    }, "image/jpeg", quality)
  );
}

export interface ProcessedPano {
  pano: Blob;
  thumb: Blob;
  width: number;
  height: number;
  warning?: string;
}

export async function processPanorama(file: File): Promise<ProcessedPano> {
  const img = await loadBitmap(file);
  const srcW = img.width;
  const srcH = img.height;
  const ratio = srcW / srcH;
  const warning =
    Math.abs(ratio - 2) > 0.05
      ? `La foto mide ${srcW}x${srcH}; una 360 equirectangular debe ser 2:1. Puede verse deformada.`
      : undefined;
  const w = Math.min(srcW, PANO_MAX_W);
  const h = Math.round(w / ratio);
  const pano = await encode(img, w, h, 0.82);
  const thumb = await encode(img, THUMB_W, Math.round(THUMB_W / ratio), 0.75);
  if ("close" in img) img.close();
  return { pano, thumb, width: w, height: h, warning };
}

export function extOf(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : "jpg";
}
