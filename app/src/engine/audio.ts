/**
 * engine/audio.ts — Sintesis Web Audio API real-time & offline untuk SFX Transisi & Layer.
 * Menghasilkan suara Whoosh, Pop, dan Digital Ding tanpa file aset eksternal (0 KB).
 */

import type { MotionDefinition } from "./schema";

export type SfxType = "whoosh" | "pop" | "ding";

class SoundSystem {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(m: boolean) {
    this.muted = m;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public play(type: SfxType, timeOffsetSec: number = 0) {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime + timeOffsetSec;

      if (type === "whoosh") {
        this.scheduleWhoosh(ctx, now);
      } else if (type === "pop") {
        this.schedulePop(ctx, now);
      } else if (type === "ding") {
        this.scheduleDing(ctx, now);
      }
    } catch {
      // AudioContext belum diizinkan user interaction atau tidak disupport
    }
  }

  public scheduleWhoosh(ctx: BaseAudioContext, t: number) {
    const dur = 0.35;
    const bufferSize = Math.max(1, Math.round(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + dur * 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, t + dur);
    filter.Q.value = 3.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.4, t + dur * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + dur);
  }

  public schedulePop(ctx: BaseAudioContext, t: number) {
    const dur = 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(850, t + dur);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  public scheduleDing(ctx: BaseAudioContext, t: number) {
    const dur = 0.25;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc2.type = "triangle";

    osc.frequency.setValueAtTime(1318.51, t); // E6 note
    osc2.frequency.setValueAtTime(2637.02, t); // E7 octave

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur);
    osc2.stop(t + dur);
  }
}

export const sfx = new SoundSystem();

/**
 * Merender trek audio stereo sintetis secara offline berdasarkan koreografi layer
 * dan waktu transisi di MotionDefinition.
 */
export async function synthesizeOfflineAudio(def: MotionDefinition): Promise<AudioBuffer | null> {
  const sampleRate = 44100;
  const durationSec = Math.max(0.5, def.canvas.durationSec);
  const totalSamples = Math.ceil(sampleRate * durationSec);

  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OfflineCtxClass) return null;

  try {
    const offline = new OfflineCtxClass(2, totalSamples, sampleRate);
    let soundScheduled = 0;

    for (const layer of def.layers) {
      const tIn = Math.max(0, Math.min(durationSec - 0.1, layer.time.from));
      const inKind = layer.motion?.in?.type?.toLowerCase() || "";

      if (inKind.includes("slide")) {
        sfx.scheduleWhoosh(offline, tIn);
        soundScheduled++;
      } else if (inKind.includes("pop") || inKind.includes("scale") || inKind.includes("bounce")) {
        sfx.schedulePop(offline, tIn);
        soundScheduled++;
      } else if (layer.kind === "text" || inKind.includes("fade")) {
        sfx.scheduleDing(offline, tIn);
        soundScheduled++;
      }

      // Suara transisi keluar jika ada
      const tOut = Math.max(0, layer.time.to - 0.3);
      if (tOut > tIn + 0.35 && tOut < durationSec) {
        sfx.scheduleWhoosh(offline, tOut);
        soundScheduled++;
      }
    }

    if (soundScheduled === 0) {
      sfx.scheduleDing(offline, 0.05);
    }

    return await offline.startRendering();
  } catch (err) {
    console.warn("Gagal menyintesis offline audio:", err);
    return null;
  }
}
