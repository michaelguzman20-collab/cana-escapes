import type { Viewer } from "@photo-sphere-viewer/core";
import type { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import type { FullTour } from "@/lib/tours";

// Tour automático: recorre solo todas las fotos del tour siguiendo las flechas que ya existen.
// En cada lugar nuevo mira alrededor despacio y termina de frente a la puerta por donde sale.
// No cambia nada del tour: solo mueve la cámara y usa setCurrentNode como un clic normal.

/** Cuánto mira alrededor en cada lugar nuevo (grados) */
const PANEO_GRADOS = 200;
/** Nunca mira menos que esto, aunque la salida quede cerca */
const PANEO_MIN_GRADOS = 140;
/** Velocidad del paneo (grados por segundo) */
const PANEO_GRADOS_POR_SEG = 28;
/** Velocidad al girar hacia la siguiente puerta (grados por segundo) */
const GIRO_GRADOS_POR_SEG = 70;
/** Pausa frente a la puerta antes de pasar */
const PAUSA_ANTES_DE_IR_MS = 500;
/** Pausa en un lugar ya visto (solo se pasa por ahí) */
const PAUSA_DE_PASO_MS = 300;
/** Un paso que cruza a otra zona grande (p. ej. la escalera al 2.º piso) «cuesta» esto: así termina una zona antes de pasar a la otra */
const COSTO_CAMBIO_DE_ZONA = 12;
/** Una flecha separa «zonas» si de cada lado quedan al menos estas fotos */
const ZONA_MIN_FOTOS = 4;

const DOS_PI = Math.PI * 2;
const RAD = Math.PI / 180;
const norm = (a: number) => ((a % DOS_PI) + DOS_PI) % DOS_PI;
const corto = (a: number) => { const b = norm(a); return b > Math.PI ? b - DOS_PI : b; };

type Grafo = Map<string, Map<string, number>>; // escena → (destino → yaw de la flecha)

/** Flechas «ir a otra foto» de cada escena (solo las propias, no las que se repiten en todas) */
export function grafoDelTour(full: FullTour): Grafo {
  const ids = new Set(full.scenes.map((s) => s.id));
  const g: Grafo = new Map(full.scenes.map((s) => [s.id, new Map()]));
  for (const h of full.hotspots) {
    if (h.action !== "scene" || h.master || !h.target_scene_id || !ids.has(h.target_scene_id) || h.target_scene_id === h.scene_id) continue;
    g.get(h.scene_id)?.set(h.target_scene_id, h.yaw);
  }
  return g;
}

/** Flechas que separan dos zonas grandes (puentes del grafo con muchas fotos a cada lado) */
function cambiosDeZona(g: Grafo): Set<string> {
  const vec = new Map<string, Set<string>>();
  for (const [a, ds] of g) for (const b of ds.keys()) {
    if (!vec.has(a)) vec.set(a, new Set());
    if (!vec.has(b)) vec.set(b, new Set());
    vec.get(a)!.add(b); vec.get(b)!.add(a);
  }
  const total = vec.size, orden = new Map<string, number>(), bajo = new Map<string, number>(), tam = new Map<string, number>();
  const puentes = new Set<string>();
  let t = 0;
  const dfs = (u: string, padre: string | null) => {
    orden.set(u, t); bajo.set(u, t); t++; tam.set(u, 1);
    for (const v of vec.get(u) ?? []) {
      if (v === padre) continue;
      if (orden.has(v)) { bajo.set(u, Math.min(bajo.get(u)!, orden.get(v)!)); continue; }
      dfs(v, u);
      tam.set(u, tam.get(u)! + tam.get(v)!);
      bajo.set(u, Math.min(bajo.get(u)!, bajo.get(v)!));
      const lado = tam.get(v)!;
      if (bajo.get(v)! > orden.get(u)! && lado >= ZONA_MIN_FOTOS && total - lado >= ZONA_MIN_FOTOS) {
        puentes.add(`${u}|${v}`); puentes.add(`${v}|${u}`);
      }
    }
  };
  for (const u of vec.keys()) if (!orden.has(u)) dfs(u, null);
  return puentes;
}

/** Camino hasta el lugar sin ver más cercano. Empate → primero los sin salida (baño, balcón), luego el orden del tour */
function caminoAlSiguiente(g: Grafo, desde: string, vistos: Set<string>, zonas: Set<string>, posicion: Map<string, number>): string[] | null {
  const dist = new Map([[desde, 0]]), previo = new Map<string, string>(), abiertos = new Set([desde]);
  const salidas = (n: string) => g.get(n)?.size ?? 0;
  while (abiertos.size) {
    const n = [...abiertos].sort((a, b) => dist.get(a)! - dist.get(b)! || salidas(a) - salidas(b) || (posicion.get(a) ?? 0) - (posicion.get(b) ?? 0))[0];
    abiertos.delete(n);
    if (!vistos.has(n)) {
      const r: string[] = [];
      for (let x = n; x !== desde; x = previo.get(x)!) r.unshift(x);
      return r;
    }
    for (const v of g.get(n)?.keys() ?? []) {
      const d = dist.get(n)! + (zonas.has(`${n}|${v}`) ? COSTO_CAMBIO_DE_ZONA : 1);
      if (!dist.has(v) || d < dist.get(v)!) { dist.set(v, d); previo.set(v, n); abiertos.add(v); }
    }
  }
  return null;
}

export interface EstadoAuto { corriendo: boolean; vistos: number; total: number; terminado: boolean }

export class TourAutomatico {
  private grafo: Grafo;
  private zonas: Set<string>;
  private posicion: Map<string, number>;
  private vistos = new Set<string>();
  private turno = 0; // al pausar se invalida el recorrido en curso
  private corriendo = false;
  private terminado = false;
  /** Escenas a las que se puede llegar desde la inicial (las sueltas no cuentan) */
  readonly total: number;

  constructor(
    full: FullTour,
    /** Escena con la que abre el tour (el visor todavía no la tiene cargada al crear esto) */
    private inicio: string,
    private viewer: Viewer,
    private tour: VirtualTourPlugin,
    private alCambiar: (e: EstadoAuto) => void,
    private alEmpezar: () => void,
    private alParar: () => void,
  ) {
    this.grafo = grafoDelTour(full);
    this.zonas = cambiosDeZona(this.grafo);
    this.posicion = new Map(full.scenes.map((s, i) => [s.id, i]));
    const alcanzables = new Set([inicio]), cola = [inicio];
    while (cola.length) for (const v of this.grafo.get(cola.shift()!)?.keys() ?? []) if (!alcanzables.has(v)) { alcanzables.add(v); cola.push(v); }
    this.total = alcanzables.size;
    this.vistos.add(inicio);
  }

  /** Hay algo que recorrer (más de una foto conectada) */
  get disponible() { return this.total > 1; }

  private actual() { return this.tour.getCurrentNode()?.id ?? this.inicio; }
  private avisar() { this.alCambiar({ corriendo: this.corriendo, vistos: this.vistos.size, total: this.total, terminado: this.terminado }); }

  empezar(desdeCero = false) {
    if (this.corriendo) return;
    if (desdeCero || this.terminado) { this.vistos.clear(); this.terminado = false; }
    this.vistos.add(this.actual());
    this.corriendo = true;
    this.alEmpezar();
    this.avisar();
    void this.recorrer(++this.turno);
  }

  pausar() {
    if (!this.corriendo) return;
    this.corriendo = false;
    this.turno++;
    this.alParar();
    this.avisar();
  }

  /** La persona fue a otra foto por su cuenta: cuenta como vista */
  marcarVista(id: string) { if (id) this.vistos.add(id); }

  destruir() { this.turno++; this.corriendo = false; }

  private espera(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

  /** Gira la cámara suave (acelera al empezar, frena al final). recorrido en radianes; sin él, el giro más corto hasta hastaYaw */
  private girar(turno: number, hastaYaw: number | null, recorrido: number | null, gradosPorSeg: number) {
    const inicio = this.viewer.getPosition();
    const giro = recorrido ?? corto((hastaYaw ?? 0) - inicio.yaw);
    const ms = Math.max(250, (Math.abs(giro) / RAD / gradosPorSeg) * 1000);
    const t0 = performance.now();
    return new Promise<boolean>((listo) => {
      const paso = (t: number) => {
        if (turno !== this.turno) return listo(false);
        const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        this.viewer.rotate({ yaw: inicio.yaw + giro * e, pitch: inicio.pitch * (1 - e) });
        if (k < 1) requestAnimationFrame(paso); else listo(true);
      };
      requestAnimationFrame(paso);
    });
  }

  /** Mira alrededor y termina mirando hacia la salida */
  private mirarAlrededor(turno: number, salidaYaw: number) {
    const y = norm(this.viewer.getPosition().yaw);
    const der = norm(salidaYaw - y), izq = DOS_PI - der, ideal = PANEO_GRADOS * RAD, min = PANEO_MIN_GRADOS * RAD;
    const opciones = [der, -izq].filter((s) => Math.abs(s) >= min);
    const giro = opciones.length
      ? opciones.sort((a, b) => Math.abs(Math.abs(a) - ideal) - Math.abs(Math.abs(b) - ideal))[0]
      : der > izq ? der : -izq;
    return this.girar(turno, null, giro, PANEO_GRADOS_POR_SEG);
  }

  private async recorrer(turno: number) {
    while (turno === this.turno) {
      const desde = this.actual();
      const ruta = caminoAlSiguiente(this.grafo, desde, this.vistos, this.zonas, this.posicion);
      if (!ruta) {
        this.corriendo = false; this.terminado = true; this.turno++;
        this.alParar(); this.avisar();
        return;
      }
      if (!(await this.mirarAlrededor(turno, this.grafo.get(desde)!.get(ruta[0])!))) return;
      for (const siguiente of ruta) {
        const aqui = this.actual();
        if (!(await this.girar(turno, this.grafo.get(aqui)?.get(siguiente) ?? 0, null, GIRO_GRADOS_POR_SEG))) return;
        await this.espera(PAUSA_ANTES_DE_IR_MS);
        if (turno !== this.turno) return;
        const nuevo = !this.vistos.has(siguiente);
        try { await this.tour.setCurrentNode(siguiente); } catch { /* si falla la foto, se sigue con la próxima vuelta */ }
        if (turno !== this.turno) return;
        this.vistos.add(siguiente);
        this.avisar();
        if (!nuevo) await this.espera(PAUSA_DE_PASO_MS);
      }
    }
  }
}
