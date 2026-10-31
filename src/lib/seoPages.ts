// Títulos y descripciones SEO de las páginas públicas fijas, en un solo lugar.
// Los usan las páginas (useSeo) y también el paso de compilación (vite.config.ts → seoHtmlPages), que
// genera un index.html propio para cada ruta: así WhatsApp, Facebook, Bing, etc. —que no ejecutan
// JavaScript— ven el título, la descripción y la dirección correctos y no los de la página de inicio.
// Las guías y políticas de las apps están en seoAppPages.ts (para no cargar su texto en la portada).

export interface SeoMeta {
  title: string;
  description: string;
  /** Imagen propia al compartir (ruta en public/); sin ella se usa og-image.jpg */
  image?: string;
  imageAlt?: string;
  /** Datos estructurados schema.org que solo lleva esta página */
  jsonLd?: object;
}

const SITE = "https://canaescapes.com";

const TOURS_PACKS = [
  ["Esencial", "Tour virtual 360° con tu logo, botones a WhatsApp e Instagram y enlace para compartir."],
  ["Plus", "Todo lo de Esencial, más fotografía de interiores y acompañamiento."],
  ["Premium", "Todo lo de Plus, más fotos y video con drone, acompañamiento y seguimiento."],
];

export const SEO_PAGES = {
  "/": {
    title: "Cana Escapes | Alquiler Vacacional y Gestión de Propiedades en Punta Cana",
    description:
      "Villas y apartamentos para tus vacaciones en Bávaro y Punta Cana, y gestión integral de propiedades para propietarios. Reserva tu escapada o maximiza los retornos de tu inversión.",
  },
  "/propietarios": {
    title: "Para Propietarios | Gestión de Propiedades en Punta Cana — Cana Escapes",
    description:
      "Gestionamos tu propiedad en Punta Cana con tecnología, transparencia y máximos retornos: comisiones progresivas, mantenimiento preventivo y reportes financieros claros.",
  },
  "/servicios": {
    title: "Servicios & Mantenimiento para Condominios en Punta Cana — Cana Escapes",
    description:
      "Soluciones Integrales de Mantenimiento y Servicios Generales para áreas comunes de condominios en Bávaro y Punta Cana: eléctrico, plomería, HVAC, obra civil, domótica y más.",
  },
  "/apps": {
    title: "Apps para Android — Cana Escapes",
    description:
      "Descarga gratis las apps de Cana Escapes para Android: Cana Scanner convierte tu cámara en un escáner de documentos a PDF y Cana Track comparte la ubicación de tu equipo en tiempo real.",
  },
  "/cana-dna": {
    title: "Cana DNA — Datos del mercado de renta corta en Punta Cana y Bávaro",
    description:
      "Ocupación, precio por noche, ingresos, temporadas y proyecciones de alquiler vacacional por zona en Bávaro, Punta Cana, Cap Cana, Cana Bay y Bayahibe. Actualizado cada semana.",
  },
  "/tours": {
    title: "Tours 360 — Recorridos virtuales 360° para propiedades en Punta Cana y Bávaro",
    description:
      "Recorridos virtuales 360° con tu marca para inmobiliarias, rentas cortas y propiedades en venta en Bávaro y Punta Cana. Fotos y video con drone y fotografía arquitectónica.",
    image: "/og-tours.jpg",
    imageAlt: "Tours 360° — recorridos virtuales 360° de propiedades en Bávaro y Punta Cana",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Tours 360° — Recorridos virtuales 360° para propiedades",
      serviceType: "Recorridos virtuales 360° y fotografía inmobiliaria",
      description:
        "Recorridos virtuales 360° con la marca del cliente para inmobiliarias, agentes, rentas cortas y propiedades en venta. Incluye fotografía de interiores y fotos y video con drone.",
      url: `${SITE}/tours`,
      image: `${SITE}/og-tours.jpg`,
      areaServed: ["Bávaro", "Punta Cana", "Cap Cana", "República Dominicana"].map((name) => ({ "@type": "Place", name })),
      audience: { "@type": "BusinessAudience", name: "Inmobiliarias, agentes, rentas cortas y propietarios" },
      availableLanguage: ["es", "en"],
      provider: {
        "@type": "LocalBusiness",
        name: "Cana Escapes",
        url: `${SITE}/`,
        telephone: "+1-809-210-2773",
        address: { "@type": "PostalAddress", addressLocality: "Punta Cana", addressRegion: "La Altagracia", addressCountry: "DO" },
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Paquetes Tours 360°",
        itemListElement: TOURS_PACKS.map(([name, description]) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: `Tours 360° ${name}`, description },
        })),
      },
    },
  },
  "/apps/cana-track/borrar-cuenta": {
    title: "Borrar cuenta de Cana Track — Cana Escapes",
    description:
      "Cómo pedir que borremos tu cuenta de Cana Track y todos tus datos: ubicación, recorridos, batería e historial.",
  },
} satisfies Record<string, SeoMeta>;
