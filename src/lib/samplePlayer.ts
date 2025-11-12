import * as Tone from 'tone';

const GUITAR_SAMPLE_NOTES = [
  'Gb2',
  'Ab2',
  'Bb2',
  'Db3',
  'Eb3',
  'E3',
  'F3',
  'Gb3',
  'G3',
  'Ab3',
  'A3',
  'Bb3',
  'B3',
  'C4',
  'Db4',
  'D4',
  'Eb4',
  'E4',
  'F4',
  'Gb4',
  'G4',
  'Ab4',
  'A4',
  'Bb4',
  'B4',
  'C5',
  'Db5',
  'D5',
  'Eb5',
  'E5',
  'F5',
  'Gb5',
  'G5',
  'Ab5',
  'A5',
  'Bb5',
  'B5',
  'C6',
  'Db6',
  'D6',
  'E6',
  'F6',
  'G6',
  'A6',
  'B6',
  'C7',
  'D7',
];

const GUITAR_SAMPLE_URLS: Record<string, string> = GUITAR_SAMPLE_NOTES.reduce((acc, note) => {
  const match = note.match(/^([A-G](?:b|#)?)(\d)$/i);
  if (!match) {
    return acc;
  }
  const [, pitch, octave] = match;
  const normalizedPitch = pitch[0].toUpperCase() + pitch.slice(1);
  const actualOctave = Number(octave) - 1;
  const actualNote = `${normalizedPitch}${actualOctave}`;
  const midi = Tone.Frequency(actualNote).toMidi();
  if (midi !== null) {
    const canonical = Tone.Frequency(midi, 'midi').toNote();
    if (canonical) {
      acc[canonical] = `${note}.wav`;
    }
  }
  acc[actualNote] = `${note}.wav`;
  return acc;
}, {} as Record<string, string>);

const GUITAR_SAMPLE_BASE_URL = '/samples/guitar/';
const PIANO_SAMPLE_BASE_URL = '/samples/piano/';
const PIANO_SAMPLE_URLS: Record<string, string> = {
  A1: 'A1.mp3',
  A2: 'A2.mp3',
  A3: 'A3.mp3',
  A4: 'A4.mp3',
  A5: 'A5.mp3',
  A6: 'A6.mp3',
  C2: 'C2.mp3',
  C3: 'C3.mp3',
  C4: 'C4.mp3',
  C5: 'C5.mp3',
  C6: 'C6.mp3',
  C7: 'C7.mp3',
  E2: 'E2.mp3',
  E3: 'E3.mp3',
  E4: 'E4.mp3',
  E5: 'E5.mp3',
  E6: 'E6.mp3',
  G2: 'G2.mp3',
  G3: 'G3.mp3',
  G4: 'G4.mp3',
  G5: 'G5.mp3',
  G6: 'G6.mp3',
};

const MIN_DB = -36;
const MAX_DB = 0;
const GUITAR_GAIN_DB = 8;
const PIANO_GAIN_DB = 8;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

type InstrumentDefinition = {
  id: string;
  label: string;
  urls: Record<string, string>;
  baseUrl: string;
  attack?: number;
  release?: number;
  volume?: number;
  defaultOctaveShift?: number;
};

const INSTRUMENT_DEFINITIONS: InstrumentDefinition[] = [
  {
    id: 'guitar',
    label: 'Guitar',
    urls: GUITAR_SAMPLE_URLS,
    baseUrl: GUITAR_SAMPLE_BASE_URL,
    attack: 0.004,
    release: 2.4,
    volume: GUITAR_GAIN_DB,
    defaultOctaveShift: 0,
  },
  {
    id: 'piano',
    label: 'Piano',
    urls: PIANO_SAMPLE_URLS,
    baseUrl: PIANO_SAMPLE_BASE_URL,
    attack: 0.002,
    release: 1.5,
    volume: PIANO_GAIN_DB,
    defaultOctaveShift: 0,
  },
];

const INSTRUMENT_MAP = new Map(INSTRUMENT_DEFINITIONS.map((instrument) => [instrument.id, instrument]));

export const INSTRUMENT_OPTIONS = INSTRUMENT_DEFINITIONS.map(({ id, label }) => ({ id, label }));

export type EffectSettings = {
  reverb: number;
  tone: number;
  tape: number;
};

export type AmpProfile = {
  id: string;
  label: string;
  url: string | null;
};

export const AMP_PROFILES: AmpProfile[] = [
  { id: 'studio', label: 'Studio Clean (AKG D112)', url: '/samples/ir/akg-d112.wav' },
  { id: 'twin', label: 'Fender Twin', url: '/samples/ir/fender-twin.wav' },
  { id: 'frontman', label: 'Fender Frontman 212', url: '/samples/ir/fender-frontman.wav' },
  { id: 'ampeg', label: 'Ampeg Classic', url: '/samples/ir/ampeg-classic.wav' },
  { id: 'marshall', label: 'Marshall 1960VB', url: '/samples/ir/marshall-1960vb.wav' },
  { id: 'direct', label: 'Direct (Bypass)', url: null },
];

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
let convolverNode: Tone.Convolver | null = null;
let toneReady = false;
let unlockRegistered = false;
let readyPromise: Promise<void> | null = null;
let readyResolver: (() => void) | null = null;
const unlockWaiters: Array<() => void> = [];

let activeInstrumentId = INSTRUMENT_DEFINITIONS[0].id;
let reverbAmount = DEFAULT_EFFECT_SETTINGS.reverb;
let toneAmount = DEFAULT_EFFECT_SETTINGS.tone;
let tapeAmount = DEFAULT_EFFECT_SETTINGS.tape;
let ampProfileId = AMP_PROFILES[0].id;
const instrumentOctaveShift = new Map<string, number>();

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

function clampOctaveShift(value: number): number {
  if (value < MIN_OCTAVE_SHIFT) {
    return MIN_OCTAVE_SHIFT;
  }
  if (value > MAX_OCTAVE_SHIFT) {
    return MAX_OCTAVE_SHIFT;
  }
  return value;
}

function getInstrumentOctaveShift(id: string): number {
  const stored = instrumentOctaveShift.get(id);
  if (typeof stored === 'number') {
    return stored;
  }
  const instrument = INSTRUMENT_MAP.get(id);
  return clampOctaveShift(instrument?.defaultOctaveShift ?? 0);
}

function getActiveOctaveShift(): number {
  return clampOctaveShift(getInstrumentOctaveShift(activeInstrumentId));
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

function getInstrumentConfig(): InstrumentDefinition {
  return INSTRUMENT_MAP.get(activeInstrumentId) ?? INSTRUMENT_DEFINITIONS[0];
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
  if (!convolverNode) {
    convolverNode = new Tone.Convolver();
    const profile = getAmpProfile(ampProfileId);
    if (profile.url) {
      convolverNode.load(profile.url).catch(() => {});
    }
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
  convolverNode?.disconnect();

  let current: Tone.ToneAudioNode = sampler;
  const chain: Array<Tone.ToneAudioNode | null> = [
    filterNode,
    bitCrusherNode,
    reverbNode,
    convolverNode && ampProfileId !== 'direct' ? convolverNode : null,
  ];
  chain.forEach((node) => {
    if (!node) {
      return;
    }
    current.connect(node);
    current = node;
  });
  current.connect(volumeNode);
}

async function createSampler(): Promise<Tone.Sampler> {
  if (sampler) {
    return sampler;
  }
  const instrument = getInstrumentConfig();
  volumeNode = new Tone.Volume(0).toDestination();
  readyPromise = new Promise((resolve) => {
    readyResolver = resolve;
  });
  sampler = new Tone.Sampler({
    urls: instrument.urls,
    baseUrl: instrument.baseUrl,
    attack: instrument.attack ?? 0.003,
    release: instrument.release ?? 1.8,
    onload: () => {
      readyResolver?.();
      readyResolver = null;
    },
  });
  sampler.volume.value = instrument.volume ?? 0;
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

export async function setInstrument(id: string): Promise<void> {
  const nextId = INSTRUMENT_MAP.has(id) ? id : INSTRUMENT_DEFINITIONS[0].id;
  if (activeInstrumentId === nextId) {
    return;
  }
  activeInstrumentId = nextId;
  if (sampler) {
    sampler.disconnect();
    sampler.dispose();
    sampler = null;
  }
  await createSampler();
}

export function setInstrumentOctaveShift(shift: number): void {
  instrumentOctaveShift.set(activeInstrumentId, clampOctaveShift(shift));
}

export async function setAmpProfile(id: string): Promise<void> {
  ampProfileId = AMP_PROFILES.find((profile) => profile.id === id) ? id : AMP_PROFILES[0].id;
  await ensureToneStarted();
  ensureEffectNodes();
  if (!convolverNode) {
    connectChain();
    return;
  }
  const profile = getAmpProfile(ampProfileId);
  if (!profile.url) {
    connectChain();
    return;
  }
  try {
    await convolverNode.load(profile.url);
  } catch {
    // ignore failed loads
  }
  connectChain();
}

export function midiToNoteName(midi: number): string {
  const shiftedMidi = midi + getActiveOctaveShift() * 12;
  const name = Tone.Frequency(shiftedMidi, 'midi').toNote();
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

function getAmpProfile(id: string): AmpProfile {
  return AMP_PROFILES.find((profile) => profile.id === id) ?? AMP_PROFILES[0];
}
