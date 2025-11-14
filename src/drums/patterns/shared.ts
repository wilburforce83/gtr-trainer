import type { DrumBar, DrumHit } from '../../drums/types';
import { randomSample } from '../samples';

export type PatternBuilder = (barCount: number, swing: number) => DrumBar[];
export type PatternDefinition = {
  name: string;
  builder: PatternBuilder;
};

export const SUBDIVISIONS_PER_BAR = 16;

export type HumanizeOptions = {
  velocityJitter?: number;
  offsetJitterMs?: number;
};

export type HitOptions = {
  swing?: number;
  open?: boolean;
  rim?: boolean;
  ghost?: boolean;
  offsetMs?: number;
  type?: 'crash' | 'pedal';
} & HumanizeOptions;

type SampleToken =
  | 'kick'
  | 'snare'
  | 'rimshot'
  | 'hatsClosed'
  | 'hatsOpen'
  | 'hatsPedal'
  | 'crash'
  | string;

export function buildPattern(
  barCount: number,
  sculptBar: (bar: DrumBar, barIndex: number, totalBars: number) => void,
): DrumBar[] {
  const bars: DrumBar[] = [];
  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const bar = createEmptyBar();
    sculptBar(bar, barIndex, barCount);
    bars.push(bar);
  }
  return bars;
}

export function addSnareBackbeatSimple(bar: DrumBar, velocity = 0.9, options: HitOptions = {}): void {
  addSnareSimple(bar, 4, velocity, options);
  addSnareSimple(bar, 12, velocity, options);
}

export function addSnareBackbeat(bar: DrumBar, velocity = 0.9): void {
  addSnareBackbeatSimple(bar, velocity);
}

export function addKickSimple(bar: DrumBar, subdivision: number, velocity: number, options: HitOptions = {}): void {
  addHitToLane(bar.kick, subdivision, 'kick', velocity, options);
}

export function addSnareSimple(bar: DrumBar, subdivision: number, velocity: number, options: HitOptions = {}): void {
  const token: SampleToken = options.rim ? 'rimshot' : 'snare';
  addHitToLane(bar.snare, subdivision, token, velocity, options);
}

export function addHatSimple(bar: DrumBar, subdivision: number, velocity: number, options: HitOptions = {}): void {
  const token: SampleToken = options.open ? 'hatsOpen' : 'hatsClosed';
  addHitToLane(bar.hats, subdivision, token, velocity, options);
}

export function addPercussionSimple(bar: DrumBar, subdivision: number, velocity: number, options: HitOptions = {}): void {
  const token: SampleToken = options.type === 'pedal' ? 'hatsPedal' : 'crash';
  addHitToLane(bar.percussion, subdivision, token, velocity, options);
}

// Backwards-compatible aliases
export const addKick = addKickSimple;
export const addSnare = addSnareSimple;
export const addHat = addHatSimple;
export const addPercussion = addPercussionSimple;

type EvenHatOptions = {
  step: number;
  baseVelocity: number;
  accentEvery: number;
  swing: number;
  dropoutSlots?: number[];
} & HumanizeOptions;

export function fillEvenHats(bar: DrumBar, options: EvenHatOptions): void {
  const { step, baseVelocity, accentEvery, swing, dropoutSlots, ...humanize } = options;
  for (let slot = 0; slot < SUBDIVISIONS_PER_BAR; slot += step) {
    if (dropoutSlots?.includes(slot)) {
      continue;
    }
    const accent = accentEvery > 0 && slot % accentEvery === 0;
    addHatSimple(bar, slot, accent ? baseVelocity + 0.08 : baseVelocity, {
      swing,
      ...humanize,
    });
  }
}

export function fillShuffleHats(
  bar: DrumBar,
  swing: number,
  accentEvery: number,
  humanize: HumanizeOptions = {},
): void {
  const slots = [0, 3, 6, 9, 12, 15];
  slots.forEach((slot) => {
    const accent = accentEvery > 0 && (slot / 3) % accentEvery === 0;
    addHatSimple(bar, slot, accent ? 0.78 : 0.66, {
      swing,
      ...humanize,
    });
  });
}

function addHitToLane(
  lane: DrumHit[],
  subdivision: number,
  token: SampleToken,
  baseVelocity: number,
  options: HitOptions,
): void {
  const { velocity, offsetMs } = applyHumanization(baseVelocity, options.offsetMs, options);
  const sample = resolveSample(token);
  lane.push(
    buildHit(subdivision, sample, velocity, {
      swing: options.swing,
      offsetMs,
    }),
  );
}

function resolveSample(token: SampleToken): string {
  if (token.endsWith('.wav')) {
    return token;
  }
  switch (token) {
    case 'kick':
      return randomSample('kick');
    case 'rimshot':
      return randomSample('rimshot');
    case 'snare':
      return randomSample('snare');
    case 'hatsOpen':
      return randomSample('hatsOpen');
    case 'hatsClosed':
      return randomSample('hatsClosed');
    case 'hatsPedal':
      return randomSample('hatsPedal');
    case 'crash':
    default:
      return randomSample('crash');
  }
}

function createEmptyBar(): DrumBar {
  return {
    kick: [],
    snare: [],
    hats: [],
    percussion: [],
  };
}

function buildHit(subdivision: number, sample: string, velocity: number, options: { swing?: number; offsetMs?: number }): DrumHit {
  return {
    subdivision: clampSubdivision(subdivision),
    sample,
    velocity: clampVelocity(velocity),
    swing: options.swing,
    offsetMs: options.offsetMs ?? 0,
  };
}

function applyHumanization(baseVelocity: number, baseOffsetMs = 0, options: HumanizeOptions) {
  const velocityJitter = options.velocityJitter ?? 0;
  const offsetJitterMs = options.offsetJitterMs ?? 0;
  const velocity = clampVelocity(baseVelocity + (Math.random() * 2 - 1) * velocityJitter);
  const offsetMs = baseOffsetMs + (Math.random() * 2 - 1) * offsetJitterMs;
  return { velocity, offsetMs };
}

function clampSubdivision(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value >= SUBDIVISIONS_PER_BAR) {
    return SUBDIVISIONS_PER_BAR - 1;
  }
  return value;
}

function clampVelocity(value: number): number {
  if (value < 0.05) {
    return 0.05;
  }
  if (value > 1) {
    return 1;
  }
  return Number.parseFloat(value.toFixed(3));
}
