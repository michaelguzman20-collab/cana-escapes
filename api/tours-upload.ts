// Tours 360: firma subidas directas del navegador a Cloudflare R2 (bucket cana-media, prefijo tours/)
// y borra fotos. Solo administradores (se verifica el token de sesión de Supabase).
//
// POST { action: "sign",   paths: string[] } → { urls: { path, url }[] }   (PUT prefirmado, 15 min)
// POST { action: "delete", paths: string[] } → { deleted: number }
//
// Variables de entorno (Vercel y .env local): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET (por defecto cana-media), VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
// En local la sirve el middleware de vite.config.ts (vite no ejecuta /api por sí solo).
// La carpeta que se publica en Vercel no lleva @types/node: solo se usa process.env
declare const process: { env: Record<string, string | undefined> };


const PATH_RE = /^tours\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|jpg)$/;
const enc = new TextEncoder();

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(s: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
async function hmac(key: BufferSource, s: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, enc.encode(s));
}
const rfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

// URL prefirmada S3 (SigV4, firma en la query) — R2 usa región "auto"
async function presign(method: "PUT" | "DELETE", key: string, expires = 900) {
  // trim: un espacio pegado por error en Vercel rompe la firma ("access key has length 33")
  const account = process.env.R2_ACCOUNT_ID!.trim();
  const accessKey = process.env.R2_ACCESS_KEY_ID!.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY!.trim();
  const bucket = (process.env.R2_BUCKET || "cana-media").trim();
  const host = `${account}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;
  const uri = "/" + [bucket, ...key.split("/")].map(rfc3986).join("/");
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKey}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  };
  const query = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`)
    .join("&");
  const canonical = [method, uri, query, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256(canonical)].join("\n");
  let k: ArrayBuffer = await hmac(enc.encode("AWS4" + secret), day);
  for (const part of ["auto", "s3", "aws4_request"]) k = await hmac(k, part);
  const signature = hex(await hmac(k, toSign));
  return `https://${host}${uri}?${query}&X-Amz-Signature=${signature}`;
}

async function isAdmin(token: string) {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return false;
  const headers = { apikey: anon, Authorization: `Bearer ${token}` };
  const u = await fetch(`${url}/auth/v1/user`, { headers });
  if (!u.ok) return false;
  const { id } = (await u.json()) as { id?: string };
  if (!id) return false;
  const p = await fetch(`${url}/rest/v1/profiles?select=role&id=eq.${id}`, { headers });
  if (!p.ok) return false;
  const rows = (await p.json()) as { role?: string }[];
  return rows[0]?.role === "admin";
}

export async function POST(req: Request) {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return Response.json({ error: "R2 no está configurado (faltan R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)" }, { status: 503 });
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!(await isAdmin(token))) return Response.json({ error: "Solo administradores" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { action?: string; paths?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  if (!paths.length || paths.length > 50 || !paths.every((p) => PATH_RE.test(p))) {
    return Response.json({ error: "Rutas inválidas" }, { status: 400 });
  }

  if (body.action === "sign") {
    const urls = await Promise.all(paths.map(async (path) => ({ path, url: await presign("PUT", path) })));
    return Response.json({ urls });
  }
  if (body.action === "delete") {
    let deleted = 0;
    const errors: { path: string; status: number; code?: string; message?: string }[] = [];
    for (const path of paths) {
      const r = await fetch(await presign("DELETE", path, 60), { method: "DELETE" });
      if (r.ok || r.status === 404) deleted++;
      // Código S3 de R2 (p. ej. SignatureDoesNotMatch, InvalidAccessKeyId) para diagnosticar claves
      else {
        const xml = await r.text();
        errors.push({
          path,
          status: r.status,
          code: xml.match(/<Code>([^<]+)<\/Code>/)?.[1],
          message: xml.match(/<Message>([^<]+)<\/Message>/)?.[1],
        });
      }
    }
    return Response.json(errors.length ? { deleted, errors } : { deleted });
  }
  return Response.json({ error: "Acción desconocida" }, { status: 400 });
}
