import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Loader2, Mail, Plus, Receipt, Save, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db, normalizeWhatsapp, whatsappLink } from "@/lib/tours";
import { buildQuotePdf } from "@/lib/quotePdf";
import { hasBank, quoteNumber, quoteTotals, type Pricing, type QuoteDoc, type QuoteLine } from "@/lib/tourPricing";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";

// Editor de una cotización de Tours 360: cliente, líneas, ITBIS sí/no, moneda, condiciones y datos
// bancarios opcionales. Guarda en tour_quotes (numerada), descarga el PDF, lo comparte y, si el
// cliente acepta, la pasa a Contabilidad › Ingresos para la factura con comprobante fiscal.

export type QuoteStatus = "borrador" | "enviada" | "aceptada" | "rechazada" | "facturada";

export interface SavedQuote {
  id: string;
  number: number;
  created_at: string;
  status: QuoteStatus;
  client_name: string;
  total_usd: number;
  data: QuoteDoc;
}

const usd2 = (n: number) => `US$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rd2 = (n: number, rate: number) => `RD$${(n * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "rounded-md border border-gray-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#F0A030]/50";

export function QuoteDialog({ open, onClose, pricing, initial, saved, onSaved }: {
  open: boolean;
  onClose: () => void;
  pricing: Pricing;
  initial: QuoteDoc;
  saved: SavedQuote | null; // null = cotización nueva
  onSaved: (q: SavedQuote) => void;
}) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<QuoteDoc>(initial);
  const [current, setCurrent] = useState<SavedQuote | null>(saved);
  const [busy, setBusy] = useState<null | "save" | "pdf" | "share" | "mail" | "invoice">(null);
  const t = useMemo(() => quoteTotals(doc), [doc]);
  const bankReady = hasBank(pricing);

  const setD = <K extends keyof QuoteDoc>(k: K, v: QuoteDoc[K]) => setDoc((d) => ({ ...d, [k]: v }));
  const setClient = (k: keyof QuoteDoc["client"], v: string) => setDoc((d) => ({ ...d, client: { ...d.client, [k]: v } }));
  const setLine = (i: number, patch: Partial<QuoteLine>) => setDoc((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  /** Guarda (crea o actualiza) y devuelve la cotización guardada */
  async function persist(status?: QuoteStatus): Promise<SavedQuote | null> {
    const row = { client_name: doc.client.name.trim(), total_usd: Math.round(t.total * 100) / 100, data: { ...doc, includeBank: doc.includeBank && bankReady }, updated_at: new Date().toISOString(), ...(status ? { status } : {}) };
    const res = current
      ? await db.from("tour_quotes").update(row).eq("id", current.id).select().single()
      : await db.from("tour_quotes").insert(row).select().single();
    if (res.error) {
      toast({ title: "No se pudo guardar la cotización", description: res.error.message, variant: "destructive" });
      return null;
    }
    setCurrent(res.data);
    onSaved(res.data);
    return res.data as SavedQuote;
  }

  async function save() {
    setBusy("save");
    const q = await persist();
    setBusy(null);
    if (q) toast({ title: `Cotización ${quoteNumber(q.number, q.created_at)} guardada` });
  }

  async function pdfFile(q: SavedQuote) {
    const num = quoteNumber(q.number, q.created_at);
    const bytes = await buildQuotePdf({ ...doc, includeBank: doc.includeBank && bankReady }, num, pricing);
    const name = `Cotizacion-${num}${doc.client.name ? "-" + doc.client.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/-+$/, "") : ""}.pdf`;
    return { file: new File([bytes as Uint8Array<ArrayBuffer>], name, { type: "application/pdf" }), num };
  }

  function download(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const summary = (num: string) =>
    `Hola${doc.client.name ? " " + doc.client.name.split(" ")[0] : ""}, te comparto la cotización ${num} de Tours 360°.\n` +
    `Total: ${usd2(t.total)}${doc.currency !== "usd" ? ` (${rd2(t.total, doc.rate)})` : ""}${doc.itbis ? ", ITBIS incluido" : ""}.\n` +
    (doc.monthlyNote ? doc.monthlyNote + "\n" : "") +
    `Válida por ${doc.validityDays} días. Cualquier duda, aquí estoy.`;

  async function onDownload() {
    setBusy("pdf");
    try {
      const q = await persist(current?.status === "borrador" || !current ? "enviada" : undefined);
      if (!q) return;
      const { file } = await pdfFile(q);
      download(file);
    } catch (e) {
      toast({ title: "No se pudo crear el PDF", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function onShare() {
    setBusy("share");
    try {
      const q = await persist(current?.status === "borrador" || !current ? "enviada" : undefined);
      if (!q) return;
      const { file, num } = await pdfFile(q);
      const text = summary(num);
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Cotización ${num}`, text });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }
      // Sin compartir nativo (computadora): se descarga el PDF y se abre WhatsApp con el mensaje
      download(file);
      const phone = normalizeWhatsapp(doc.client.phone);
      window.open(phone ? whatsappLink(phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      toast({ title: "PDF descargado", description: "Adjúntalo en el chat de WhatsApp que se abrió." });
    } catch (e) {
      toast({ title: "No se pudo compartir", description: String(e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function onMail() {
    setBusy("mail");
    try {
      const q = await persist(current?.status === "borrador" || !current ? "enviada" : undefined);
      if (!q) return;
      const { file, num } = await pdfFile(q);
      download(file);
      const href = `mailto:${encodeURIComponent(doc.client.email.trim())}?subject=${encodeURIComponent(`Cotización ${num} · Tours 360°`)}&body=${encodeURIComponent(summary(num))}`;
      window.location.href = href;
      toast({ title: "PDF descargado", description: "Adjúntalo en el correo que se abrió." });
    } finally {
      setBusy(null);
    }
  }

  async function onInvoice() {
    setBusy("invoice");
    const q = await persist("aceptada");
    setBusy(null);
    if (!q) return;
    const taxId = doc.client.taxId.replace(/\D/g, "");
    navigate("/admin/contabilidad?tab=ingresos", {
      state: {
        fromQuoteId: q.id,
        invoicePrefill: {
          cliente_nombre: doc.client.company.trim() || doc.client.name.trim(),
          cliente_rnc: taxId || null,
          cliente_tipo_id: taxId.length === 9 ? 1 : 2, // 9 dígitos = RNC, 11 = cédula
          tipo_ncf: taxId.length === 9 ? "E31" : "E32", // crédito fiscal si tiene RNC, consumo si no
          monto_gravado_18: Math.round(t.subtotal * doc.rate * 100) / 100,
          notas: `Cotización ${quoteNumber(q.number, q.created_at)} (Tours 360°): ${usd2(t.subtotal)} a tasa RD$${doc.rate}.`,
        },
      },
    });
  }

  const num = current ? quoteNumber(current.number, current.created_at) : "Nueva";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0">
        <div className="min-w-0 p-4 sm:p-5 space-y-5 text-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0F2B4C]"><FileText size={18} className="text-[#F0A030]" /> Cotización · {num}</DialogTitle>
            <DialogDescription className="text-left">Revisa los datos, quita el ITBIS si es una cotización directa y descárgala o compártela.</DialogDescription>
          </DialogHeader>

          {/* Cliente */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Nombre del cliente"><input className={inputCls} value={doc.client.name} onChange={(e) => setClient("name", e.target.value)} placeholder="Nombre y apellido" /></Field>
            <Field label="Empresa (opcional)"><input className={inputCls} value={doc.client.company} onChange={(e) => setClient("company", e.target.value)} placeholder="Inmobiliaria, condominio…" /></Field>
            <Field label="RNC o cédula (opcional)"><input className={inputCls} value={doc.client.taxId} onChange={(e) => setClient("taxId", e.target.value)} inputMode="numeric" /></Field>
            <Field label="WhatsApp / teléfono"><input className={inputCls} value={doc.client.phone} onChange={(e) => setClient("phone", e.target.value)} inputMode="tel" /></Field>
            <Field label="Correo"><input className={inputCls} value={doc.client.email} onChange={(e) => setClient("email", e.target.value)} inputMode="email" /></Field>
            <Field label="Fecha"><input type="date" className={inputCls} value={doc.date} onChange={(e) => setD("date", e.target.value)} /></Field>
          </div>

          {/* Líneas */}
          <div className="min-w-0 space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-gray-500"><th className="py-1.5">Descripción</th><th className="py-1.5 w-20 text-right">Cant.</th><th className="py-1.5 w-32 text-right">Precio US$</th><th className="py-1.5 w-28 text-right">Importe</th><th className="w-8" /></tr></thead>
                <tbody>
                  {doc.lines.map((l, i) => (
                    <tr key={i} className="border-t border-gray-100 align-top">
                      <td className="py-1.5 pr-2"><textarea rows={2} className={cn(inputCls, "w-full resize-y")} value={l.desc} onChange={(e) => setLine(i, { desc: e.target.value })} aria-label="Descripción" /></td>
                      <td className="py-1.5 px-1"><input type="number" min={0} className={cn(inputCls, "w-full text-right tabular-nums")} value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} aria-label="Cantidad" /></td>
                      <td className="py-1.5 px-1"><input type="number" step="0.01" className={cn(inputCls, "w-full text-right tabular-nums")} value={l.unit} onChange={(e) => setLine(i, { unit: Number(e.target.value) || 0 })} aria-label="Precio" /></td>
                      <td className="py-2.5 px-1 text-right tabular-nums font-semibold text-[#0F2B4C]">{usd2(l.qty * l.unit)}</td>
                      <td className="py-1.5"><button type="button" onClick={() => setD("lines", doc.lines.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Quitar línea"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setD("lines", [...doc.lines, { desc: "", qty: 1, unit: 0 }])} className="inline-flex items-center gap-1.5 text-[#0F2B4C] font-semibold hover:text-[#b8761a]"><Plus size={14} /> Agregar línea</button>
          </div>

          {/* Opciones y totales */}
          <div className="grid md:grid-cols-[minmax(0,1fr)_280px] gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2"><Switch checked={doc.itbis} onCheckedChange={(v) => setD("itbis", v)} /> ITBIS 18%</label>
                <label className={cn("flex items-center gap-2", !bankReady && "opacity-50")} title={bankReady ? "" : "Agrega tus datos bancarios en “Datos para cotizaciones”"}>
                  <Switch checked={doc.includeBank && bankReady} disabled={!bankReady} onCheckedChange={(v) => setD("includeBank", v)} /> Datos bancarios
                </label>
                <div className="flex rounded-lg border border-gray-200 bg-white p-0.5" role="group" aria-label="Moneda del documento">
                  {(["usd", "rd", "both"] as const).map((k) => (
                    <button key={k} type="button" onClick={() => setD("currency", k)} className={cn("px-2.5 py-1 rounded-md text-xs font-semibold", doc.currency === k ? "bg-[#0F2B4C] text-white" : "text-[#0F2B4C]")}>{k === "usd" ? "US$" : k === "rd" ? "RD$" : "US$ + RD$"}</button>
                  ))}
                </div>
              </div>
              {!bankReady && <p className="text-xs text-gray-500">Para poder agregar los datos bancarios, llénalos una vez en “Datos para cotizaciones”, en la página de precios. No son obligatorios.</p>}
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Tasa RD$ por US$1"><input type="number" step="0.25" className={inputCls} value={doc.rate} onChange={(e) => setD("rate", Number(e.target.value) || 0)} /></Field>
                <Field label="Válida por (días)"><input type="number" min={1} className={inputCls} value={doc.validityDays} onChange={(e) => setD("validityDays", Number(e.target.value) || 0)} /></Field>
              </div>
              <Field label="Nota de suscripción (fuera del total)"><input className={inputCls} value={doc.monthlyNote} onChange={(e) => setD("monthlyNote", e.target.value)} placeholder="Solo si es suscripción" /></Field>
              <Field label="Condiciones"><textarea rows={4} className={cn(inputCls, "resize-y")} value={doc.conditions} onChange={(e) => setD("conditions", e.target.value)} /></Field>
            </div>
            <div className="rounded-xl bg-[#0F2B4C] text-white p-4 space-y-2 self-start">
              <div className="flex justify-between text-[#BFD0E3]"><span>Subtotal</span><span className="tabular-nums">{usd2(t.subtotal)}</span></div>
              {doc.itbis && <div className="flex justify-between text-[#BFD0E3]"><span>ITBIS 18%</span><span className="tabular-nums">{usd2(t.itbis)}</span></div>}
              <div className="flex justify-between items-baseline border-t border-white/15 pt-2"><span className="font-semibold">Total</span><span className="text-2xl font-bold text-[#F0A030] tabular-nums">{usd2(t.total)}</span></div>
              <p className="text-right text-xs text-[#BFD0E3] tabular-nums">{rd2(t.total, doc.rate)}</p>
              {!doc.itbis && <p className="text-[11px] text-[#BFD0E3]">Cotización directa, sin ITBIS.</p>}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <Button onClick={save} disabled={!!busy} variant="outline">{busy === "save" ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} Guardar</Button>
            <Button onClick={onDownload} disabled={!!busy} className="bg-[#0F2B4C] hover:bg-[#173a63]">{busy === "pdf" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />} Descargar PDF</Button>
            <Button onClick={onShare} disabled={!!busy} className="bg-[#25D366] hover:brightness-110 text-white">{busy === "share" ? <Loader2 className="animate-spin" size={15} /> : <><Share2 size={15} className="sm:hidden" /><WhatsAppIcon size={15} className="hidden sm:block" /></>} Compartir</Button>
            <Button onClick={onMail} disabled={!!busy} variant="outline">{busy === "mail" ? <Loader2 className="animate-spin" size={15} /> : <Mail size={15} />} Correo</Button>
            <Button onClick={onInvoice} disabled={!!busy} variant="outline" className="sm:ml-auto border-[#F0A030] text-[#9A5F10] hover:bg-[#FCEBD0]">{busy === "invoice" ? <Loader2 className="animate-spin" size={15} /> : <Receipt size={15} />} Aceptada: hacer factura</Button>
          </div>
          <p className="text-[11px] text-gray-500">“Aceptada: hacer factura” abre Contabilidad › Ingresos con el cliente y el monto ya llenos; ahí generas el comprobante fiscal (NCF).</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
