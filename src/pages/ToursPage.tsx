import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Rotate3d, MapPin, BedDouble, Loader2, Globe, Building2, Palmtree, KeyRound, Smartphone, Layers,
  Languages, MessageCircle, Gem, Crown, CalendarDays, MessagesSquare, CalendarCheck, Link2, Check, Sparkles,
  ShieldCheck, HeartHandshake, Plane, CloudRain, Clock, BadgeCheck, ArrowRight, Music,
} from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { SEO_PAGES } from "@/lib/seoPages";
import { WhatsAppIcon } from "@/components/cana/WhatsAppIcon";
import { cn } from "@/lib/utils";
import { descriptionIn, fetchPublishedTours, markToursSeen, mediaUrl, whatsappLink, type TourCard } from "@/lib/tours";
import { PropertyArt, CustomCover } from "@/components/tours/PropertyArt";
import { DemoScheduler } from "@/components/tours/DemoScheduler";

// Página de Tours 360 como servicio aparte (canaescapes.com/tours): está pensada para propietarios,
// inmobiliarias, brokers y anfitriones de renta corta. No usa el menú de Cana Escapes.
// Solo muestra los tours marcados como "ejemplo" (tours.showcase), con una ilustración según el tipo de
// propiedad (tours.card_image) en vez de la foto real. Los tours de clientes se comparten por su enlace.
// A propósito da pocos detalles: la idea es que escriban por WhatsApp para una demostración.

const WA_NUMBER = "18092102773";

const TEXT = {
  es: {
    badge: "Recorridos virtuales 360°",
    title: "Tu propiedad, en",
    subtitle:
      "Que tus clientes caminen por la propiedad desde su teléfono, estén donde estén, antes de visitarla o reservar. Un enlace con tu marca para tu web, Instagram o WhatsApp.",
    seeDemo: "Ver un ejemplo",
    askDemo: "Contáctanos",
    schedule: "Agendar demostración",
    chips: ["Primero en Bávaro y Punta Cana", "Desde cualquier país", "Con tu marca"],
    demoKicker: "Pruébalo tú mismo",
    demoEmpty: "Te mostramos un recorrido en vivo: escríbenos y coordinamos una demostración.",
    open: "Entrar al recorrido 360°",
    bedrooms: "hab.",
    loading: "Cargando…",
    forKicker: "Pensado para",
    forTitle: "Quien vende o alquila propiedades",
    for: [
      { icon: Building2, title: "Inmobiliarias, agentes y brokers", desc: "Muestra cada propiedad completa a compradores de cualquier país sin moverte de la oficina." },
      { icon: Layers, title: "Carteras con muchas propiedades", desc: "Si manejas volumen, dale a cada propiedad más vistosidad y destácate frente a la competencia." },
      { icon: Palmtree, title: "Rentas cortas", desc: "Tus huéspedes ven exactamente lo que reservan. Más confianza, menos preguntas." },
      { icon: KeyRound, title: "Propiedades en venta", desc: "El recorrido 360° es lo que lleva al comprador a decidirse: conoce cada rincón y llega listo para cerrar la compra." },
    ],
    timeKicker: "Ahorra tiempo",
    timeTitle: "La visita llega a tu cliente, no al revés",
    time: [
      { icon: Plane, title: "Clientes en el extranjero", desc: "Recorren la propiedad desde su país, sin viajar para una visita guiada." },
      { icon: CloudRain, title: "Sin depender del clima ni la distancia", desc: "Lluvia, tráfico o kilómetros dejan de ser un problema para mostrar." },
      { icon: Clock, title: "Tu tiempo rinde más", desc: "El recorrido presenta la propiedad por ti, las 24 horas. Tú y tus clientes ganan tiempo para lo importante: decidir y cerrar." },
    ],
    whyKicker: "Lo que recibes",
    whyTitle: "Algo propio, nuevo en la zona",
    highlights: [
      { icon: Sparkles, title: "Innovador y propio", desc: "Un servicio que aún no se usa en Bávaro y Punta Cana. Tus propiedades se ven diferentes." },
      { icon: ShieldCheck, title: "Prolijo y de confianza", desc: "Cuidamos cada detalle: tomas, edición y presentación. Trato directo, sin intermediarios." },
      { icon: HeartHandshake, title: "Seguimiento", desc: "Te acompañamos después de la entrega: cambios, nuevas fotos y estadísticas de visitas." },
    ],
    why: [
      { icon: BadgeCheck, title: "Con tu marca", desc: "Tu logo dentro del recorrido." },
      { icon: MessageCircle, title: "Contacto directo", desc: "Botones a tu WhatsApp e Instagram." },
      { icon: Link2, title: "Tu propio enlace", desc: "Solo tu propiedad, lista para compartir." },
      { icon: Smartphone, title: "En cualquier pantalla", desc: "Teléfono, tableta o computadora, sin instalar nada." },
      { icon: Languages, title: "Español e inglés", desc: "Para clientes locales y extranjeros." },
      { icon: Music, title: "Música ambiental", desc: "Varios estilos para elegir." },
    ],
    packsKicker: "Paquetes",
    packsTitle: "Elige hasta dónde llegar",
    packsDesc: "Cada propiedad es distinta: armamos el precio contigo. Pago único o con acompañamiento y seguimiento.",
    packs: [
      { name: "Esencial", items: ["Tour virtual 360°", "Tu logo, WhatsApp e Instagram", "Enlace para compartir"] },
      { name: "Plus", items: ["Todo lo de Esencial", "Más fotografía de interiores", "Acompañamiento"], featured: true },
      { name: "Premium", items: ["Todo lo de Plus", "Fotos y video con drone", "Acompañamiento y seguimiento sin extras"] },
    ],
    featured: "Más solicitado",
    ask: "Consultar",
    stepsKicker: "Cómo empezamos",
    stepsTitle: "Tres pasos y listo",
    steps: [
      { icon: MessagesSquare, title: "Conversamos", desc: "Por WhatsApp y en una breve reunión presencial o virtual: te mostramos una muestra y respondemos tus preguntas." },
      { icon: CalendarCheck, title: "Visitamos la propiedad", desc: "Coordinamos el día para las tomas de fotos y las mediciones." },
      { icon: Rotate3d, title: "Recibes tu enlace", desc: "Tu recorrido, totalmente listo para ti y para tus clientes." },
    ],
    ctaTitle: "¿Quieres ver cómo quedaría tu propiedad?",
    ctaDesc: "Escríbenos y te mostramos un ejemplo en vivo, sin compromiso.",
    by: "un servicio de",
    waGeneral: "Hola, me interesa Tours 360 para mi propiedad. ¿Me pueden mostrar una demostración?",
    waPack: (p: string) => `Hola, me interesa el paquete ${p} de Tours 360. ¿Me pueden dar más información?`,
  },
  en: {
    badge: "360° virtual tours",
    title: "Your property, in",
    subtitle:
      "Let your clients walk through the property from their phone, wherever they are, before visiting or booking. A branded link for your website, Instagram or WhatsApp.",
    seeDemo: "See an example",
    askDemo: "Contact us",
    schedule: "Book a demo",
    chips: ["First in Bávaro & Punta Cana", "From any country", "With your brand"],
    demoKicker: "Try it yourself",
    demoEmpty: "We'll show you a live tour: message us and we'll set up a demo.",
    open: "Enter the 360° tour",
    bedrooms: "bd",
    loading: "Loading…",
    forKicker: "Made for",
    forTitle: "Anyone who sells or rents property",
    for: [
      { icon: Building2, title: "Agencies, agents & brokers", desc: "Show every property in full to buyers anywhere in the world, from your office." },
      { icon: Layers, title: "Large portfolios", desc: "If you handle volume, make every listing stand out from the competition." },
      { icon: Palmtree, title: "Short-term rentals", desc: "Guests see exactly what they book. More trust, fewer questions." },
      { icon: KeyRound, title: "Properties for sale", desc: "The 360° tour is what helps buyers decide: they know every corner and come ready to close." },
    ],
    timeKicker: "Save time",
    timeTitle: "The visit goes to your client, not the other way around",
    time: [
      { icon: Plane, title: "Clients abroad", desc: "They tour the property from their country, no trip needed for a guided visit." },
      { icon: CloudRain, title: "No weather or distance issues", desc: "Rain, traffic or miles no longer get in the way of showing." },
      { icon: Clock, title: "Your time goes further", desc: "The tour shows the property for you, 24/7. You and your clients gain time for what matters: deciding and closing." },
    ],
    whyKicker: "What you get",
    whyTitle: "Something unique, new to the area",
    highlights: [
      { icon: Sparkles, title: "Innovative & unique", desc: "A service not yet used in Bávaro and Punta Cana. Your listings look different." },
      { icon: ShieldCheck, title: "Careful & trustworthy", desc: "We care about every detail: shooting, editing and presentation. Direct contact, no middlemen." },
      { icon: HeartHandshake, title: "Follow-up", desc: "We stay with you after delivery: changes, new photos and visit statistics." },
    ],
    why: [
      { icon: BadgeCheck, title: "Your brand", desc: "Your logo inside the tour." },
      { icon: MessageCircle, title: "Direct contact", desc: "Buttons to your WhatsApp and Instagram." },
      { icon: Link2, title: "Your own link", desc: "Only your property, ready to share." },
      { icon: Smartphone, title: "Any screen", desc: "Phone, tablet or computer, nothing to install." },
      { icon: Languages, title: "Spanish & English", desc: "For local and international clients." },
      { icon: Music, title: "Background music", desc: "Several styles to choose from." },
    ],
    packsKicker: "Packages",
    packsTitle: "Choose how far to go",
    packsDesc: "Every property is different, so we price it with you. One-time payment or ongoing support.",
    packs: [
      { name: "Essential", items: ["360° virtual tour", "Your logo, WhatsApp and Instagram", "Shareable link"] },
      { name: "Plus", items: ["Everything in Essential", "More interior photography", "Support"], featured: true },
      { name: "Premium", items: ["Everything in Plus", "Drone photos and video", "Support and follow-up at no extra cost"] },
    ],
    featured: "Most requested",
    ask: "Ask about it",
    stepsKicker: "How we start",
    stepsTitle: "Three steps and done",
    steps: [
      { icon: MessagesSquare, title: "We talk", desc: "On WhatsApp and in a short in-person or video meeting: we show you a sample and answer your questions." },
      { icon: CalendarCheck, title: "We visit the property", desc: "We schedule the day for the photo shoot and measurements." },
      { icon: Rotate3d, title: "You get your link", desc: "Your tour, fully ready for you and your clients." },
    ],
    ctaTitle: "Want to see how your property would look?",
    ctaDesc: "Message us and we'll show you a live example, no strings attached.",
    by: "a service by",
    waGeneral: "Hi, I'm interested in Tours 360 for my property. Could you show me a demo?",
    waPack: (p: string) => `Hi, I'm interested in the Tours 360 ${p} package. Could you send me more information?`,
  },
};

const PACK_ICONS = [Rotate3d, Gem, Crown];

/** Distintivo de Tours 360: círculo azul con borde ámbar; con `spin` las flechas giran (solo encabezado y portada) */
function Tours360Mark({ size = 40, spin }: { size?: number; spin?: boolean }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-[#0F2B4C] border-[3px] border-[#F0A030] shrink-0 shadow-lg shadow-[#F0A030]/10"
      style={{ width: size, height: size }}
    >
      <Rotate3d size={size * 0.52} className={cn("text-[#F0A030]", spin && "tours360-spin")} strokeWidth={1.8} />
    </span>
  );
}

/** "360°" con el círculo de grados arriba, como en el título de la portada */
function Deg360({ className }: { className?: string }) {
  return (
    <span className={cn("whitespace-nowrap", className)}>
      360<span className="align-super text-[0.6em] leading-none">°</span>
    </span>
  );
}

/** Títulos de sección: rótulo ámbar + título grande */
function Heading({ kicker, title, light, desc }: { kicker: string; title: string; light?: boolean; desc?: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto" data-reveal>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F0A030]">{kicker}</p>
      <h2 className={cn("mt-2 text-3xl sm:text-4xl font-serif font-bold", light ? "text-white" : "text-[#0F2B4C]")}>{title}</h2>
      {desc && <p className={cn("mt-3", light ? "text-white/70" : "text-gray-600")}>{desc}</p>}
    </div>
  );
}

// Elementos con data-reveal aparecen subiendo al entrar en pantalla (los de una misma fila, uno tras otro)
function useReveal(root: React.RefObject<HTMLElement>, deps: unknown[]) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"));
    targets.forEach((t) => {
      t.classList.add("reveal");
      const i = Number(t.dataset.reveal || 0);
      if (i) t.style.transitionDelay = `${i * 90}ms`;
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    const failsafe = window.setTimeout(() => targets.forEach((t) => t.classList.add("is-visible")), 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function ToursContent() {
  const { lang, setLang } = useLang();
  const tx = TEXT[lang === "en" ? "en" : "es"];
  const [tours, setTours] = useState<TourCard[] | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const page = useRef<HTMLDivElement>(null);
  useReveal(page, [tours === null]);

  useEffect(() => {
    markToursSeen(); // ya conoce los tours: el botón flotante deja de decir "Nuevo"
    fetchPublishedTours()
      .then(setTours)
      .catch(() => setTours([]));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const wa = (text: string) => whatsappLink(WA_NUMBER, text);

  return (
    <div ref={page} className="min-h-screen bg-[#F5F7FA] text-[#0F2B4C] overflow-x-hidden">
      {/* Encabezado fijo: el logo vuelve al inicio; idioma y WhatsApp siempre a mano */}
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-40 transition-all duration-300",
          scrolled ? "bg-[#0F2B4C]/95 backdrop-blur-md shadow-lg" : "bg-transparent",
        )}
      >
        <div className={cn("max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 transition-all", scrolled ? "h-16" : "h-16 sm:h-20")}>
          <a
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 min-w-0"
            aria-label="Tours 360° — inicio"
          >
            <Tours360Mark size={38} spin />
            <span className="text-white font-serif font-bold text-lg sm:text-xl whitespace-nowrap">
              Tours <Deg360 className="text-[#F0A030]" />
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScheduling(true)}
              aria-label={tx.schedule}
              title={tx.schedule}
              className="flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg border border-white/25 text-white text-sm font-semibold hover:bg-white/10"
            >
              <CalendarDays size={16} className="text-[#F0A030]" />
              <span className="hidden md:inline">{tx.schedule}</span>
            </button>
            <button
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              aria-label={lang === "es" ? "View in English" : "Ver en español"}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/75 hover:text-white rounded-lg hover:bg-white/10"
            >
              <Globe size={15} />
              <span className="uppercase font-semibold">{lang === "es" ? "EN" : "ES"}</span>
            </button>
            <a
              href={wa(tx.waGeneral)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:brightness-110 shadow-lg shadow-black/10"
            >
              <WhatsAppIcon size={16} />
              <span className="hidden sm:inline">{tx.askDemo}</span>
            </a>
          </div>
        </div>
      </header>

      {/* Portada: anillos que giran y el distintivo 360 animado */}
      <section id="inicio" className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#1d4a7a_0%,#0F2B4C_50%,#0b1f38_100%)] pt-32 pb-32 sm:pt-44 sm:pb-40">
        <div aria-hidden className="absolute -right-32 -top-32 w-[520px] h-[520px] rounded-full border border-dashed border-[#F0A030]/25 tours360-orbit" />
        <div aria-hidden className="absolute -right-10 -top-10 w-[300px] h-[300px] rounded-full border border-[#F0A030]/15" />
        <div aria-hidden className="absolute -left-40 bottom-[-240px] w-[500px] h-[500px] rounded-full border border-dashed border-[#F0A030]/15 tours360-orbit [animation-direction:reverse]" />
        <Rotate3d aria-hidden size={420} strokeWidth={0.6} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.03]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex animate-slide-up"><Tours360Mark size={64} spin /></div>
          <div className="mt-6 animate-slide-up [animation-delay:80ms]">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#F0A030]/40 bg-[#0F2B4C]/40 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
              {tx.badge}
            </span>
          </div>
          <h1 className="mt-6 text-4xl sm:text-6xl font-serif font-bold text-white animate-slide-up [animation-delay:160ms]">
            {tx.title} <Deg360 className="text-[#F0A030]" />
          </h1>
          <p className="mt-5 text-lg text-white/75 leading-relaxed max-w-2xl mx-auto animate-slide-up [animation-delay:240ms]">{tx.subtitle}</p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up [animation-delay:320ms]">
            <a
              href="#demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F0A030] text-[#0F2B4C] font-semibold hover:bg-[#e5952a] shadow-lg shadow-[#F0A030]/25 transition-transform hover:-translate-y-0.5"
            >
              <Rotate3d size={18} /> {tx.seeDemo}
            </a>
            <a
              href={wa(tx.waGeneral)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/25 bg-white/5 backdrop-blur text-white font-semibold hover:bg-white/10 transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon size={18} /> {tx.askDemo}
            </a>
            <button
              onClick={() => setScheduling(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/25 bg-white/5 backdrop-blur text-white font-semibold hover:bg-white/10 transition-transform hover:-translate-y-0.5"
            >
              <CalendarDays size={18} className="text-[#F0A030]" /> {tx.schedule}
            </button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 animate-slide-up [animation-delay:400ms]">
            {tx.chips.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                <Check size={13} className="text-[#F0A030]" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Ejemplos: centrados, con la ilustración del tipo de propiedad y la descripción completa */}
      <section id="demo" className="-mt-20 relative max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-20">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#F0A030] mb-3 relative">{tx.demoKicker}</p>
        {tours === null ? (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl py-16 flex items-center justify-center text-gray-500">
            <Loader2 className="animate-spin mr-2" size={18} /> {tx.loading}
          </div>
        ) : tours.length === 0 ? (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl py-12 px-6 text-center text-gray-500">
            <div className="flex justify-center mb-4"><Tours360Mark size={52} /></div>
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
          <div className="flex flex-wrap justify-center gap-6">
            {tours.map((tour) => {
              const desc = descriptionIn(tour, lang);
              return (
                <Link
                  key={tour.id}
                  to={`/tour/${tour.slug}`}
                  data-reveal
                  className="group w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-xl shadow-[#0F2B4C]/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#0F2B4C]">
                    {(tour.card_image === "foto" || tour.card_image === "logo") && tour.card_image_url ? (
                      <CustomCover kind={tour.card_image} url={mediaUrl(tour.card_image_url)} className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <PropertyArt kind={tour.card_image} className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105" />
                    )}
                    <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur text-white text-xs font-semibold">
                      <Rotate3d size={14} /> 360°
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="relative flex items-center justify-center">
                        <span className="absolute w-20 h-20 rounded-full bg-white/40 animate-ping" />
                        <span className="relative w-20 h-20 rounded-full bg-white/95 text-[#0F2B4C] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                          <Rotate3d size={36} />
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="p-6 sm:p-8 text-center">
                    <h2 className="text-2xl sm:text-3xl font-serif font-bold">{tour.title}</h2>
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      {tour.location && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {tour.location}</span>}
                      {tour.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {tour.bedrooms} {tx.bedrooms}</span>}
                    </div>
                    {desc && <p className="mt-4 text-gray-600 leading-relaxed whitespace-pre-line">{desc}</p>}
                    <span className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F2B4C] text-white font-semibold group-hover:bg-[#173a63]">
                      {tx.open} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pensado para */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24">
        <Heading kicker={tx.forKicker} title={tx.forTitle} />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tx.for.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              data-reveal={i}
              className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#173a63] to-[#0F2B4C] text-white shadow-lg shadow-[#0F2B4C]/20 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
            >
              <span className="relative w-12 h-12 rounded-xl bg-[#F0A030] text-[#0F2B4C] flex items-center justify-center shadow-md shadow-[#F0A030]/30">
                <Icon size={24} />
              </span>
              <h3 className="relative mt-4 font-serif font-bold text-lg">{title}</h3>
              <p className="relative mt-1.5 text-white/75 text-sm leading-relaxed">{desc}</p>
              <span aria-hidden className="absolute left-6 right-6 bottom-0 h-1 rounded-t-full bg-[#F0A030] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              <Icon aria-hidden size={120} className="absolute -right-6 -bottom-6 text-white opacity-[0.06] transition-transform duration-500 group-hover:scale-110" />
            </div>
          ))}
        </div>
      </section>

      {/* Ahorro de tiempo: distancia, clima, clientes extranjeros */}
      <section className="mt-24 relative overflow-hidden bg-[#0F2B4C] py-20">
        <div aria-hidden className="absolute -right-24 top-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-dashed border-[#F0A030]/20 tours360-orbit" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <Heading kicker={tx.timeKicker} title={tx.timeTitle} light />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tx.time.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} data-reveal={i} className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur hover:bg-white/10 transition-colors">
                <Icon size={28} className="text-[#F0A030]" />
                <h3 className="mt-4 font-serif font-bold text-lg text-white">{title}</h3>
                <p className="mt-1.5 text-white/70 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lo que recibes: lo propio del servicio primero, luego lo que trae cada tour */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24">
        <Heading kicker={tx.whyKicker} title={tx.whyTitle} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {tx.highlights.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} data-reveal={i} className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#F0A030] to-[#e08a1a] text-[#0F2B4C] shadow-lg shadow-[#F0A030]/20 hover:-translate-y-1 transition-transform">
              <Icon size={30} />
              <h3 className="mt-4 font-serif font-bold text-xl">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#0F2B4C]/80">{desc}</p>
              <Icon aria-hidden size={120} className="absolute -right-6 -bottom-6 opacity-10" />
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 grid-cols-2 lg:grid-cols-3">
          {tx.why.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} data-reveal={i % 3} className="flex items-start gap-3 bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24">
        <Heading kicker={tx.packsKicker} title={tx.packsTitle} desc={tx.packsDesc} />
        <div className="mt-12 grid gap-6 md:grid-cols-3 items-stretch">
          {tx.packs.map((p, i) => {
            const Icon = PACK_ICONS[i];
            return (
              <div
                key={p.name}
                data-reveal={i}
                className={cn(
                  "relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1",
                  p.featured ? "bg-[#0F2B4C] text-white ring-2 ring-[#F0A030] shadow-2xl shadow-[#0F2B4C]/30 md:scale-105" : "bg-white shadow-sm hover:shadow-xl",
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-7 px-3 py-0.5 rounded-full bg-[#F0A030] text-[#0F2B4C] text-[11px] font-bold uppercase tracking-wide">
                    {tx.featured}
                  </span>
                )}
                <span className={cn("w-12 h-12 rounded-xl flex items-center justify-center", p.featured ? "bg-[#F0A030] text-[#0F2B4C]" : "bg-[#F0A030]/15 text-[#b8761a]")}>
                  <Icon size={24} />
                </span>
                <h3 className="mt-4 font-serif font-bold text-2xl">{p.name}</h3>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.items.map((it) => (
                    <li key={it} className={cn("flex items-start gap-2 text-sm", p.featured ? "text-white/85" : "text-gray-600")}>
                      <Check size={16} className="shrink-0 mt-0.5 text-[#F0A030]" /> {it}
                    </li>
                  ))}
                </ul>
                <a
                  href={wa(tx.waPack(p.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-7 flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold",
                    p.featured ? "bg-[#F0A030] text-[#0F2B4C] hover:bg-[#e5952a]" : "border border-[#0F2B4C]/20 hover:bg-[#0F2B4C] hover:text-white transition-colors",
                  )}
                >
                  <WhatsAppIcon size={16} /> {tx.ask}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Cómo empezamos */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24">
        <Heading kicker={tx.stepsKicker} title={tx.stepsTitle} />
        <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
          <span aria-hidden className="hidden md:block absolute top-7 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-[#F0A030]/0 via-[#F0A030]/60 to-[#F0A030]/0" />
          {tx.steps.map(({ icon: Icon, title, desc }, i) => (
            <li key={title} data-reveal={i} className="relative text-center">
              <span className="relative mx-auto w-14 h-14 rounded-full bg-[#0F2B4C] text-[#F0A030] ring-4 ring-[#F5F7FA] flex items-center justify-center shadow-lg">
                <Icon size={24} />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#F0A030] text-[#0F2B4C] text-xs font-bold flex items-center justify-center">{i + 1}</span>
              </span>
              <h3 className="mt-4 font-serif font-bold text-lg">{title}</h3>
              <p className="mt-1.5 text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Llamado final */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div data-reveal className="relative overflow-hidden rounded-3xl p-8 sm:p-14 text-center text-white bg-[radial-gradient(ellipse_at_top,#1d4a7a_0%,#0F2B4C_60%)]">
          <div aria-hidden className="absolute -left-20 -top-20 w-[300px] h-[300px] rounded-full border border-dashed border-[#F0A030]/25 tours360-orbit" />
          <div aria-hidden className="absolute -right-24 -bottom-24 w-[340px] h-[340px] rounded-full border border-dashed border-[#F0A030]/20 tours360-orbit [animation-direction:reverse]" />
          <div className="relative">
            <div className="flex justify-center"><Tours360Mark size={60} /></div>
            <h2 className="mt-5 text-2xl sm:text-4xl font-serif font-bold">{tx.ctaTitle}</h2>
            <p className="mt-3 text-white/75">{tx.ctaDesc}</p>
            <a
              href={wa(tx.waGeneral)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#25D366] text-white font-semibold hover:brightness-110 shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
            >
              <WhatsAppIcon size={18} /> {tx.askDemo}
            </a>
            <button
              onClick={() => setScheduling(true)}
              className="mt-3 sm:mt-8 sm:ml-3 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#F0A030] text-[#0F2B4C] font-semibold hover:bg-[#e5952a] shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
            >
              <CalendarDays size={18} /> {tx.schedule}
            </button>
          </div>
        </div>
      </section>

      <DemoScheduler open={scheduling} onOpenChange={setScheduling} lang={lang} waNumber={WA_NUMBER} />

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <p className="flex items-center justify-center gap-2">
          <Rotate3d size={15} className="text-[#F0A030]" /> Tours <Deg360 /> · {tx.by}{" "}
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
