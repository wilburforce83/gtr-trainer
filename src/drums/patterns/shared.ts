import type { DrumBar, DrumHit } from '../../drums/types';
import { randomSample } from '../samples';

export type PatternBuilder = (barCount: number, swing: number) => DrumBar[];

export const SUBDIVISIONS_PER_BAR = 16;

// -----------------------------------------------------------------------------
// Humanisation helpers
// -----------------------------------------------------------------------------

export type HumanizeOptions = {
  /** Max +/- change in velocity (0–1 scale). Default: 0 (no jitter). */
  velocityJitter?: number;
  /** Max +/- ms timing offset. Default: 0 (no jitter). */
  offsetJitterMs?: number;
};

type HitOptions = {
  swing?: number;
  open?: boolean;
  rim?: boolean;
  ghost?: boolean;
  offsetMs?: number;
  type?: 'crash' | 'pedal';
} & HumanizeOptions;

function applyHumanization(
  baseVelocity: number,
  baseOffsetMs: number | undefined,
  options?: HumanizeOptions,
): { velocity: number; offsetMs: number } {
  const jitterV = options?.velocityJitter ?? 0;
  const jitterT = options?.offsetJitterMs ?? 0;

  const velocity =
    jitterV > 0
      ? baseVelocity + (Math.random() * 2 - 1) * jitterV
      : baseVelocity;

  const offsetMs =
    jitterT > 0
      ? (baseOffsetMs ?? 0) + (Math.random() * 2 - 1) * jitterT
      : baseOffsetMs ?? 0;

  return { velocity: clampVelocity(velocity), offsetMs };
}

// -----------------------------------------------------------------------------
// Pattern builder
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// SIMPLE / VERBATIM FUNCTIONS (no timbral randomisation)
// -----------------------------------------------------------------------------

export function addSnareBackbeatSimple(
  bar: DrumBar,
  velocity = 0.9,
  options: HitOptions = {},
): void {
  addSnareSimple(bar, 4, velocity, options);
  addSnareSimple(bar, 12, velocity, options);
}

/**
 * SIMPLE backbeat by default – this is the version your patterns should usually use.
 * If you want the older randomised backbeat, call addSnareBackbeatRandom instead.
 */
export function addSnareBackbeat(bar: DrumBar, velocity = 0.9): void {
  addSnareBackbeatSimple(bar, velocity);
}

export function addKickSimple(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.kick.push(buildHit(subdivision, 'kick', v, { swing: options.swing, offsetMs }));
}

export function addSnareSimple(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const sample = options.rim ? 'rimshot' : 'snare';
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.snare.push(
    buildHit(subdivision, sample, v, { swing: options.swing, offsetMs }),
  );
}

export function addHatSimple(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const sample = options.open ? 'hatsOpen' : 'hatsClosed';
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.hats.push(
    buildHit(subdivision, sample, v, { swing: options.swing, offsetMs }),
  );
}

export function addPercussionSimple(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const sample = options.type === 'pedal' ? 'hatsPedal' : 'crash';
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.percussion.push(
    buildHit(subdivision, sample, v, { swing: options.swing, offsetMs }),
  );
}

// -----------------------------------------------------------------------------
// RANDOMISED / CHARACTERFUL FUNCTIONS (use randomSample)
// -----------------------------------------------------------------------------

export function addKickRandom(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.kick.push(
    buildHit(subdivision, randomSample('kick'), v, {
      swing: options.swing,
      offsetMs,
    }),
  );
}

/** Old behaviour of addSnare (random pool). */
export function addSnareRandom(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const sample = options.rim ? randomSample('rimshot') : randomSample('snare');
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.snare.push(
    buildHit(subdivision, sample, v, { swing: options.swing, offsetMs }),
  );
}

/** Old behaviour of addHat (random pool). */
export function addHatRandom(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const sample = options.open
    ? randomSample('hatsOpen')
    : randomSample('hatsClosed');
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.hats.push(
    buildHit(subdivision, sample, v, { swing: options.swing, offsetMs }),
  );
}

/** Old behaviour of addPercussion (random pool). */
export function addPercussionRandom(
  bar: DrumBar,
  subdivision: number,
  velocity: number,
  options: HitOptions = {},
): void {
  const pool = options.type === 'pedal' ? 'hatsPedal' : 'crash';
  const sample = pool === 'crash' ? randomSample('crash') : randomSample('hatsPedal');
  const { velocity: v, offsetMs } = applyHumanization(
    velocity,
    options.offsetMs,
    options,
  );
  bar.percussion.push(
    buildHit(subdivision, sample, v, { swing: options.swing, offsetMs }),
  );
}

export function addSnareBackbeatRandom(
  bar: DrumBar,
  velocity = 0.9,
  options: HitOptions = {},
): void {
  addSnareRandom(bar, 4, velocity, options);
  addSnareRandom(bar, 12, velocity, options);
}

// -----------------------------------------------------------------------------
// Hat fillers – now use SIMPLE hats by default
// -----------------------------------------------------------------------------

type EvenHatOptions = {
  step: number;
  baseVelocity: number;
  accentEvery: number;
  swing: number;
  dropoutSlots?: number[];
} & HumanizeOptions;

export function fillEvenHats(
  bar: DrumBar,
  { step, baseVelocity, accentEvery, swing, dropoutSlots, velocityJitter, offsetJitterMs }: EvenHatOptions,
): void {
  for (let slot = 0; slot < SUBDIVISIONS_PER_BAR; slot += step) {
    if (dropoutSlots?.includes(slot)) continue;
    const accent = accentEvery > 0 && slot % accentEvery === 0;
    const velocity = accent ? baseVelocity + 0.08 : baseVelocity;
    addHatSimple(bar, slot, velocity, {
      swing,
      velocityJitter,
      offsetJitterMs,
    });
  }
}

export function fillShuffleHats(
  bar: DrumBar,
  swing: number,
  accentEvery: number,
  options: HumanizeOptions = {},
): void {
  const slots = [0, 3, 6, 9, 12, 15];
  slots.forEach((slot, i) => {
    const accent = accentEvery > 0 && i % accentEvery === 0;
    const velocity = accent ? 0.78 : 0.66;
    addHatSimple(bar, slot, velocity, { swing, ...options });
  });
}

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function createEmptyBar(): DrumBar {
  return {
    kick: [],
    snare: [],
    hats: [],
    percussion: [],
  };
}

function buildHit(
  subdivision: number,
  sample: string,
  velocity: number,
  options: { swing?: number; offsetMs?: number } = {},
): DrumHit {
  return {
    subdivision: clampSubdivision(subdivision),
    sample,
    velocity: clampVelocity(velocity),
    swing: options.swing,
    offsetMs: options.offsetMs ?? 0,
  };
}

function clampSubdivision(value: number): number {
  if (value < 0) return 0;
  if (value >= SUBDIVISIONS_PER_BAR) return SUBDIVISIONS_PER_BAR - 1;
  return value;
}

function clampVelocity(value: number): number {
  if (value < 0.15) return 0.15;
  if (value > 1) return 1;
  return Number.parseFloat(value.toFixed(3));
}
