import { audio } from "@/lib/gym-arcade";

/**
 * The soundtrack, synthesized: an original four-bar synthwave loop in A minor
 * for the run (it speeds up as the levels climb) and a tenser one in E minor
 * for bosses. Square/triangle voices and noise drums through one gain, on a
 * lookahead scheduler. Silent while the machine is muted.
 */

type Track = "run" | "boss";

const _ = null;
type Bar = (number | null)[];

interface Song {
  bpm: number;
  roots: number[];
  chords: number[][];
  lead: Bar[];
  /** Bass rhythm per 16 steps */
  bass: number[];
}

const SONGS: Record<Track, Song> = {
  run: {
    bpm: 112,
    roots: [45, 41, 48, 43],
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [55, 60, 64],
      [55, 59, 62],
    ],
    lead: [
      [76, _, _, 74, _, _, 72, _, 69, _, _, _, 72, _, 74, _],
      [72, _, _, 74, _, _, 76, _, 77, _, _, _, 76, _, 74, _],
      [76, _, _, 79, _, _, 76, _, 72, _, _, _, 74, _, 76, _],
      [74, _, _, 71, _, _, 67, _, 74, _, _, _, 71, _, _, _],
    ],
    bass: [0, 2, 4, 6, 8, 10, 12, 14],
  },
  boss: {
    bpm: 148,
    roots: [40, 36, 38, 35],
    chords: [
      [52, 55, 59],
      [48, 52, 55],
      [50, 54, 57],
      [47, 51, 54],
    ],
    lead: [
      [76, _, 76, 79, _, 76, _, 74, 76, _, 76, 79, _, 81, _, 79],
      [76, _, 76, 79, _, 76, _, 72, 74, _, _, 72, _, 71, _, _],
      [74, _, 74, 78, _, 74, _, 72, 74, _, 74, 78, _, 81, _, 78],
      [75, _, _, 78, _, _, 83, _, 81, _, 78, _, 75, _, 71, _],
    ],
    bass: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Music {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private track: Track | null = null;
  private step = 0;
  private next = 0;
  private speed = 0;

  get playing(): Track | null {
    return this.track;
  }

  start(track: Track) {
    if (this.track === track) return;
    this.stop();
    const ctx = audio();
    if (!ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ctx.destination);
    this.noise ??= this.makeNoise(ctx);
    this.track = track;
    this.step = 0;
    this.next = ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 25);
  }

  /** Extra BPM as the run gets harder */
  setSpeed(extra: number) {
    this.speed = extra;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.master && this.ctx) {
      const m = this.master;
      m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      setTimeout(() => m.disconnect(), 400);
    }
    this.master = null;
    this.track = null;
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx || !this.track) return;
    const song = SONGS[this.track];
    const stepLen = 60 / (song.bpm + (this.track === "run" ? this.speed : 0)) / 4;
    while (this.next < ctx.currentTime + 0.12) {
      this.schedule(song, this.step, this.next, stepLen);
      this.next += stepLen;
      this.step = (this.step + 1) % 64;
    }
  }

  private schedule(song: Song, step: number, t: number, len: number) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = song.chords[bar];

    // Drums
    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.hiss(t, 0.12, 1200, 0.22);
    if (s % 2 === 1) this.hiss(t, 0.03, 7000, 0.06);

    // Bass
    if (song.bass.includes(s)) this.voice(hz(song.roots[bar] + (s % 4 === 2 ? 12 : 0)), t, len * 0.9, "triangle", 0.3);

    // Arp
    const arp = chord[[0, 1, 2, 1][s % 4]] + (s >= 8 ? 12 : 0);
    this.voice(hz(arp), t, len * 0.6, "square", 0.035);

    // Lead
    const note = song.lead[bar][s];
    if (note !== null && note !== undefined) {
      let held = 1;
      while (s + held < 16 && song.lead[bar][s + held] === null) held++;
      this.voice(hz(note), t, len * Math.min(held, 4) * 0.95, "square", 0.06, true);
    }
  }

  private voice(f: number, t: number, d: number, type: OscillatorType, vol: number, vibrato = false) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (vibrato && d > 0.2) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 6;
      depth.gain.value = f * 0.008;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t + 0.1);
      lfo.stop(t + d);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + d + 0.02);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  private hiss(t: number, d: number, cutoff: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + d + 0.02);
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
