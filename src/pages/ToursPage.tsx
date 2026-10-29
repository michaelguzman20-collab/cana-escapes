import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Rotate3d, MapPin, BedDouble, Loader2, Globe, Building2, Palmtree, KeyRound, BadgeCheck, Smartphone,
  Music, Languages, MessageCircle, Plane, Camera, MessagesSquare, CalendarCheck, Link2, Check,
} from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { SEO_PAGES } from "@/lib/seoPages";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { descriptionIn, fetchPublishedTours, markToursSeen, whatsappLink, type TourCard } from "@/lib/tours";
import { PanoThumb } from "@/components/tours/PanoThumb";

// Página de Tours 360 como servicio aparte (canaescapes.com/tours): está pensada para propietarios,
// inmobiliarias y anfitriones de renta corta. No usa el menú de Cana Escapes.
// Solo muestra los tours marcados como "ejemplo" (tours.showcase); los de clientes se comparten por su enlace.
// A propósito da pocos detalles: la idea es que escriban por WhatsApp para una demostración.

const WA_NUMBER = "18092102773";
const NAVY = "#0F2B4C";

const TEXT = {
  es: {
    badge: "Recorridos virtuales 360°",
    title: "Tu propiedad, en 360°",
    subtitle:
      "Que tus clientes caminen por la propiedad desde su teléfono, antes de visitarla o reservar. Un enlace con tu marca para tu web, Instagram o WhatsApp.",
    seeDemo: "Ver un ejemplo",
    askDemo: "Pide una demostración",
    new: "Nuevo en Bávaro y Punta Cana",
    demoTitle: "Pruébalo tú mismo",
    demoDesc: "Abre un recorrido de ejemplo y muévete por cada espacio.",
    demoEmpty: "Te mostramos un recorrido en vivo: escríbenos y coordinamos una demostración.",
    open: "Abrir recorrido",
    bedrooms: "hab.",
    loading: "Cargando…",
    forTitle: "Pensado para",
    for: [
      { icon: Building2, title: "Inmobiliarias y agentes", desc: "Muestra la propiedad completa a compradores de cualquier país sin moverte de la oficina." },
      { icon: Palmtree, title: "Rentas cortas", desc: "Tus huéspedes ven exactamente lo que reservan. Más confianza, menos preguntas." },
      { icon: KeyRound, title: "Propiedades en venta", desc: "Llega solo el cliente que de verdad está interesado: ya recorrió la propiedad." },
    ],
    whyTitle: "Lo que recibes",
    why: [
      { icon: BadgeCheck, title: "Con tu marca", desc: "Tu logo dentro del recorrido." },
      { icon: MessageCircle, title: "Contacto directo", desc: "Botones a tu WhatsApp e Instagram." },
      { icon: Link2, title: "Tu propio enlace", desc: "Solo tu propiedad, lista para compartir." },
      { icon: Music, title: "Música ambiental", desc: "Varios estilos para elegir." },
      { icon: Smartphone, title: "En cualquier pantalla", desc: "Teléfono, tableta o computadora, sin instalar nada." },
      { icon: Languages, title: "Español e inglés", desc: "Para clientes locales y extranjeros." },
    ],
    packsTitle: "Paquetes",
    packsDesc: "Cada propiedad es distinta: armamos el precio contigo. Pago único o con acompañamiento y seguimiento.",
    packs: [
      { name: "Esencial", items: ["Tour virtual 360°", "Tu logo, WhatsApp e Instagram", "Enlace para compartir"] },
      { name: "Plus", items: ["Todo lo de Esencial", "Fotos y video con drone"], featured: true },
      { name: "Premium", items: ["Todo lo de Plus", "Fotografía arquitectónica y de interiores", "Acompañamiento y seguimiento"] },
    ],
    featured: "Más pedido",
    ask: "Consultar",
    stepsTitle: "Cómo empezamos",
    steps: [
      { icon: MessagesSquare, title: "Conversamos", desc: "Te mostramos una muestra en vivo y respondemos tus preguntas." },
      { icon: CalendarCheck, title: "Visitamos la propiedad", desc: "Coordinamos el día para las tomas y mediciones." },
      { icon: Rotate3d, title: "Recibes tu enlace", desc: "Tu recorrido listo para compartir con tus clientes." },
    ],
    ctaTitle: "¿Quieres ver cómo quedaría tu propiedad?",
    ctaDesc: "Escríbenos y te mostramos un ejemplo en vivo, sin compromiso.",
    by: "un servicio de",
    waGeneral: "Hola, me interesa Tours 360 para mi propiedad. ¿Me pueden mostrar una demostración?",
    waPack: (p: string) => `Hola, me interesa el paquete ${p} de Tours 360. ¿Me pueden dar más información?`,
  },
  en: {
    badge: "360° virtual tours",
    title: "Your property, in 360°",
    subtitle:
      "Let your clients walk through the property from their phone before visiting or booking. A branded link for your website, Instagram or WhatsApp.",
    seeDemo: "See an example",
    askDemo: "Request a demo",
    new: "New in Bávaro & Punta Cana",
    demoTitle: "Try it yourself",
    demoDesc: "Open a sample tour and move through every space.",
    demoEmpty: "We'll show you a live tour: message us and we'll set up a demo.",
    open: "Open tour",
    bedrooms: "bd",
    loading: "Loading…",
    forTitle: "Made for",
    for: [
      { icon: Building2, title: "Real estate agencies", desc: "Show the whole property to buyers anywhere in the world, from your office." },
      { icon: Palmtree, title: "Short-term rentals", desc: "Guests see exactly what they book. More trust, fewer questions." },
      { icon: KeyRound, title: "Properties for sale", desc: "Only truly interested buyers show up: they already toured it." },
    ],
    whyTitle: "What you get",
    why: [
      { icon: BadgeCheck, title: "Your brand", desc: "Your logo inside the tour." },
      { icon: MessageCircle, title: "Direct contact", desc: "Buttons to your WhatsApp and Instagram." },
      { icon: Link2, title: "Your own link", desc: "Only your property, ready to share." },
      { icon: Music, title: "Background music", desc: "Several styles to choose from." },
      { icon: Smartphone, title: "Any screen", desc: "Phone, tablet or computer, nothing to install." },
      { icon: Languages, title: "Spanish & English", desc: "For local and international clients." },
    ],
    packsTitle: "Packages",
    packsDesc: "Every property is different, so we price it with you. One-time payment or ongoing support.",
    packs: [
      { name: "Essential", items: ["360° virtual tour", "Your logo, WhatsApp and Instagram", "Shareable link"] },
      { name: "Plus", items: ["Everything in Essential", "Drone photos and video"], featured: true },
      { name: "Premium", items: ["Everything in Plus", "Architectural and interior photography", "Ongoing support and follow-up"] },
    ],
    featured: "Most requested",
    ask: "Ask about it",
    stepsTitle: "How we start",
    steps: [
      { icon: MessagesSquare, title: "We talk", desc: "We show you a live sample and answer your questions." },
      { icon: CalendarCheck, title: "We visit the property", desc: "We schedule a day for the shoot and measurements." },
      { icon: Rotate3d, title: "You get your link", desc: "Your tour, ready to share with your clients." },
    ],
    ctaTitle: "Want to see how your property would look?",
    ctaDesc: "Message us and we'll show you a live example, no strings attached.",
    by: "a service by",
    waGeneral: "Hi, I'm interested in Tours 360 for my property. Could you show me a demo?",
    waPack: (p: string) => `Hi, I'm interested in the Tours 360 ${p} package. Could you send me more information?`,
  },
};

const PACK_ICONS = [Rotate3d, Plane, Camera];

function Tours360Mark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-[#0F2B4C] border-[3px] border-[#F0A030] shrink-0"
      style={{ width: size, height: size }}
    >
      <Rotate3d size={size * 0.52} className="text-[#F0A030]" strokeWidth={1.8} />
    </span>
  );
}

function ToursContent() {
  const { lang, setLang } = useLang();
  const tx = TEXT[lang === "en" ? "en" : "es"];
  const [tours, setTours] = useState<TourCard[] | null>(null);

  useEffect(() => {
    markToursSeen(); // ya conoce los tours: el botón flotante deja de decir "Nuevo"
    fetchPublishedTours()
      .then(setTours)
      .catch(() => setTours([]));
  }, []);

  const wa = (text: string) => whatsappLink(WA_NUMBER, text);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0F2B4C]">
      {/* Encabezado propio de Tours 360 */}
      <header className="absolute top-0 inset-x-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link to="/tours" className="flex items-center gap-2.5 min-w-0">
            <Tours360Mark size={36} />
            <span className="text-white font-serif font-bold text-lg sm:text-xl whitespace-nowrap">
              Tours <span className="text-[#F0A030]">360</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              aria-label={lang === "es" ? "View in English" : "Ver en español"}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/5"
            >
              <Globe size={15} />
              <span className="uppercase font-semibold">{lang === "es" ? "EN" : "ES"}</span>
            </button>
            <a
              href={wa(tx.waGeneral)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:brightness-110"
            >
              <WhatsAppIcon size={16} />
              <span className="hidden sm:inline">{tx.askDemo}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Portada */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#173a63_0%,#0F2B4C_55%,#0b1f38_100%)] pt-32 pb-28 sm:pt-40 sm:pb-36">
        <div aria-hidden className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full border border-[#F0A030]/10" />
        <div aria-hidden className="absolute -right-10 -top-10 w-[300px] h-[300px] rounded-full border border-[#F0A030]/15" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F0A030]/40 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
            <Rotate3d size={14} />
            {tx.badge}
          </span>
          <h1 className="mt-6 text-4xl sm:text-6xl font-serif font-bold text-white">{tx.title}</h1>
          <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">{tx.subtitle}</p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#F0A030] text-[#0F2B4C] font-semibold hover:bg-[#e5952a] shadow-lg shadow-[#F0A030]/20"
            >
              {tx.seeDemo}
            </a>
            <a
              href={wa(tx.waGeneral)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/25 text-white font-semibold hover:bg-white/5"
            >
              <WhatsAppIcon size={18} /> {tx.askDemo}
            </a>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">{tx.new}</p>
        </div>
      </section>

      {/* Ejemplos */}
      <section id="demo" className="-mt-16 relative max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-serif font-bold">{tx.demoTitle}</h2>
          <p className="mt-1 text-gray-500">{tx.demoDesc}</p>
          <div className="mt-6">
            {tours === null ? (
              <div className="py-10 flex items-center justify-center text-gray-500">
                <Loader2 className="animate-spin mr-2" size={18} /> {tx.loading}
              </div>
            ) : tours.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                <Rotate3d size={40} className="mx-auto mb-3 text-[#F0A030]" />
                <p className="max-w-md mx-auto">{tx.demoEmpty}</p>
                <a
                  href={wa(tx.waGeneral)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#25D366] text-white font-semibold hover:brightness-110"
                >
                  <WhatsAppIcon size={16} /> {tx.askDemo}
                </a>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tours.map((tour) => (
                  <Link
                    key={tour.id}
                    to={`/tour/${tour.slug}`}
                    className="group rounded-xl overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow"
                  >
                    <div className="relative bg-gray-200 overflow-hidden">
                      <PanoThumb
                        src={tour.cover_url}
                        yaw={tour.start?.initial_yaw}
                        pitch={tour.start?.initial_pitch}
                        fov={tour.start?.fov_initial}
                        alt={tour.title}
                        className="group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 text-white text-xs font-semibold">
                        <Rotate3d size={13} /> 360°
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif font-bold text-lg">{tour.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {tour.location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {tour.location}</span>}
                        {tour.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {tour.bedrooms} {tx.bedrooms}</span>}
                      </div>
                      {descriptionIn(tour, lang) && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{descriptionIn(tour, lang)}</p>}
                      <span className="mt-3 inline-block text-sm font-semibold text-[#b8761a] group-hover:underline">{tx.open} →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Para quién */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
        <h2 className="text-3xl font-serif font-bold text-center">{tx.forTitle}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {tx.for.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm">
              <span className="w-11 h-11 rounded-xl bg-[#F0A030]/15 text-[#b8761a] flex items-center justify-center">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-serif font-bold text-lg">{title}</h3>
              <p className="mt-1.5 text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lo que recibes */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
        <h2 className="text-3xl font-serif font-bold text-center">{tx.whyTitle}</h2>
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-3">
          {tx.why.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 bg-white rounded-xl p-4 sm:p-5 shadow-sm">
              <Icon size={20} className="shrink-0 mt-0.5 text-[#F0A030]" />
              <div className="min-w-0">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Paquetes (sin precios: se cotizan en la reunión) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
        <h2 className="text-3xl font-serif font-bold text-center">{tx.packsTitle}</h2>
        <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">{tx.packsDesc}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3 items-stretch">
          {tx.packs.map((p, i) => {
            const Icon = PACK_ICONS[i];
            return (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-2xl p-6 shadow-sm ${p.featured ? "bg-[#0F2B4C] text-white ring-2 ring-[#F0A030]" : "bg-white"}`}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-[#F0A030] text-[#0F2B4C] text-[11px] font-bold uppercase tracking-wide">
                    {tx.featured}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <Icon size={22} className="text-[#F0A030]" />
                  <h3 className="font-serif font-bold text-2xl">{p.name}</h3>
                </div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.items.map((it) => (
                    <li key={it} className={`flex items-start gap-2 text-sm ${p.featured ? "text-white/85" : "text-gray-600"}`}>
                      <Check size={16} className="shrink-0 mt-0.5 text-[#F0A030]" /> {it}
                    </li>
                  ))}
                </ul>
                <a
                  href={wa(tx.waPack(p.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold ${
                    p.featured ? "bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]" : "border border-[#0F2B4C]/20 hover:bg-[#0F2B4C]/5"
                  }`}
                >
                  <WhatsAppIcon size={16} /> {tx.ask}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cómo empezamos */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
        <h2 className="text-3xl font-serif font-bold text-center">{tx.stepsTitle}</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {tx.steps.map(({ icon: Icon, title, desc }, i) => (
            <li key={title} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#0F2B4C] text-[#F0A030] font-bold flex items-center justify-center">{i + 1}</span>
                <Icon size={20} className="text-[#F0A030]" />
              </div>
              <h3 className="mt-4 font-serif font-bold text-lg">{title}</h3>
              <p className="mt-1.5 text-gray-600 text-sm leading-relaxed">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Llamado final */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-3xl p-8 sm:p-12 text-center text-white" style={{ background: NAVY }}>
          <div className="flex justify-center"><Tours360Mark size={52} /></div>
          <h2 className="mt-5 text-2xl sm:text-3xl font-serif font-bold">{tx.ctaTitle}</h2>
          <p className="mt-3 text-white/70">{tx.ctaDesc}</p>
          <a
            href={wa(tx.waGeneral)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white font-semibold hover:brightness-110"
          >
            <WhatsAppIcon size={18} /> {tx.askDemo}
          </a>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <p className="flex items-center justify-center gap-2">
          <Rotate3d size={15} className="text-[#F0A030]" /> Tours 360 · {tx.by}{" "}
          <Link to="/" className="font-semibold text-[#0F2B4C] hover:underline">Cana Escapes</Link>
        </p>
        <p className="mt-1 text-xs">Bávaro · Punta Cana · República Dominicana</p>
      </footer>
    </div>
  );
}

export function ToursPage() {
  useSeo({
    ...SEO_PAGES["/tours"],
    path: "/tours",
  });
  return (
    <LangProvider>
      <ToursContent />
    </LangProvider>
  );
}
