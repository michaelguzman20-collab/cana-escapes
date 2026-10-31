// PDF de una cotización de Tours 360 (carta, con pdf-lib, en el navegador). Helvetica estándar cubre
// los acentos y la ñ del español; el logo de Cana Escapes se toma de /brand/logo-dark.png.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ITBIS_RATE, quoteTotals, type Pricing, type QuoteDoc } from "./tourPricing";

const NAVY = rgb(15 / 255, 43 / 255, 76 / 255);
const AMBER = rgb(240 / 255, 160 / 255, 48 / 255);
const MUTED = rgb(0.38, 0.43, 0.5);
const LINE = rgb(0.86, 0.89, 0.93);
const SOFT = rgb(0.96, 0.97, 0.98);

const W = 612;
const H = 792;
const M = 48;

const money = (n: number, cur: "usd" | "rd", rate: number) => {
  const v = cur === "rd" ? n * rate : n;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? "-" : ""}${cur === "rd" ? "RD$" : "US$"}${s}`;
};

// Helvetica estándar solo dibuja WinAnsi: cualquier otro carácter (emoji, etc.) rompería el PDF
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const clean = (s: string) => [...s.replace(/−/g, "-").replace(/ | /g, " ")].map((ch) => (ch.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.includes(ch) ? ch : "?")).join("").replace(/\t/g, " ");

/** Parte un texto en líneas que caben en el ancho dado */
function wrap(raw: string, font: PDFFont, size: number, width: number): string[] {
  const text = clean(raw);
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) <= width) line = t;
      else {
        if (line) out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });
}

export async function buildQuotePdf(doc: QuoteDoc, number: string, p: Pricing): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cotización ${number} · Tours 360°`);
  pdf.setAuthor(p.company.name);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: string, x: number, yy: number, size = 9.5, f: PDFFont = font, color = NAVY) => page.drawText(clean(s), { x, y: yy, size, font: f, color });
  const right = (s: string, xr: number, yy: number, size = 9.5, f: PDFFont = font, color = NAVY) => text(s, xr - f.widthOfTextAtSize(clean(s), size), yy, size, f, color);
  const ensure = (need: number) => {
    if (y - need < M + 40) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };

  // ── Encabezado ──
  try {
    const bytes = await fetch("/brand/logo-dark.png").then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()));
    const img = await pdf.embedPng(bytes);
    const h = 58;
    page.drawImage(img, { x: M - 6, y: y - h + 6, width: (img.width / img.height) * h, height: h });
  } catch {
    text(p.company.name, M, y - 20, 18, bold);
  }
  right("COTIZACIÓN", W - M, y - 14, 20, bold);
  right(number, W - M, y - 32, 11, bold, AMBER);
  const valid = new Date(doc.date + "T12:00:00");
  valid.setDate(valid.getDate() + (doc.validityDays || 0));
  right(`Fecha: ${fmtDate(doc.date)}`, W - M, y - 47, 9, font, MUTED);
  right(`Válida hasta: ${fmtDate(valid.toISOString().slice(0, 10))}`, W - M, y - 59, 9, font, MUTED);
  y -= 78;
  page.drawRectangle({ x: M, y, width: W - 2 * M, height: 2, color: AMBER });
  y -= 22;

  // ── Empresa y cliente ──
  const colW = (W - 2 * M - 24) / 2;
  const block = (x: number, title: string, rows: string[]) => {
    let yy = y;
    text(title, x, yy, 8, bold, MUTED);
    yy -= 14;
    rows.filter(Boolean).forEach((r, i) => {
      for (const l of wrap(r, i === 0 ? bold : font, i === 0 ? 11 : 9.5, colW)) {
        text(l, x, yy, i === 0 ? 11 : 9.5, i === 0 ? bold : font);
        yy -= i === 0 ? 15 : 13;
      }
    });
    return yy;
  };
  const c = p.company;
  const y1 = block(M, "DE", [c.name, c.rnc && `RNC ${c.rnc}`, c.address, [c.phone, c.email].filter(Boolean).join(" · "), c.web]);
  const cl = doc.client;
  const y2 = block(M + colW + 24, "PARA", [cl.name || "Cliente", cl.company, cl.taxId && `RNC / Cédula ${cl.taxId}`, cl.phone, cl.email]);
  y = Math.min(y1, y2) - 14;

  // ── Tabla ──
  const cur: "usd" | "rd" = doc.currency === "rd" ? "rd" : "usd";
  const cols = { desc: M + 10, qty: W - M - 190, unit: W - M - 95, amt: W - M - 10 };
  const descW = cols.qty - cols.desc - 30;
  page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: NAVY });
  const hdr = (s: string, x: number, alignRight = false) => (alignRight ? right(s, x, y, 8.5, bold, rgb(1, 1, 1)) : text(s, x, y, 8.5, bold, rgb(1, 1, 1)));
  hdr("DESCRIPCIÓN", cols.desc);
  hdr("CANT.", cols.qty, true);
  hdr("PRECIO", cols.unit, true);
  hdr("IMPORTE", cols.amt, true);
  y -= 26;
  doc.lines.forEach((l, i) => {
    const dl = wrap(l.desc || "—", font, 9.5, descW);
    const h = dl.length * 12.5 + 10;
    ensure(h);
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - h + 12, width: W - 2 * M, height: h, color: SOFT });
    dl.forEach((t, j) => text(t, cols.desc, y - j * 12.5));
    right(String(l.qty), cols.qty, y);
    right(money(l.unit, cur, doc.rate), cols.unit, y);
    right(money(l.qty * l.unit, cur, doc.rate), cols.amt, y, 9.5, bold);
    y -= h;
  });
  page.drawRectangle({ x: M, y: y + 6, width: W - 2 * M, height: 0.8, color: LINE });
  y -= 10;

  // ── Totales ──
  const t = quoteTotals(doc);
  ensure(90);
  const tl = W - M - 200;
  const row = (label: string, v: string, strong = false) => {
    text(label, tl, y, strong ? 11 : 9.5, strong ? bold : font, strong ? NAVY : MUTED);
    right(v, cols.amt, y, strong ? 11 : 9.5, strong ? bold : font);
    y -= strong ? 18 : 14;
  };
  row("Subtotal", money(t.subtotal, cur, doc.rate));
  if (doc.itbis) row(`ITBIS (${Math.round(ITBIS_RATE * 100)}%)`, money(t.itbis, cur, doc.rate));
  page.drawRectangle({ x: tl, y: y + 10, width: cols.amt - tl, height: 0.8, color: LINE });
  y -= 4;
  row("TOTAL", money(t.total, cur, doc.rate), true);
  if (doc.currency === "both") {
    right(`Equivalente: ${money(t.total, "rd", doc.rate)} (tasa RD$${doc.rate} por US$1)`, cols.amt, y, 8.5, font, MUTED);
    y -= 14;
  }
  if (doc.monthlyNote.trim()) {
    y -= 4;
    for (const l of wrap(doc.monthlyNote, bold, 9.5, W - 2 * M)) {
      ensure(14);
      text(l, M, y, 9.5, bold, NAVY);
      y -= 13;
    }
  }
  y -= 12;

  // ── Condiciones ──
  if (doc.conditions.trim()) {
    ensure(40);
    text("CONDICIONES", M, y, 8, bold, MUTED);
    y -= 14;
    for (const l of wrap(doc.conditions, font, 9.5, W - 2 * M)) {
      ensure(13);
      text(l, M, y);
      y -= 13;
    }
    y -= 10;
  }

  // ── Datos bancarios ──
  const b = p.bank;
  if (doc.includeBank && b.bank.trim() && b.account.trim()) {
    const rows = [
      ["Banco", b.bank], ["Titular", b.holder], ["Tipo de cuenta", b.accountType], ["Número de cuenta", b.account], ["Moneda", b.currency], ["RNC / Cédula del titular", b.holderId],
    ].filter(([, v]) => v.trim());
    const h = rows.length * 13 + 30;
    ensure(h + 10);
    page.drawRectangle({ x: M, y: y - h + 12, width: W - 2 * M, height: h, color: SOFT, borderColor: LINE, borderWidth: 0.8 });
    text("DATOS PARA TRANSFERENCIA", M + 12, y - 2, 8, bold, MUTED);
    let yy = y - 18;
    for (const [k, v] of rows) {
      text(k, M + 12, yy, 9.5, font, MUTED);
      text(v, M + 150, yy, 9.5, bold);
      yy -= 13;
    }
    y -= h + 8;
  }

  // ── Pie de página ──
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    pg.drawRectangle({ x: M, y: 46, width: W - 2 * M, height: 0.8, color: LINE });
    pg.drawText("Tours 360° · un servicio de Cana Escapes · canaescapes.com/tours", { x: M, y: 32, size: 8, font, color: MUTED });
    const note = "Esta cotización no es una factura ni un comprobante fiscal.";
    pg.drawText(note, { x: M, y: 21, size: 7.5, font, color: MUTED });
    const pn = `${i + 1} / ${pages.length}`;
    pg.drawText(pn, { x: W - M - font.widthOfTextAtSize(pn, 8), y: 32, size: 8, font, color: MUTED });
  });

  return pdf.save();
}
