// Reporte de visitas en PDF (todo el sitio o un tour), para descargarlo o enviarlo a un propietario.
// Se arma en el navegador con pdf-lib: A4, logo, cifras principales, visitas por día y listas.

export interface ReportRow {
  label: string;
  value: number;
}

export interface VisitsReport {
  title: string; // "Tour: Villa Cocotal" o "Todo el sitio"
  url?: string; // enlace público del tour
  periodLabel: string; // "Últimos 30 días (1 oct. – 30 oct. 2026)"
  kpis: { label: string; value: string; note?: string }[];
  daily: { label: string; value: number }[];
  sections: { title: string; rows: ReportRow[]; empty: string; unit?: string }[];
}

const NAVY = [15 / 255, 43 / 255, 76 / 255] as const;
const GOLD = [240 / 255, 160 / 255, 48 / 255] as const;

export async function buildVisitsPdf(r: VisitsReport): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Reporte de visitas · ${r.title}`);
  pdf.setAuthor("Cana Escapes");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(...NAVY);
  const gold = rgb(...GOLD);
  const gray = rgb(0.45, 0.47, 0.5);
  const light = rgb(0.93, 0.95, 0.97);

  // Helvetica solo tiene letras latinas: lo demás (emojis, otros alfabetos) se quita
  const clean = (s: string) => {
    let out = "";
    for (const ch of s) {
      try {
        font.encodeText(ch);
        out += ch;
      } catch {
        /* se omite */
      }
    }
    return out;
  };
  const fit = (s: string, f: typeof font, size: number, max: number) => {
    let t = clean(s);
    if (f.widthOfTextAtSize(t, size) <= max) return t;
    while (t.length > 1 && f.widthOfTextAtSize(t + "…", size) > max) t = t.slice(0, -1);
    return t + "…";
  };

  const W = 595.28, H = 841.89, M = 40;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    const bytes = await fetch("/brand/logo-dark.png").then((x) => (x.ok ? x.arrayBuffer() : null));
    if (bytes) logo = await pdf.embedPng(bytes);
  } catch {
    logo = null;
  }

  const footer = () => {
    page.drawLine({ start: { x: M, y: 32 }, end: { x: W - M, y: 32 }, thickness: 0.5, color: light });
    page.drawText(clean("canaescapes.com · Datos sin información personal: cada navegador cuenta como un visitante."), { x: M, y: 20, size: 7.5, font, color: gray });
  };
  const newPage = () => {
    footer();
    page = pdf.addPage([W, H]);
    y = H - M;
  };
  const need = (h: number) => {
    if (y - h < 48) newPage();
  };

  // ── Encabezado ──
  if (logo) {
    const lw = 130, lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: M, y: y - lh, width: lw, height: lh });
  }
  page.drawText("Reporte de visitas", { x: W - M - bold.widthOfTextAtSize("Reporte de visitas", 16), y: y - 16, size: 16, font: bold, color: navy });
  const gen = clean(`Generado el ${new Date().toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}`);
  page.drawText(gen, { x: W - M - font.widthOfTextAtSize(gen, 8.5), y: y - 30, size: 8.5, font, color: gray });
  y -= 62;
  page.drawRectangle({ x: M, y: y - 2, width: W - 2 * M, height: 2, color: gold });
  y -= 26;
  page.drawText(fit(r.title, bold, 18, W - 2 * M), { x: M, y, size: 18, font: bold, color: navy });
  y -= 16;
  page.drawText(fit(r.periodLabel, font, 10, W - 2 * M), { x: M, y, size: 10, font, color: gray });
  if (r.url) {
    y -= 13;
    page.drawText(fit(r.url, font, 9, W - 2 * M), { x: M, y, size: 9, font, color: rgb(0.72, 0.46, 0.1) });
  }
  y -= 22;

  // ── Cifras principales: 3 por fila ──
  const cols = 3, gap = 10;
  const cw = (W - 2 * M - gap * (cols - 1)) / cols, ch = 58;
  r.kpis.forEach((k, i) => {
    if (i % cols === 0) {
      if (i) y -= ch + gap;
      need(ch);
    }
    const x = M + (i % cols) * (cw + gap);
    page.drawRectangle({ x, y: y - ch, width: cw, height: ch, color: light });
    page.drawText(fit(k.label, font, 8.5, cw - 20), { x: x + 10, y: y - 16, size: 8.5, font, color: gray });
    page.drawText(fit(k.value, bold, 17, cw - 20), { x: x + 10, y: y - 36, size: 17, font: bold, color: navy });
    if (k.note) page.drawText(fit(k.note, font, 7.5, cw - 20), { x: x + 10, y: y - 49, size: 7.5, font, color: gray });
  });
  y -= ch + 24;

  // ── Visitas por día ──
  if (r.daily.length) {
    need(150);
    page.drawText("Visitas por día", { x: M, y, size: 12, font: bold, color: navy });
    y -= 14;
    const chH = 100, chW = W - 2 * M;
    const max = Math.max(1, ...r.daily.map((d) => d.value));
    const bw = chW / r.daily.length;
    page.drawLine({ start: { x: M, y: y - chH }, end: { x: W - M, y: y - chH }, thickness: 0.5, color: gray });
    page.drawText(String(max), { x: M, y: y - 8, size: 7, font, color: gray });
    r.daily.forEach((d, i) => {
      const h = (d.value / max) * (chH - 12);
      if (h > 0) page.drawRectangle({ x: M + i * bw + bw * 0.12, y: y - chH, width: Math.max(0.8, bw * 0.76), height: Math.max(1, h), color: gold });
    });
    y -= chH + 11;
    const first = clean(r.daily[0].label), last = clean(r.daily[r.daily.length - 1].label);
    page.drawText(first, { x: M, y, size: 7.5, font, color: gray });
    page.drawText(last, { x: W - M - font.widthOfTextAtSize(last, 7.5), y, size: 7.5, font, color: gray });
    y -= 24;
  }

  // ── Listas en dos columnas ──
  const colW = (W - 2 * M - 20) / 2;
  const sectionHeight = (s: VisitsReport["sections"][number]) => 22 + Math.max(1, s.rows.length) * 15 + 14;
  const drawSection = (s: VisitsReport["sections"][number], x: number, top: number) => {
    let yy = top;
    page.drawText(fit(s.title, bold, 11, colW), { x, y: yy, size: 11, font: bold, color: navy });
    yy -= 16;
    if (!s.rows.length) {
      page.drawText(fit(s.empty, font, 8.5, colW), { x, y: yy - 4, size: 8.5, font, color: gray });
      return;
    }
    const max = Math.max(1, ...s.rows.map((row) => row.value));
    for (const row of s.rows) {
      page.drawRectangle({ x, y: yy - 11, width: Math.max(2, (row.value / max) * colW), height: 13, color: light });
      const val = `${row.value.toLocaleString("es-DO")}${s.unit ?? ""}`;
      const vw = bold.widthOfTextAtSize(val, 8.5);
      page.drawText(fit(row.label, font, 8.5, colW - vw - 14), { x: x + 4, y: yy - 7.5, size: 8.5, font, color: rgb(0.15, 0.17, 0.2) });
      page.drawText(val, { x: x + colW - vw - 4, y: yy - 7.5, size: 8.5, font: bold, color: navy });
      yy -= 15;
    }
  };
  for (let i = 0; i < r.sections.length; i += 2) {
    const a = r.sections[i], b = r.sections[i + 1];
    const h = Math.max(sectionHeight(a), b ? sectionHeight(b) : 0);
    need(h);
    drawSection(a, M, y);
    if (b) drawSection(b, M + colW + 20, y);
    y -= h;
  }

  footer();
  return pdf.save();
}

/** Descarga el PDF; en el teléfono ofrece compartirlo (WhatsApp, correo…) si el navegador lo permite */
export async function deliverPdf(bytes: Uint8Array, fileName: string, share: boolean) {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
  if (share) {
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
