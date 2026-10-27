import type { PanoFilters } from "@/lib/tours";

// Filtros de foto 360 (brillo, contraste, saturación, HDR y nitidez) aplicados en el navegador sobre la
// foto original de la escena. El resultado se guarda como una foto nueva: así el visor no hace trabajo
// extra y se ve igual en todos los teléfonos. La original se conserva para poder cambiar o quitar filtros.

const v = (f: PanoFilters, k: keyof PanoFilters) => (f[k] ?? 0) / 100;

/** Vista previa aproximada con CSS mientras se mueven los controles (la nitidez solo se ve al aplicar) */
export function cssPreview(f: PanoFilters) {
  const b = v(f, "brightness"), c = v(f, "contrast"), s = v(f, "saturation"), h = v(f, "hdr");
  const parts = [
    `brightness(${(1 + b * 0.6 + h * 0.08).toFixed(3)})`,
    `contrast(${(1 + c * 0.6 - h * 0.18).toFixed(3)})`,
    `saturate(${(1 + s + h * 0.25).toFixed(3)})`,
  ];
  return parts.join(" ");
}

// Curva de tono (0..1 → 0..1): brillo, contraste y la parte "global" del HDR
// (levanta sombras y comprime altas luces).
function buildLut(f: PanoFilters) {
  const b = v(f, "brightness"), c = v(f, "contrast"), h = v(f, "hdr");
  const lut = new Float32Array(256);
  const k = 1 + c * 0.6 - h * 0.15;
  for (let i = 0; i < 256; i++) {
    let x = i / 255;
    x = x + h * 0.4 * x * (1 - x) * (1 - x) * 6.75 - h * 0.25 * x * x * (1 - x) * 6.75;
    x = (x - 0.5) * k + 0.5;
    x = x + b * 0.3 * (b > 0 ? 1 - x : x);
    lut[i] = Math.max(0, Math.min(1, x)) * 255;
  }
  return lut;
}

async function loadBitmap(url: string) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`No se pudo descargar la foto (${res.status})`);
  return createImageBitmap(await res.blob());
}

function blurred(src: ImageBitmap, px: number) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.filter = `blur(${px}px)`;
  ctx.drawImage(src, 0, 0);
  return { canvas: c, ctx };
}

export function canvasFilterSupported() {
  const ctx = document.createElement("canvas").getContext("2d");
  return !!ctx && "filter" in ctx;
}

/** Devuelve la foto con filtros aplicados (canvas a tamaño completo) */
export async function applyFilters(baseUrl: string, f: PanoFilters, onProgress?: (pct: number) => void) {
  const img = await loadBitmap(baseUrl);
  const { width: w, height: h } = img;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d", { willReadFrequently: true })!;
  octx.drawImage(img, 0, 0);

  const sharp = v(f, "sharpness") * 1.6;
  const clarity = v(f, "hdr") * 0.45; // parte "local" del HDR: contraste en zonas grandes
  const sat = 1 + v(f, "saturation") + v(f, "hdr") * 0.25;
  const canBlur = canvasFilterSupported();
  // Radios proporcionales al tamaño (a 8192 px de ancho: 1.5 px y 40 px)
  const small = sharp && canBlur ? blurred(img, Math.max(0.8, (w / 8192) * 1.5)) : null;
  const big = clarity && canBlur ? blurred(img, Math.max(6, (w / 8192) * 40)) : null;
  img.close();

  const lut = buildLut(f);
  const STRIP = 256;
  for (let y = 0; y < h; y += STRIP) {
    const sh = Math.min(STRIP, h - y);
    const d = octx.getImageData(0, y, w, sh);
    const p = d.data;
    const ps = small?.ctx.getImageData(0, y, w, sh).data;
    const pb = big?.ctx.getImageData(0, y, w, sh).data;
    for (let i = 0; i < p.length; i += 4) {
      let r = p[i], g = p[i + 1], bl = p[i + 2];
      if (ps) {
        r += sharp * (r - ps[i]);
        g += sharp * (g - ps[i + 1]);
        bl += sharp * (bl - ps[i + 2]);
      }
      if (pb) {
        r += clarity * (p[i] - pb[i]);
        g += clarity * (p[i + 1] - pb[i + 1]);
        bl += clarity * (p[i + 2] - pb[i + 2]);
      }
      // La curva se aplica a la luminosidad y se escala el color: así no se lavan los colores
      const l0 = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      const li = l0 < 0 ? 0 : l0 > 255 ? 255 : l0 | 0;
      const k = l0 > 1 ? lut[li] / l0 : 1;
      r = l0 > 1 ? r * k : lut[r < 0 ? 0 : r > 255 ? 255 : r | 0];
      g = l0 > 1 ? g * k : lut[g < 0 ? 0 : g > 255 ? 255 : g | 0];
      bl = l0 > 1 ? bl * k : lut[bl < 0 ? 0 : bl > 255 ? 255 : bl | 0];
      if (sat !== 1) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
        r = l + (r - l) * sat;
        g = l + (g - l) * sat;
        bl = l + (bl - l) * sat;
      }
      p[i] = r;
      p[i + 1] = g;
      p[i + 2] = bl;
    }
    octx.putImageData(d, 0, y);
    onProgress?.(Math.round(((y + sh) / h) * 100));
    await new Promise((res) => setTimeout(res)); // deja respirar a la página
  }
  for (const c of [small?.canvas, big?.canvas]) if (c) c.width = c.height = 0;
  return out;
}

export function canvasToBlob(c: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo convertir la imagen"))), "image/webp", quality)
  );
}

export function thumbFrom(c: HTMLCanvasElement, width = 640) {
  const t = document.createElement("canvas");
  t.width = width;
  t.height = Math.round((width * c.height) / c.width);
  const ctx = t.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c, 0, 0, t.width, t.height);
  return canvasToBlob(t, 0.75);
}
