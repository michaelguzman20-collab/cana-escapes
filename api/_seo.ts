// Inserta el SEO de una página (título, descripción, dirección, imagen) en el index.html del sitio.
// Lo usan el paso de compilación (vite.config.ts → un HTML por página fija) y /api/tour-page (cada tour).
// Los archivos de /api que empiezan con "_" no son funciones de Vercel: solo código compartido.

export interface PageSeo {
  title: string;
  description: string;
  url: string; // dirección completa (canonical y og:url)
  image?: string; // URL completa de la imagen para compartir
  imageAlt?: string;
  noindex?: boolean;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Cambia el valor de content="" de una etiqueta <meta name|property="key"> */
function setMeta(html: string, attr: "name" | "property", key: string, value: string) {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, "i");
  return re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html.replace("</head>", `  <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`);
}

export function injectSeo(html: string, seo: PageSeo) {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(seo.title)}</title>`);
  out = setMeta(out, "name", "description", seo.description);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(seo.url)}$2`);
  out = setMeta(out, "property", "og:title", seo.title);
  out = setMeta(out, "property", "og:description", seo.description);
  out = setMeta(out, "property", "og:url", seo.url);
  out = setMeta(out, "name", "twitter:title", seo.title);
  out = setMeta(out, "name", "twitter:description", seo.description);
  if (seo.image) {
    out = setMeta(out, "property", "og:image", seo.image);
    out = setMeta(out, "name", "twitter:image", seo.image);
    // El tamaño de og-image.jpg ya no aplica a otra imagen
    out = out.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, "");
    if (seo.imageAlt) out = setMeta(out, "property", "og:image:alt", seo.imageAlt);
  }
  if (seo.noindex) out = setMeta(out, "name", "robots", "noindex, follow");
  return out;
}
