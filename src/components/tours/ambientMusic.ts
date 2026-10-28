// Música de fondo suave para los Tours 360, generada en el navegador con Web Audio:
// acordes de pad cálidos + notas de campana sueltas + un bajo muy suave, con reverberación.
// No hay archivo de audio (no pesa nada, sin derechos de autor) y suena en bucle sin cortes.
// Los navegadores solo permiten sonido después de que la persona toca un botón.

const PROGRESSION = [
  // Cmaj9, Am9, Fmaj9, G6/9 — frecuencias en notas MIDI
  { bass: 36, pad: [48, 52, 55, 59, 62] },
  { bass: 33, pad: [45, 48, 52, 55, 59] },
  { bass: 29, pad: [41, 45, 48, 52, 55] },
  { bass: 31, pad: [43, 47, 50, 52, 57] },
];
const BELL_NOTES = [72, 74, 76, 79, 81, 84, 86, 88]; // pentatónica de do, registro alto
const CHORD_SECONDS = 8;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class AmbientMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: number | undefined;
  private nextChordAt = 0;
  private chord = 0;
  private nextBellAt = 0;
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) this.ctx.suspend();
    else this.ctx.resume();
  };

  get playing() {
    return !!this.ctx;
  }

  async start(volume = 0.16) {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    await ctx.resume();

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);
    master.connect(ctx.destination);
    this.master = master;

    // Reverberación: respuesta de ruido que se apaga en ~4 s
    const reverb = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    reverb.connect(wet).connect(master);

    const bus = ctx.createGain();
    bus.gain.value = 0.7;
    bus.connect(master);
    bus.connect(reverb);
    this.bus = bus;

    this.nextChordAt = ctx.currentTime + 0.1;
    this.nextBellAt = ctx.currentTime + 2.5;
    this.chord = 0;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 500);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx) return;
    clearInterval(this.timer);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.master?.gain.cancelScheduledValues(ctx.currentTime);
    this.master?.gain.setValueAtTime(this.master.gain.value, ctx.currentTime);
    this.master?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    this.ctx = this.master = this.bus = null;
    setTimeout(() => ctx.close().catch(() => undefined), 1000);
  }

  // Programa los sonidos de los próximos segundos
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const horizon = ctx.currentTime + 2;
    while (this.nextChordAt < horizon) {
      const c = PROGRESSION[this.chord % PROGRESSION.length];
      const t = this.nextChordAt;
      c.pad.forEach((n, i) => this.pad(hz(n), t + i * 0.12, CHORD_SECONDS + 2.5));
      this.bassNote(hz(c.bass), t, CHORD_SECONDS);
      this.chord++;
      this.nextChordAt += CHORD_SECONDS;
    }
    while (this.nextBellAt < horizon) {
      if (Math.random() < 0.55) this.bell(hz(BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)]), this.nextBellAt);
      this.nextBellAt += 1.1 + Math.random() * 1.6;
    }
  }

  private pad(freq: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.05, t + 2.5);
    env.gain.setValueAtTime(0.05, t + dur - 3);
    env.gain.linearRampToValueAtTime(0, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    lp.Q.value = 0.3;
    lp.connect(env).connect(this.bus!);
    for (const [type, detune] of [["sine", -6], ["triangle", 6]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  private bassNote(freq: number, t: number, dur: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.07, t + 1.5);
    env.gain.linearRampToValueAtTime(0, t + dur);
    env.connect(this.bus!);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(env);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  private bell(freq: number, t: number) {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.035, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    env.connect(this.bus!);
    for (const [mult, gain] of [[1, 1], [2.01, 0.25], [3, 0.08]]) {
      const g = ctx.createGain();
      g.gain.value = gain;
      g.connect(env);
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mult;
      o.connect(g);
      o.start(t);
      o.stop(t + 3.1);
    }
  }
}
