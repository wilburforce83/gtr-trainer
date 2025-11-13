import type { StyleName } from '../chords/types';

export type DrumLane = 'kick' | 'snare' | 'hats' | 'percussion';

export type DrumHit = {
  subdivision: number;
  sample: string;
  velocity: number;
  swing?: number;
  offsetMs?: number;
};

export type DrumBar = {
  kick: DrumHit[];
  snare: DrumHit[];
  hats: DrumHit[];
  percussion: DrumHit[];
};

export type DrumPattern = {
  id: string;
  style: StyleName;
  swing: number;
  barCount: number;
  bars: DrumBar[];
};

export type DrumMixerSettings = {
  instrument: number;
  drumBus: number;
  kick: number;
  snare: number;
  hats: number;
  percussion: number;
};

export const DEFAULT_DRUM_MIXER: DrumMixerSettings = {
  instrument: 0.85,
  drumBus: 0.78,
  kick: 0.85,
  snare: 0.82,
  hats: 0.68,
  percussion: 0.64,
};

export function clampMixerValue(value: number): number {
  if (Number.isNaN(value)) {
    return 0.8;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Number.parseFloat(value.toFixed(3));
}
