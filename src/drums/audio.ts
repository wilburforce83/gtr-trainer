import * as Tone from 'tone';
import { KICK_SAMPLES, RIMSHOT_SAMPLES, SNARE_SAMPLES, HAT_CLOSED_SAMPLES, HAT_OPEN_SAMPLES, HAT_PEDAL_SAMPLES, HAT_CRASH_SAMPLES, DRUM_SAMPLE_BASE } from './samples';
import type { DrumPattern, DrumMixerSettings, DrumHit, DrumLane } from './types';
import { DEFAULT_DRUM_MIXER } from './types';

const LANES: DrumLane[] = ['kick', 'snare', 'hats', 'percussion'];
const SUBDIVISIONS_PER_BAR = 16;
const MAX_OFFSET_MS = 18;

type LaneSampler = {
  sampler: Tone.Sampler;
  volume: Tone.Volume;
  sampleNoteMap: Record<string, string>;
};

const laneState: Partial<Record<DrumLane, LaneSampler>> = {};
let drumBus: Tone.Volume | null = null;
let mixerSettings: DrumMixerSettings = { ...DEFAULT_DRUM_MIXER };
let kitReadyPromise: Promise<void> | null = null;
let kitResolver: (() => void) | null = null;

export async function primeDrumKit(): Promise<boolean> {
  try {
    await Tone.start();
  } catch {
    return false;
  }
  if (areLanesReady()) {
    return true;
  }
  if (!kitReadyPromise) {
    kitReadyPromise = new Promise((resolve) => {
      kitResolver = resolve;
    });
    try {
      await Promise.all(LANES.map((lane) => loadLane(lane)));
      kitResolver?.();
      kitResolver = null;
    } catch {
      kitResolver?.();
      kitResolver = null;
      kitReadyPromise = null;
      return false;
    }
  }
  await kitReadyPromise;
  applyMixerSettings();
  return true;
}

export function setDrumMixer(settings: DrumMixerSettings): void {
  mixerSettings = { ...settings };
  applyMixerSettings();
}

export function scheduleDrumPattern(pattern: DrumPattern, totalBars?: number): void {
  if (!areLanesReady()) {
    return;
  }
  const barsToRender = typeof totalBars === 'number' ? Math.max(1, Math.round(totalBars)) : pattern.barCount;
  const copies = Math.ceil(barsToRender / pattern.barCount);
  for (let copy = 0; copy < copies; copy += 1) {
    pattern.bars.forEach((bar, index) => {
      const barNumber = index + copy * pattern.barCount;
      if (barNumber >= barsToRender) {
        return;
      }
      scheduleHits(bar.kick, 'kick', barNumber, pattern);
      scheduleHits(bar.snare, 'snare', barNumber, pattern);
      scheduleHits(bar.hats, 'hats', barNumber, pattern);
      scheduleHits(bar.percussion, 'percussion', barNumber, pattern);
    });
  }
}

function scheduleHits(hits: DrumHit[], lane: DrumLane, barNumber: number, pattern: DrumPattern): void {
  hits.forEach((hit) => {
    const position = barSubdivisionToPosition(barNumber, hit.subdivision);
    Tone.Transport.schedule((time) => {
      const swingDelay = computeSwingDelay(hit.subdivision, hit.swing ?? pattern.swing);
      const offset = clampOffset(hit.offsetMs);
      triggerLaneSample(lane, hit.sample, time + swingDelay + offset, hit.velocity);
    }, position);
  });
}

function triggerLaneSample(lane: DrumLane, sample: string, time: number, velocity: number): void {
  const state = laneState[lane];
  if (!state) {
    return;
  }
  const note = state.sampleNoteMap[sample];
  if (!note) {
    return;
  }
  state.sampler.triggerAttackRelease(note, '16n', time, clampVelocity(velocity));
}

function computeSwingDelay(subdivision: number, swing: number): number {
  if (!swing || swing <= 0) {
    return 0;
  }
  if (subdivision % 4 !== 2) {
    return 0;
  }
  const eighth = Tone.Time('8n').toSeconds();
  return swing * eighth;
}

function clampOffset(value = 0): number {
  const limited = Math.max(-MAX_OFFSET_MS, Math.min(MAX_OFFSET_MS, value));
  return limited / 1000;
}

function barSubdivisionToPosition(bar: number, subdivision: number): string {
  const total = bar * SUBDIVISIONS_PER_BAR + Math.max(0, Math.min(SUBDIVISIONS_PER_BAR - 1, subdivision));
  const measure = Math.floor(total / SUBDIVISIONS_PER_BAR);
  const remainder = total % SUBDIVISIONS_PER_BAR;
  const beat = Math.floor(remainder / 4);
  const sixteenth = remainder % 4;
  return `${measure}:${beat}:${sixteenth}`;
}

function areLanesReady(): boolean {
  return LANES.every((lane) => Boolean(laneState[lane]));
}

async function loadLane(lane: DrumLane): Promise<void> {
  if (laneState[lane]) {
    return;
  }
  ensureBus();
  const sampleNames = getLaneSamples(lane);
  const sampleNoteMap: Record<string, string> = {};
  const urls: Record<string, string> = {};
  sampleNames.forEach((sample, index) => {
    const midi = 36 + index;
    const note = Tone.Frequency(midi, 'midi').toNote();
    sampleNoteMap[sample] = note;
    urls[note] = sample;
  });
  const sampler = await new Promise<Tone.Sampler>((resolve) => {
    const instance = new Tone.Sampler({
      urls,
      baseUrl: DRUM_SAMPLE_BASE,
      attack: lane === 'hats' ? 0.001 : 0.004,
      release: lane === 'kick' ? 0.8 : 0.6,
      onload: () => resolve(instance),
    });
  });
  sampler.volume.value = lane === 'kick' ? -4 : -6;
  const volume = new Tone.Volume(normalizedToDb(getLaneLevel(lane))).connect(getBus());
  sampler.connect(volume);
  laneState[lane] = { sampler, volume, sampleNoteMap };
}

function getLaneSamples(lane: DrumLane): string[] {
  if (lane === 'kick') {
    return KICK_SAMPLES;
  }
  if (lane === 'snare') {
    return [...SNARE_SAMPLES, ...RIMSHOT_SAMPLES];
  }
  if (lane === 'hats') {
    return [...HAT_CLOSED_SAMPLES, ...HAT_OPEN_SAMPLES, ...HAT_PEDAL_SAMPLES];
  }
  return [...HAT_CRASH_SAMPLES, ...HAT_PEDAL_SAMPLES];
}

function ensureBus(): void {
  if (drumBus) {
    return;
  }
  drumBus = new Tone.Volume(normalizedToDb(mixerSettings.drumBus)).toDestination();
}

function getBus(): Tone.Volume {
  ensureBus();
  return drumBus!;
}

function getLaneLevel(lane: DrumLane): number {
  switch (lane) {
    case 'kick':
      return mixerSettings.kick;
    case 'snare':
      return mixerSettings.snare;
    case 'hats':
      return mixerSettings.hats;
    case 'percussion':
    default:
      return mixerSettings.percussion;
  }
}

function applyMixerSettings(): void {
  if (drumBus) {
    drumBus.volume.rampTo(normalizedToDb(mixerSettings.drumBus), 0.08);
  }
  LANES.forEach((lane) => {
    const laneMixer = laneState[lane];
    if (!laneMixer) {
      return;
    }
    laneMixer.volume.volume.rampTo(normalizedToDb(getLaneLevel(lane)), 0.08);
  });
}

function normalizedToDb(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  const min = -42;
  const max = 6;
  return min + (max - min) * clamped;
}

function clampVelocity(value: number): number {
  if (value < 0.1) {
    return 0.1;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
