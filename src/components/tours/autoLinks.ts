import type { TourHotspot, TourScene } from "@/lib/tours";
import { PRESETS } from "./tourAddons";

// "Generar recorrido": propone qué fotos se conectan con flechas a partir del nombre del área
// (y del orden solo como pista), sin depender de que las fotos se hayan subido en orden.
//  · Mismo área ("Cocina", "Cocina 1", "Cocina 2") → se conectan entre sí.
//  · Camino principal: Fachada/Parqueo → Entrada → Lobby → Sala → Comedor → Cocina.
//  · Pasillos y escaleras cuelgan de la sala; habitaciones, oficina, etc. del pasillo (o de la sala).
//  · Baño, clóset y balcón van a su habitación ("Baño principal" ↔ "Habitación principal",
//    "Baño 2" ↔ "Habitación 2"); si no hay pareja, a la habitación subida justo antes, o al pasillo.
//  · Terraza, piscina, jardín… salen de la sala; lavandería y servicio, de la cocina.
//  · Fotos sin área (o con un área desconocida) se conectan con la foto anterior en el orden.
// Al final se asegura que todo el tour quede conectado. Siempre se crean las dos flechas (ida y vuelta).

export interface LinkProposal {
  a: string;
  b: string;
  why: string;
}

type Cat = "exterior" | "entrada" | "lobby" | "sala" | "comedor" | "cocina" | "paso" | "habitacion" | "anexo" | "balcon" | "afuera" | "servicio" | "cuarto" | "otro";

const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Palabras que identifican cada tipo de área (se busca la primera que aparezca en el nombre)
const CATS: [Cat, RegExp][] = [
  ["servicio", /\b(lavanderia|lavado|cuarto de servicio|area de servicio|servicio|deposito|almacen)\b/],
  ["anexo", /\b(bano|aseo|closet|vestidor|walk in)\b/],
  ["balcon", /\bbalcon\b/],
  ["habitacion", /\b(habitacion|dormitorio|recamara|cuarto|master)\b/],
  ["exterior", /\b(fachada|exterior|frente|parqueo|estacionamiento|garaje|marquesina|acceso|calle)\b/],
  ["entrada", /\b(entrada|recibidor|vestibulo|recepcion|foyer)\b/],
  ["lobby", /\b(lobby|looby|loby)\b/],
  ["sala", /\b(sala|living|estar|area comun|areas comunes|family)\b/],
  ["comedor", /\bcomedor\b/],
  ["cocina", /\b(cocina|kitchen)\b/],
  ["paso", /\b(pasillo|escalera|escaleras|planta|piso|nivel|hall)\b/],
  ["afuera", /\b(terraza|piscina|jardin|patio|bbq|gazebo|jacuzzi|rooftop|azotea|playa|vista|solarium|deck)\b/],
  ["cuarto", /\b(oficina|estudio|gimnasio|gym|cine|juegos|biblioteca)\b/],
];
// Orden del camino principal
const MAIN: Cat[] = ["exterior", "entrada", "lobby", "sala", "comedor", "cocina"];
// En estas áreas el número indica otro cuarto (Habitación 1, Habitación 2), no otra foto del mismo
const SEPARATE_NUMBERS: Cat[] = ["habitacion", "anexo", "balcon", "cuarto"];
// "Habitación principal" y "Baño principal" son pareja; también por número
const QUALIFIERS = /\b(principal|master|secundari[oa]|visitas|huespedes|ninos|superior|inferior)\b/;

interface Group {
  key: string; // área sin número: "cocina", "habitacion principal"
  cat: Cat;
  qual: string | null; // "principal", "2"…
  scenes: TourScene[]; // en el orden del tour
  label: string;
}

function categorize(area: string): Cat {
  const a = fold(area);
  for (const [cat, re] of CATS) if (re.test(a)) return cat;
  return "otro";
}

/** Área sin el número final: "Cocina 1" → "cocina", "Habitación #2" → "habitacion" */
function baseKey(area: string) {
  return fold(area).replace(/\s*(#|no\.?\s*|n[°º]\s*)?\d+$/, "").trim();
}

function qualifier(area: string): string | null {
  const a = fold(area);
  const num = a.match(/(\d+)$/);
  if (num) return num[1];
  const q = a.match(QUALIFIERS);
  if (!q) return null;
  return q[1] === "master" ? "principal" : q[1].replace(/a$/, "o");
}

/** Pares de fotos ya unidos por flechas (en cualquier dirección) → qué direcciones existen */
export function existingDirections(hotspots: TourHotspot[]) {
  const dirs = new Set<string>();
  for (const h of hotspots) if (h.action === "scene" && h.target_scene_id && !h.master) dirs.add(`${h.scene_id}>${h.target_scene_id}`);
  return dirs;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function proposeLinks(scenes: TourScene[]): LinkProposal[] {
  const out = new Map<string, LinkProposal>();
  const add = (a: TourScene | undefined, b: TourScene | undefined, why: string) => {
    if (!a || !b || a.id === b.id) return;
    const k = pairKey(a.id, b.id);
    if (!out.has(k)) out.set(k, { a: a.id, b: b.id, why });
  };

  // Agrupar por área (sin número). Las fotos sin área quedan sueltas.
  const groups: Group[] = [];
  const loose: TourScene[] = [];
  for (const s of scenes) {
    const area = s.area?.trim();
    if (!area) {
      loose.push(s);
      continue;
    }
    const cat = categorize(area);
    // "Cocina 1" es otra foto de la cocina, pero "Habitación 2" o "Baño 2" es otro cuarto
    const key = SEPARATE_NUMBERS.includes(cat) ? fold(area) : baseKey(area) || fold(area);
    const g = groups.find((x) => x.key === key);
    if (g) g.scenes.push(s);
    else groups.push({ key, cat, qual: qualifier(area), scenes: [s], label: area });
  }
  // Áreas desconocidas: se tratan como fotos sueltas (por orden)
  for (const g of groups.filter((x) => x.cat === "otro")) loose.push(...g.scenes);
  const known = groups.filter((g) => g.cat !== "otro");

  // 1. Fotos de la misma área: todas entre sí si son pocas, en cadena si son muchas
  for (const g of known) {
    const ss = g.scenes;
    if (ss.length <= 3) {
      for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) add(ss[i], ss[j], `Misma área (${g.label})`);
    } else {
      for (let i = 0; i + 1 < ss.length; i++) add(ss[i], ss[i + 1], `Misma área (${g.label})`);
    }
  }

  const first = (g: Group | undefined) => g?.scenes[0];
  const byCat = (c: Cat) => known.filter((g) => g.cat === c);

  // 2. Camino principal
  // Dentro de un mismo tipo, la "principal" va primero (Entrada principal → Entrada → Lobby)
  const main = MAIN.flatMap((c) => byCat(c).sort((x, y) => Number(y.qual === "principal") - Number(x.qual === "principal")));
  for (let i = 0; i + 1 < main.length; i++) add(first(main[i]), first(main[i + 1]), "Camino principal");
  const hub = byCat("sala")[0] ?? byCat("lobby")[0] ?? byCat("entrada")[0] ?? main[main.length - 1];

  // 3. Pasillos y escaleras, desde la sala y en cadena entre ellos
  const pasos = byCat("paso");
  pasos.forEach((p, i) => add(first(i === 0 ? hub : pasos[i - 1]), first(p), i === 0 ? "Pasillo desde la sala" : "Pasillo"));
  const anchor = pasos[0] ?? hub;

  // 4. Habitaciones y cuartos (oficina, gimnasio…), desde el pasillo o la sala
  const rooms = byCat("habitacion");
  for (const r of rooms) add(first(anchor), first(r), pasos.length ? "Habitación desde el pasillo" : "Habitación desde la sala");
  for (const r of byCat("cuarto")) add(first(anchor), first(r), "Desde el pasillo o la sala");

  // 5. Baños, clósets y balcones → su habitación
  const order = new Map(scenes.map((s, i) => [s.id, i]));
  for (const g of [...byCat("anexo"), ...byCat("balcon")]) {
    const s = first(g)!;
    let room = g.qual ? rooms.find((r) => r.qual === g.qual) : undefined;
    let why = "Con su habitación";
    if (!room) {
      // Pista del orden: la habitación subida justo antes
      const prev = scenes[(order.get(s.id) ?? 0) - 1];
      room = prev && rooms.find((r) => r.scenes.includes(prev));
      why = "Con la habitación anterior";
    }
    if (room) add(first(room), s, why);
    else if (g.cat === "balcon") add(first(hub), s, "Balcón desde la sala");
    else add(first(anchor), s, pasos.length ? "Desde el pasillo" : "Desde la sala");
  }

  // 6. Exteriores (terraza, piscina…): el primero desde la sala, los demás en cadena
  const outs = byCat("afuera");
  outs.forEach((o, i) => add(first(i === 0 ? hub : outs[i - 1]), first(o), i === 0 ? "Salida desde la sala" : "Exterior"));

  // 7. Lavandería / servicio: desde la cocina
  for (const g of byCat("servicio")) add(first(byCat("cocina")[0] ?? anchor), first(g), "Desde la cocina");

  // 8. Fotos sin área conocida: con la foto anterior en el orden del tour (o la siguiente)
  for (const s of loose) {
    const i = order.get(s.id) ?? 0;
    add(scenes[i - 1] ?? scenes[i + 1], s, s.area?.trim() ? "Área desconocida: por orden" : "Sin área: por orden");
  }

  // 9. Que no quede ninguna parte suelta: cada grupo desconectado se une a la sala (o a la primera foto)
  const parent = new Map(scenes.map((s) => [s.id, s.id]));
  const find = (x: string): string => (parent.get(x) === x ? x : find(parent.get(x)!));
  for (const p of out.values()) parent.set(find(p.a), find(p.b));
  const root = first(hub) ?? scenes[0];
  if (root) {
    for (const s of scenes) {
      if (find(s.id) === find(root.id)) continue;
      add(root, s, "Para que nada quede suelto");
      parent.set(find(s.id), find(root.id));
    }
  }
  return [...out.values()];
}

const RAD = Math.PI / 180;
// Dónde se ponen las flechas nuevas: alrededor de la vista inicial, un poco hacia el suelo,
// lejos de las flechas que ya tiene la foto. Luego el admin las arrastra a su puerta.
const OFFSETS = [-30, 30, -70, 70, -110, 110, -150, 150, 180, 0, -50, 50, -90, 90, -130, 130];

function freeYaw(scene: TourScene, taken: number[]) {
  const diff = (x: number, y: number) => Math.abs(((x - y + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  for (const o of OFFSETS) {
    const yaw = scene.initial_yaw + o * RAD;
    if (taken.every((t) => diff(t, yaw) > 25 * RAD)) return yaw;
  }
  return scene.initial_yaw + OFFSETS[taken.length % OFFSETS.length] * RAD;
}

/** Filas de tour_hotspots para las flechas que faltan entre los pares elegidos */
export function arrowRows(pairs: { a: string; b: string }[], scenes: TourScene[], hotspots: TourHotspot[]) {
  const dirs = existingDirections(hotspots);
  const taken = new Map<string, number[]>();
  for (const h of hotspots) if (!h.master) taken.set(h.scene_id, [...(taken.get(h.scene_id) ?? []), h.yaw]);
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const rows: Omit<TourHotspot, "id">[] = [];
  for (const { a, b } of pairs) {
    for (const [from, to] of [[a, b], [b, a]]) {
      const scene = byId.get(from);
      if (!scene || !byId.has(to) || dirs.has(`${from}>${to}`)) continue;
      dirs.add(`${from}>${to}`);
      const list = taken.get(from) ?? [];
      const yaw = freeYaw(scene, list);
      taken.set(from, [...list, yaw]);
      const p = PRESETS.arrow;
      rows.push({
        scene_id: from,
        kind: "icon",
        icon: p.icon ?? "chevron",
        image_url: null,
        image_path: null,
        action: "scene",
        target_scene_id: to,
        url: null,
        title: null,
        text: null,
        yaw,
        pitch: -18 * RAD,
        style: { ...p.style, auto: true },
        master: false,
        hide_in: [],
      });
    }
  }
  return rows;
}
