import * as Tone from 'tone';

const SAMPLE_URLS: Record<string, string> = {
  E2: 'E2.wav',
  A2: 'A2.wav',
  D3: 'D3.wav',
  G3: 'G3.wav',
  B3: 'B4.wav',
  E4: 'E5.wav',
};

const SAMPLE_BASE_URL = '/samples/guitar/';
const MIN_DB = -36;
const MAX_DB = -6;

export type EffectSettings = {
  reverb: number;
  tone: number;
  tape: number;
};

export const DEFAULT_EFFECT_SETTINGS: EffectSettings = {
  reverb: 0.25,
  tone: 0.65,
  tape: 0,
};

let sampler: Tone.Sampler | null = null;
let volumeNode: Tone.Volume | null = null;
let filterNode: Tone.Filter | null = null;
let bitCrusherNode: Tone.BitCrusher | null = null;
let reverbNode: Tone.Reverb | null = null;
let toneReady = false;
let unlockRegistered = false;
let readyPromise: Promise<void> | null = null;
let readyResolver: (() => void) | null = null;
const unlockWaiters: Array<() => void> = [];

let reverbAmount = DEFAULT_EFFECT_SETTINGS.reverb;
let toneAmount = DEFAULT_EFFECT_SETTINGS.tone;
let tapeAmount = DEFAULT_EFFECT_SETTINGS.tape;

function normalizedToDb(value: number): number {
  const clamped = clamp01(value);
  return MIN_DB + (MAX_DB - MIN_DB) * clamped;
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function registerUnlock() {
  if (typeof window === 'undefined' || unlockRegistered) {
    return;
  }
  unlockRegistered = true;
  const unlock = async () => {
    try {
      await Tone.start();
      toneReady = true;
      unlockRegistered = false;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      while (unlockWaiters.length) {
        unlockWaiters.shift()?.();
      }
    } catch {
      unlockRegistered = false;
    }
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

async function ensureToneStarted(): Promise<void> {
  if (!toneReady) {
    try {
      await Tone.start();
      toneReady = true;
    } catch {
      registerUnlock();
      await new Promise<void>((resolve) => {
        unlockWaiters.push(resolve);
      });
    }
  }
}

function ensureEffectNodes(): void {
  if (!filterNode) {
    filterNode = new Tone.Filter({
      type: 'lowpass',
      frequency: toneAmountToFrequency(toneAmount),
      Q: 0.8,
    });
  }
  if (!bitCrusherNode) {
    bitCrusherNode = new Tone.BitCrusher({
      bits: tapeAmountToBits(tapeAmount),
    });
    bitCrusherNode.wet.value = tapeAmount;
  }
  if (!reverbNode) {
    reverbNode = new Tone.Reverb({
      decay: 3.2,
      preDelay: 0.02,
      wet: reverbAmount,
    });
  }
}

function connectChain() {
  if (!sampler || !volumeNode) {
    return;
  }
  ensureEffectNodes();
  applyEffectSettings();

  sampler.disconnect();
  filterNode?.disconnect();
  bitCrusherNode?.disconnect();
  reverbNode?.disconnect();

  sampler.connect(filterNode ?? volumeNode);
  if (filterNode) {
    filterNode.connect(bitCrusherNode ?? volumeNode);
  }
  if (bitCrusherNode) {
    bitCrusherNode.connect(reverbNode ?? volumeNode);
  }
  (reverbNode ?? bitCrusherNode ?? filterNode ?? sampler).connect(volumeNode);
}

async function createSampler(): Promise<Tone.Sampler> {
  if (sampler) {
    return sampler;
  }
  volumeNode = new Tone.Volume(0).toDestination();
  readyPromise = new Promise((resolve) => {
    readyResolver = resolve;
  });
  sampler = new Tone.Sampler({
    urls: SAMPLE_URLS,
    baseUrl: SAMPLE_BASE_URL,
    attack: 0.004,
    release: 2.4,
    onload: () => {
      readyResolver?.();
      readyResolver = null;
    },
  });
  connectChain();
  return sampler;
}

export function primeSamplerUnlock(): void {
  registerUnlock();
}

export async function getSampler(): Promise<Tone.Sampler> {
  await ensureToneStarted();
  const instance = await createSampler();
  if (readyPromise) {
    await readyPromise;
  }
  return instance;
}

export async function setSamplerVolume(amount: number): Promise<void> {
  await getSampler();
  if (volumeNode) {
    volumeNode.volume.value = normalizedToDb(amount);
  }
}

export function setReverbAmount(value: number): void {
  reverbAmount = clamp01(value);
  if (reverbNode) {
    reverbNode.wet.rampTo(reverbAmount, 0.1);
  }
}

export function setToneAmount(value: number): void {
  toneAmount = clamp01(value);
  if (filterNode) {
    filterNode.frequency.rampTo(toneAmountToFrequency(toneAmount), 0.1);
  }
}

export function setTapeAmount(value: number): void {
  tapeAmount = clamp01(value);
  if (bitCrusherNode) {
    bitCrusherNode.wet.rampTo(tapeAmount, 0.1);
    bitCrusherNode.set({ bits: tapeAmountToBits(tapeAmount) });
  }
}

export function midiToNoteName(midi: number): string {
  const name = Tone.Frequency(midi, 'midi').toNote();
  return name ?? Tone.Frequency(60, 'midi').toNote();
}

export function releaseAllVoices(): void {
  sampler?.releaseAll();
}

function toneAmountToFrequency(amount: number): number {
  const minFreq = 500;
  const maxFreq = 12000;
  const shaped = Math.pow(amount, 0.65);
  return minFreq + (maxFreq - minFreq) * shaped;
}

function tapeAmountToBits(amount: number): number {
  const minBits = 2;
  const maxBits = 8;
  const scaled = Math.round(maxBits - (maxBits - minBits) * amount);
  return Math.min(maxBits, Math.max(minBits, scaled));
}

function applyEffectSettings(): void {
  if (filterNode) {
    filterNode.frequency.value = toneAmountToFrequency(toneAmount);
  }
  if (bitCrusherNode) {
    bitCrusherNode.set({ bits: tapeAmountToBits(tapeAmount) });
    bitCrusherNode.wet.value = tapeAmount;
  }
  if (reverbNode) {
    reverbNode.wet.value = reverbAmount;
  }
}
