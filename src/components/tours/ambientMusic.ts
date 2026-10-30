// Música de fondo para los Tours 360, generada en el navegador con Web Audio (sin archivos de audio:
// no pesa nada, sin derechos de autor y suena en bucle sin cortes). Varios estilos para elegir por tour:
//   · zen      — pads cálidos + campanitas sueltas (relajado, sin ritmo)
//   · lounge   — piano eléctrico jazzy, bajo, bombo suave y hi-hat con swing (bar de hotel)
//   · tropical — marimba con ritmo de tresillo, shaker, bajo y bombo suave (tropical house)
//   · bossa    — piano eléctrico y bajo con clave de bossa nova, rim y shaker (terraza al atardecer)
//   · piano    — piano solo con arpegios lentos, sin percusión (íntimo)
//   · chill    — chill house suave: bombo a negras, hi-hat a contratiempo y acordes cortos (moderno)
//   · caribe   — steel pan con ritmo de calypso, bajo y shaker (playa)
//   · elegante — cuerdas lentas y notas de piano, sin percusión (lujo, cinematográfico)
//   · acustica — guitarra punteada en arpegio, bajo y shaker suave (fresco, natural)
// Los navegadores solo permiten sonido después de que la persona toca un botón.

export type MusicStyle = "zen" | "lounge" | "tropical" | "bossa" | "piano" | "chill" | "caribe" | "elegante" | "acustica";

export const MUSIC_STYLES: { id: MusicStyle; name: string; desc: string }[] = [
  { id: "lounge", name: "Lounge", desc: "Piano eléctrico jazzy, bajo y ritmo suave. Elegante, de bar de hotel." },
  { id: "tropical", name: "Tropical", desc: "Marimba con ritmo caribeño, shaker y bajo. Alegre y fresco." },
  { id: "bossa", name: "Bossa nova", desc: "Acordes suaves con clave de bossa. Relajado, de terraza al atardecer." },
  { id: "piano", name: "Piano", desc: "Piano solo con arpegios lentos, sin percusión. Íntimo y cálido." },
  { id: "chill", name: "Chill house", desc: "Ritmo suave y moderno con acordes cortos. Para apartamentos y rooftops." },
  { id: "caribe", name: "Caribe", desc: "Steel pan con ritmo de calypso. Playa y vacaciones." },
  { id: "elegante", name: "Elegante", desc: "Cuerdas lentas y notas de piano. De lujo, como de película." },
  { id: "acustica", name: "Acústica", desc: "Guitarra punteada y bajo suave. Fresca y natural." },
  { id: "zen", name: "Zen", desc: "Pads y campanitas sin ritmo. Muy tranquilo (la de antes)." },
];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface GrooveChord {
  bass: number; // nota MIDI de la raíz (registro grave)
  notes: number[]; // acorde (registro medio)
}

interface Groove {
  bpm: number;
  stepsPerChord: number; // pasos de 1/16 (o 1/8 en bossa) que dura cada acorde
  chords: GrooveChord[];
  swing: number; // 0..0.4 retraso de los pasos impares (fracción de paso)
  play(m: AmbientMusic, step: number, t: number, chord: GrooveChord, stepDur: number): void;
}

const R = Math.random;

const GROOVES: Record<Exclude<MusicStyle, "zen">, Groove> = {
  // ii–V–I–vi en do: Dm9, G13, Cmaj9, Am9 — 1 compás cada uno
  lounge: {
    bpm: 86,
    stepsPerChord: 16,
    swing: 0.28,
    chords: [
      { bass: 38, notes: [53, 57, 60, 64] },
      { bass: 43, notes: [53, 57, 59, 64] },
      { bass: 36, notes: [52, 55, 59, 62] },
      { bass: 33, notes: [55, 60, 64, 67] },
    ],
    play(m, s, t, c, d) {
      if (s === 0 || s === 8) m.kick(t, s === 0 ? 0.5 : 0.38);
      if (s === 10 && R() < 0.4) m.kick(t, 0.25);
      if (s === 4 || s === 12) m.rim(t, 0.22);
      if (s % 2 === 0) m.hat(t, s % 4 === 0 ? 0.11 : 0.07);
      if (s === 0) m.ep(c.notes, t, d * 9, 0.55);
      if (s === 7) m.ep(c.notes, t, d * 3, 0.32);
      if (s === 10 && R() < 0.5) m.ep(c.notes.slice(1), t, d * 4, 0.25);
      if (s === 0) m.bass(hz(c.bass), t, d * 5, 0.6);
      if (s === 6) m.bass(hz(c.bass + 7), t, d * 3, 0.45);
      if (s === 10) m.bass(hz(c.bass + 12), t, d * 3, 0.4);
      if (s === 14 && R() < 0.6) m.bass(hz(c.bass + 10), t, d * 2, 0.35);
      // Notita de melodía de vez en cuando
      if ((s === 12 || s === 3) && R() < 0.3) m.ep([c.notes[c.notes.length - 1] + 12], t, d * 4, 0.22);
    },
  },
  // vi–IV–I–V en do (Am, F, C, G) — 1 compás cada uno, ritmo de tresillo (3+3+2)
  tropical: {
    bpm: 102,
    stepsPerChord: 16,
    swing: 0.08,
    chords: [
      { bass: 33, notes: [69, 72, 76] },
      { bass: 29, notes: [69, 72, 77] },
      { bass: 36, notes: [67, 72, 76] },
      { bass: 31, notes: [67, 71, 74] },
    ],
    play(m, s, t, c, d) {
      if (s % 4 === 0) m.kick(t, 0.42);
      if (s === 4 || s === 12) m.clap(t, 0.2);
      m.shaker(t, s % 2 ? 0.11 : 0.06);
      // Marimba en tresillo, arpegiando el acorde (a veces sube una octava)
      const pattern = [0, 3, 6, 8, 11, 14];
      const i = pattern.indexOf(s);
      if (i >= 0) {
        const n = c.notes[i % c.notes.length] + (i >= 3 && R() < 0.35 ? 12 : 0);
        m.marimba(hz(n), t, i === 0 ? 0.5 : 0.36);
      }
      if (s === 0 || s === 3 || s === 6) m.bass(hz(c.bass), t, d * 2.5, 0.55);
      if (s === 8 || s === 11) m.bass(hz(c.bass + 12), t, d * 2.5, 0.4);
      if (s === 14) m.bass(hz(c.bass + 7), t, d * 2, 0.4);
      if (s === 0) m.pad(c.notes.map((n) => hz(n - 12)), t, d * 16, 0.018);
    },
  },
  // I–VI–ii–V en do (Cmaj7, A7, Dm9, G7) — pasos de corchea, 2 compases por acorde
  bossa: {
    bpm: 66, // cada paso dura 1/16 a 66 = una corchea de bossa a ~132
    stepsPerChord: 16,
    swing: 0.05,
    chords: [
      { bass: 36, notes: [52, 55, 59, 64] },
      { bass: 33, notes: [52, 55, 61, 64] },
      { bass: 38, notes: [53, 57, 60, 64] },
      { bass: 31, notes: [53, 59, 62, 65] },
    ],
    play(m, s, t, c, d) {
      // Bajo de bossa: raíz y quinta con puntillo
      if (s === 0 || s === 8) m.bass(hz(c.bass), t, d * 2.6, 0.55);
      if (s === 3 || s === 11) m.bass(hz(c.bass + 7), t, d * 1.2, 0.42);
      if (s === 4 || s === 12) m.bass(hz(c.bass + 7), t, d * 3, 0.4);
      // Clave de bossa (rim) y acordes en los mismos golpes
      const clave = [0, 3, 6, 10, 13];
      if (clave.includes(s)) {
        m.rim(t, 0.16);
        m.ep(c.notes, t, d * 2.2, s === 0 ? 0.42 : 0.3);
      }
      m.shaker(t, s % 2 ? 0.05 : 0.08);
      if (s === 0 || s === 8) m.kick(t, 0.22);
      if (s === 14 && R() < 0.35) m.ep([c.notes[c.notes.length - 1] + 12], t, d * 3, 0.2);
    },
  },
  // I–V–vi–IV en fa (F, C/E, Dm, B♭) — 2 compases por acorde, arpegio de corcheas
  piano: {
    bpm: 72,
    stepsPerChord: 32,
    swing: 0,
    chords: [
      { bass: 41, notes: [53, 57, 60, 64, 65] },
      { bass: 40, notes: [52, 55, 60, 62, 67] },
      { bass: 38, notes: [53, 57, 60, 62, 65] },
      { bass: 34, notes: [53, 58, 62, 65, 69] },
    ],
    play(m, s, t, c, d) {
      if (s === 0 || s === 16) m.piano([c.bass, c.bass + 12], t, 0.5);
      if (s % 2 === 0) {
        const up = [0, 1, 2, 3, 4, 3, 2, 1];
        const n = c.notes[up[(s / 2) % up.length]];
        m.piano([n + (s >= 16 && R() < 0.2 ? 12 : 0)], t, s % 8 === 0 ? 0.42 : 0.3);
      }
      if ((s === 12 || s === 28) && R() < 0.35) m.piano([c.notes[c.notes.length - 1] + 12], t + d, 0.22);
    },
  },
  // vi–IV–I–V en la menor (Am7, Fmaj7, Cmaj7, G6)
  chill: {
    bpm: 112,
    stepsPerChord: 16,
    swing: 0.12,
    chords: [
      { bass: 33, notes: [57, 60, 64, 67] },
      { bass: 29, notes: [57, 60, 64, 65] },
      { bass: 36, notes: [55, 59, 64, 67] },
      { bass: 31, notes: [55, 59, 62, 64] },
    ],
    play(m, s, t, c, d) {
      if (s % 4 === 0) m.kick(t, 0.4);
      if (s % 4 === 2) m.hat(t, 0.12);
      if (s === 4 || s === 12) m.clap(t, 0.14);
      if (s === 2 || s === 7 || s === 10) m.ep(c.notes, t, d * 1.5, 0.3);
      if (s === 2 || s === 6 || s === 10 || s === 14) m.bass(hz(c.bass + (s === 14 ? 12 : 0)), t, d * 1.6, 0.5);
      if (s === 0) m.pad(c.notes.map((n) => hz(n - 12)), t, d * 16, 0.016);
      if ((s === 5 || s === 13) && R() < 0.3) m.pluck(hz(c.notes[Math.floor(R() * c.notes.length)] + 12), t, 0.25);
    },
  },
  // I–IV–V–I en sol (G, C, D7, G) — calypso
  caribe: {
    bpm: 108,
    stepsPerChord: 16,
    swing: 0.06,
    chords: [
      { bass: 31, notes: [67, 71, 74] },
      { bass: 36, notes: [67, 72, 76] },
      { bass: 38, notes: [66, 69, 72, 74] },
      { bass: 31, notes: [71, 74, 79] },
    ],
    play(m, s, t, c, d) {
      if (s === 0 || s === 8) m.kick(t, 0.35);
      if (s === 4 || s === 12) m.rim(t, 0.15);
      m.shaker(t, s % 2 ? 0.1 : 0.05);
      const pattern = [0, 3, 6, 10, 12, 14];
      const i = pattern.indexOf(s);
      if (i >= 0) m.steel(hz(c.notes[(i + (R() < 0.3 ? 1 : 0)) % c.notes.length]), t, i === 0 ? 0.5 : 0.36);
      if (s === 0 || s === 6) m.bass(hz(c.bass), t, d * 3, 0.55);
      if (s === 10 || s === 12) m.bass(hz(c.bass + 7), t, d * 2, 0.42);
    },
  },
  // i–VI–III–VII en re menor (Dm, B♭maj7, F, C) — 2 compases por acorde, sin percusión
  elegante: {
    bpm: 60,
    stepsPerChord: 32,
    swing: 0,
    chords: [
      { bass: 38, notes: [50, 53, 57, 62] },
      { bass: 34, notes: [50, 53, 57, 58] },
      { bass: 41, notes: [48, 53, 57, 60] },
      { bass: 36, notes: [48, 52, 55, 60] },
    ],
    play(m, s, t, c, d) {
      if (s === 0) {
        m.strings(c.notes.map(hz), t, d * 34);
        m.bass(hz(c.bass), t, d * 30, 0.4, 1.2);
      }
      const mel = [0, 6, 12, 20, 26];
      if (mel.includes(s) && R() < 0.7) m.piano([c.notes[Math.floor(R() * c.notes.length)] + 24], t, 0.24);
    },
  },
  // I–vi–IV–V en re (D, Bm, G, A) — guitarra en arpegio
  acustica: {
    bpm: 92,
    stepsPerChord: 16,
    swing: 0.1,
    chords: [
      { bass: 38, notes: [57, 62, 66, 69] },
      { bass: 35, notes: [54, 59, 62, 66] },
      { bass: 43, notes: [55, 59, 62, 67] },
      { bass: 45, notes: [57, 61, 64, 69] },
    ],
    play(m, s, t, c, d) {
      const order = [0, 2, 1, 3, 2, 1];
      if (s % 2 === 0 || R() < 0.15) m.pluck(hz(c.notes[order[s % order.length]]), t, s % 4 === 0 ? 0.5 : 0.35);
      if (s === 0 || s === 10) m.pluck(hz(c.bass + 12), t, 0.45);
      if (s === 0 || s === 8) m.bass(hz(c.bass), t, d * 4, 0.45);
      if (s % 2 === 1) m.shaker(t, 0.06);
      if (s === 4 || s === 12) m.rim(t, 0.1);
    },
  },
};

// Cada estilo sale con un nivel muy distinto (medido: de -60 dB el piano a -39 dB el zen, casi
// inaudibles). Esta ganancia los deja a todos parecidos (~ -29 dB RMS): fondo audible sin tapar nada.
const LOUDNESS: Record<MusicStyle, number> = {
  zen: 3, tropical: 8, chill: 8, caribe: 10, elegante: 10.5, acustica: 11, bossa: 13.5, lounge: 27, piano: 35,
};

export class AmbientMusic {
  readonly style: MusicStyle;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private dry: GainNode | null = null; // percusión: menos reverberación
  private noise: AudioBuffer | null = null;
  private timer: number | undefined;
  private nextAt = 0;
  private step = 0;
  private chord = 0;
  private nextBellAt = 0;
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) this.ctx.suspend();
    else this.ctx.resume();
  };

  constructor(style: MusicStyle = "zen") {
    this.style = MUSIC_STYLES.some((s) => s.id === style) ? style : "zen";
  }

  get playing() {
    return !!this.ctx;
  }

  /** ¿Suena de verdad? (false si el navegador aún espera un toque) */
  get audible() {
    return this.ctx?.state === "running";
  }

  resume() {
    return this.ctx?.resume().catch(() => undefined);
  }

  async start(volume = 0.16) {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    // Sin un toque previo el navegador deja el audio en pausa: se prepara igual y suena con resume()
    // (no se espera aquí: en algunos navegadores esa promesa no termina hasta el primer toque)
    ctx.resume().catch(() => undefined);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume * LOUDNESS[this.style], ctx.currentTime + 2.5);
    // Un filtro general quita brillo áspero: el sonido queda "de fondo"
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = this.style === "tropical" || this.style === "caribe" ? 9000 : 7000;
    // Limitador: un golpe fuerte (acordes que coinciden) nunca satura
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    master.connect(tone).connect(limiter).connect(ctx.destination);
    this.master = master;

    // Reverberación: respuesta de ruido que se apaga
    const reverb = ctx.createConvolver();
    const spacious = this.style === "zen" || this.style === "elegante" || this.style === "piano";
    const secs = spacious ? 4 : 2.2;
    const len = Math.floor(ctx.sampleRate * secs);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = this.style === "zen" ? 0.55 : spacious ? 0.45 : 0.3;
    reverb.connect(wet).connect(master);

    const bus = ctx.createGain();
    bus.gain.value = 0.7;
    bus.connect(master);
    bus.connect(reverb);
    this.bus = bus;
    const dry = ctx.createGain();
    dry.gain.value = 0.7;
    dry.connect(master);
    const drySend = ctx.createGain();
    drySend.gain.value = 0.15;
    dry.connect(drySend).connect(reverb);
    this.dry = dry;

    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;

    this.nextAt = ctx.currentTime + 0.15;
    this.nextBellAt = ctx.currentTime + 2.5;
    this.step = this.chord = 0;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 100);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx) return;
    clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.master?.gain.cancelScheduledValues(ctx.currentTime);
    this.master?.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
    this.ctx = this.master = this.bus = this.dry = null;
    setTimeout(() => ctx.close().catch(() => undefined), 800);
  }

  // Programa los sonidos de los próximos instantes
  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.style === "zen") return this.scheduleZen(ctx);
    const g = GROOVES[this.style];
    const stepDur = 60 / g.bpm / 4;
    const horizon = ctx.currentTime + 0.35;
    while (this.nextAt < horizon) {
      const s = this.step % g.stepsPerChord;
      const chord = g.chords[this.chord % g.chords.length];
      const t = this.nextAt + (this.step % 2 ? g.swing * stepDur : 0);
      g.play(this, s, t, chord, stepDur);
      this.step++;
      if (this.step % g.stepsPerChord === 0) this.chord++;
      this.nextAt += stepDur;
    }
  }

  private scheduleZen(ctx: AudioContext) {
    const ZEN = [
      { bass: 36, pad: [48, 52, 55, 59, 62] },
      { bass: 33, pad: [45, 48, 52, 55, 59] },
      { bass: 29, pad: [41, 45, 48, 52, 55] },
      { bass: 31, pad: [43, 47, 50, 52, 57] },
    ];
    const BELLS = [72, 74, 76, 79, 81, 84, 86, 88];
    const CHORD = 8;
    const horizon = ctx.currentTime + 2;
    while (this.nextAt < horizon) {
      const c = ZEN[this.chord++ % ZEN.length];
      c.pad.forEach((n, i) => this.pad([hz(n)], this.nextAt + i * 0.12, CHORD + 2.5, 0.05));
      this.bass(hz(c.bass), this.nextAt, CHORD, 0.5, 1.5);
      this.nextAt += CHORD;
    }
    while (this.nextBellAt < horizon) {
      if (Math.random() < 0.55) this.bell(hz(BELLS[Math.floor(Math.random() * BELLS.length)]), this.nextBellAt);
      this.nextBellAt += 1.1 + Math.random() * 1.6;
    }
  }

  // ── Instrumentos ──────────────────────────────────────────────────────────
  private env(t: number, peak: number, attack: number, decay: number, out: AudioNode) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(out);
    return g;
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, out: AudioNode, detune = 0) {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  /** Colchón de acordes suave */
  pad(freqs: number[], t: number, dur: number, level = 0.03) {
    const ctx = this.ctx!;
    for (const f of freqs) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(level, t + Math.min(2.5, dur / 3));
      env.gain.setValueAtTime(level, t + dur * 0.7);
      env.gain.linearRampToValueAtTime(0, t + dur);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1100;
      lp.connect(env).connect(this.bus!);
      this.osc("sine", f, t, dur, lp, -6);
      this.osc("triangle", f, t, dur, lp, 6);
    }
  }

  /** Piano eléctrico (tipo Rhodes): FM suave con brillo que se apaga */
  ep(notes: number[], t: number, dur: number, vel: number) {
    const ctx = this.ctx!;
    for (const n of notes) {
      const f = hz(n);
      const amp = this.env(t, 0.06 * vel, 0.005, Math.max(0.4, dur), this.bus!);
      const car = this.osc("sine", f, t, dur + 0.5, amp);
      const mod = ctx.createOscillator();
      mod.frequency.value = f;
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * 1.4 * vel, t);
      idx.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.6);
      mod.connect(idx).connect(car.frequency);
      mod.start(t);
      mod.stop(t + dur + 0.55);
    }
  }

  /** Marimba: tono redondo + armónico agudo muy corto */
  marimba(f: number, t: number, vel: number) {
    const a = this.env(t, 0.09 * vel, 0.003, 0.9, this.bus!);
    this.osc("sine", f, t, 1, a);
    const b = this.env(t, 0.03 * vel, 0.002, 0.12, this.bus!);
    this.osc("sine", f * 4, t, 0.2, b);
  }

  bell(f: number, t: number) {
    const env = this.env(t, 0.035, 0.02, 3, this.bus!);
    for (const [mult, gain] of [[1, 1], [2.01, 0.25], [3, 0.08]]) {
      const g = this.ctx!.createGain();
      g.gain.value = gain;
      g.connect(env);
      this.osc("sine", f * mult, t, 3.1, g);
    }
  }

  /** Piano acústico: varios armónicos que se apagan rápido, los agudos antes */
  piano(notes: number[], t: number, vel: number) {
    for (const n of notes) {
      const f = hz(n);
      for (const [mult, gain, decay] of [[1, 1, 2.2], [2, 0.35, 1.2], [3, 0.12, 0.6], [4, 0.05, 0.35]]) {
        const a = this.env(t, 0.05 * vel * gain, 0.004, decay, this.bus!);
        this.osc(mult === 1 ? "triangle" : "sine", f * mult, t, decay + 0.1, a, mult === 1 ? 0 : 2);
      }
    }
  }

  /** Steel pan: fundamental + armónicos algo desafinados */
  steel(f: number, t: number, vel: number) {
    for (const [mult, gain, decay] of [[1, 1, 1.1], [2, 0.5, 0.7], [3.01, 0.22, 0.4], [4.02, 0.1, 0.2]]) {
      const a = this.env(t, 0.07 * vel * gain, 0.004, decay, this.bus!);
      this.osc("sine", f * mult, t, decay + 0.1, a);
    }
  }

  /** Cuerda punteada (guitarra): diente de sierra con filtro que se cierra */
  pluck(f: number, t: number, vel: number) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(Math.min(6000, f * 8), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.2), t + 0.5);
    const a = this.env(t, 0.05 * vel, 0.003, 1.1, this.bus!);
    lp.connect(a);
    this.osc("sawtooth", f, t, 1.2, lp);
    this.osc("triangle", f, t, 1.2, lp, 4);
  }

  /** Cuerdas: diente de sierra suave con vibrato lento, entrada y salida largas */
  strings(freqs: number[], t: number, dur: number) {
    const ctx = this.ctx!;
    for (const f of freqs) {
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.022, t + Math.min(3, dur / 3));
      env.gain.setValueAtTime(0.022, t + dur * 0.75);
      env.gain.linearRampToValueAtTime(0, t + dur);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1600;
      lp.connect(env).connect(this.bus!);
      for (const det of [-8, 8]) {
        const o = this.osc("sawtooth", f, t, dur, lp, det);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 4.5;
        const depth = ctx.createGain();
        depth.gain.value = 6;
        lfo.connect(depth).connect(o.detune);
        lfo.start(t);
        lfo.stop(t + dur + 0.05);
      }
    }
  }

  bass(f: number, t: number, dur: number, vel: number, attack = 0.01) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const g = this.env(t, 0.16 * vel, attack, dur, this.dry!);
    lp.connect(g);
    this.osc("triangle", f, t, dur + attack, lp);
    this.osc("sine", f, t, dur + attack, lp);
  }

  kick(t: number, vel: number) {
    const g = this.env(t, 0.5 * vel, 0.002, 0.3, this.dry!);
    const o = this.osc("sine", 110, t, 0.35, g);
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  }

  private noiseHit(t: number, peak: number, decay: number, type: BiquadFilterType, freq: number, q = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.env(t, peak, 0.002, decay, this.dry!);
    src.connect(f).connect(g);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }

  hat(t: number, vel: number) {
    this.noiseHit(t, 0.25 * vel, 0.045, "highpass", 7500);
  }

  shaker(t: number, vel: number) {
    this.noiseHit(t, 0.22 * vel, 0.06, "bandpass", 6500, 0.8);
  }

  rim(t: number, vel: number) {
    this.noiseHit(t, 0.5 * vel, 0.05, "bandpass", 1900, 6);
    const g = this.env(t, 0.06 * vel, 0.001, 0.04, this.dry!);
    this.osc("triangle", 820, t, 0.06, g);
  }

  clap(t: number, vel: number) {
    for (const dt of [0, 0.012, 0.024]) this.noiseHit(t + dt, 0.35 * vel, 0.09, "bandpass", 1500, 1.2);
  }
}
