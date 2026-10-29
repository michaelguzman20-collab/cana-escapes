// Títulos y descripciones SEO de las páginas públicas fijas, en un solo lugar.
// Los usan las páginas (useSeo) y también el paso de compilación (vite.config.ts → seoHtmlPages), que
// genera un index.html propio para cada ruta: así WhatsApp, Facebook, Bing, etc. —que no ejecutan
// JavaScript— ven el título, la descripción y la dirección correctos y no los de la página de inicio.
// Las guías y políticas de las apps están en seoAppPages.ts (para no cargar su texto en la portada).

export interface SeoMeta {
  title: string;
  description: string;
}

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
  },
  "/apps/cana-track/borrar-cuenta": {
    title: "Borrar cuenta de Cana Track — Cana Escapes",
    description:
      "Cómo pedir que borremos tu cuenta de Cana Track y todos tus datos: ubicación, recorridos, batería e historial.",
  },
} satisfies Record<string, SeoMeta>;
