import * as Tone from 'tone';
import { Chord, Note } from '@tonaljs/tonal';
import type { HarmonyCell } from './types';
import type { Voicing } from './voicings';
import { STANDARD_TUNING, tuningToMidi } from '../lib/neck';
import { getSampler, midiToNoteName, primeSamplerUnlock } from '../lib/samplePlayer';
import type { DrumPattern } from '../drums/types';
import { primeDrumKit, scheduleDrumPattern } from '../drums/audio';

export {
  DEFAULT_EFFECT_SETTINGS,
  setReverbAmount,
  setToneAmount,
  setDelayAmount,
  setChorusAmount,
  AMP_PROFILES,
  setAmpProfile,
  INSTRUMENT_OPTIONS,
  setInstrument,
  setInstrumentOctaveShift,
} from '../lib/samplePlayer';
export type { EffectSettings, AmpProfile } from '../lib/samplePlayer';

type DrumPlaybackOptions = {
  enabled: boolean;
  pattern: DrumPattern | null;
};

type PlayOptions = {
  arpeggioSpread?: number;
  drums?: DrumPlaybackOptions;
};

const DEFAULT_ARPEGGIO_SPREAD = 0.5;
const ARPEGGIO_DIVISIONS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32];
const BASS_OCTAVE = 2;

let bassSynth: Tone.MonoSynth | null = null;
let bassVolume: Tone.Volume | null = null;
let bassLevel = 0.65;

const tuningMidi = tuningToMidi(STANDARD_TUNING);
let metronome: Tone.MembraneSynth | null = null;
let metronomeLoop: Tone.Loop | null = null;
let unlockRegistered = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

async function ensureSamplerReady(): Promise<Tone.Sampler | null> {
  if (!isBrowser()) {
    return null;
  }
  try {
    const sampler = await getSampler();
    return sampler;
  } catch {
    return null;
  }
}

async function ensureBassSynth(): Promise<boolean> {
  if (!isBrowser()) {
    return false;
  }
  try {
    await Tone.start();
  } catch {
    return false;
  }
  if (bassSynth && bassVolume) {
    return true;
  }
  bassVolume = new Tone.Volume(levelToDb(bassLevel)).toDestination();
  bassSynth = new Tone.MonoSynth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.8 },
    filter: { type: 'lowpass', rolloff: -24, frequency: 800 },
    filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.8, baseFrequency: 180, octaves: 1.2 },
  }).connect(bassVolume);
  return true;
}

export function primeChordAudioUnlock(): void {
  if (!isBrowser() || unlockRegistered) {
    return;
  }
  primeSamplerUnlock();
  unlockRegistered = true;
  const unlock = async () => {
    try {
      await Tone.start();
    } catch {
      unlockRegistered = false;
      return;
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export async function primeAudio(): Promise<boolean> {
  const sampler = await ensureSamplerReady();
  if (!sampler) {
    primeChordAudioUnlock();
    return false;
  }
  await ensureBassSynth();
  return true;
}

export async function playChord(voicing: Voicing, options: PlayOptions = {}): Promise<void> {
  const ready = await primeAudio();
  const sampler = await ensureSamplerReady();
  const notes = voicingToNotes(voicing);
  if (!ready || !notes.length || !sampler) {
    return;
  }
  const now = Tone.now();
  const spread = normalizeArpeggioSpread(options.arpeggioSpread);
  triggerNotesWithSpread(sampler, notes, now, spread);
}

export async function playProgression(
  cells: HarmonyCell[],
  loop: boolean,
  options: PlayOptions = {},
): Promise<boolean> {
  const ready = await primeAudio();
  const sampler = await ensureSamplerReady();
  const bassReady = await ensureBassSynth();
  if (!ready || !sampler) {
    return false;
  }
  const drumOptions = options.drums;
  const drumPattern = drumOptions?.enabled ? drumOptions.pattern : null;
  if (drumPattern) {
    await primeDrumKit();
  }
  const spread = normalizeArpeggioSpread(options.arpeggioSpread);
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.position = 0;
  Tone.Transport.loop = loop;
  const progressionBars = Math.max(1, cells.length / 2);
  const drumBars = drumPattern?.barCount ?? 0;
  const totalBars = Math.max(progressionBars, drumBars, 1);
  Tone.Transport.loopEnd = `${Math.ceil(totalBars)}:0:0`;

  const copies = Math.ceil(totalBars / progressionBars);
  for (let copy = 0; copy < Math.max(1, copies); copy += 1) {
    cells.forEach((cell, index) => {
      const barNumber = Math.floor(index / 2) + copy * progressionBars;
      if (barNumber >= totalBars) {
        return;
      }
      const globalIndex = copy * cells.length + index;
      const position = cellIndexToPosition(globalIndex);
      const bassNote = bassReady ? getBassNoteForCell(cell) : null;
      Tone.Transport.schedule((time) => {
        const voicing = cell.voicing;
        if (voicing) {
          const notes = voicingToNotes(voicing);
          triggerNotesWithSpread(sampler, notes, time, spread);
        } else {
          const notes = chordSymbolToNotes(cell.symbol);
          triggerNotesWithSpread(sampler, notes, time, spread);
        }
        if (bassNote) {
          triggerBassForCell(bassNote, time);
        }
      }, position);
    });
  }

  if (drumPattern) {
    scheduleDrumPattern(drumPattern, totalBars);
  }

  Tone.Transport.start();
  return true;
}

export function stopPlayback(): void {
  if (!isBrowser()) {
    return;
  }
  Tone.Transport.stop();
  Tone.Transport.cancel();
}

export async function setTransportBpm(bpm: number): Promise<boolean> {
  const ready = await primeAudio();
  if (!ready) {
    return false;
  }
  Tone.Transport.bpm.value = bpm;
  return true;
}

export async function setMetronomeEnabled(enabled: boolean): Promise<boolean> {
  const ready = await primeAudio();
  if (!ready) {
    return false;
  }
  if (enabled) {
    if (!metronome) {
      metronome = new Tone.MembraneSynth({
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
      }).toDestination();
    }
    if (!metronomeLoop) {
      metronomeLoop = new Tone.Loop((time) => {
        metronome?.triggerAttackRelease('C6', '32n', time);
      }, '4n');
      metronomeLoop.start(0);
    }
    return true;
  }
  metronomeLoop?.stop();
  metronomeLoop?.dispose();
  metronomeLoop = null;
  return true;
}

function triggerNotesWithSpread(sampler: Tone.Sampler, notes: string[], startTime: number, spread: number) {
  if (!notes.length) {
    return;
  }
  const normalized = normalizeArpeggioSpread(spread);
  if (normalized <= 0 || notes.length === 1) {
    sampler.triggerAttackRelease(notes, '1m', startTime);
    return;
  }
  const barDuration = Tone.Time('1m').toSeconds();
  const cellDuration = barDuration / 2;
  const targetSpan = normalized * cellDuration;
  const span = quantizeArpeggioSpan(targetSpan, cellDuration);
  if (span <= 0) {
    sampler.triggerAttackRelease(notes, '1m', startTime);
    return;
  }
  const interval = span / (notes.length - 1);
  notes.forEach((note, idx) => {
    sampler.triggerAttackRelease(note, '2n', startTime + idx * interval);
  });
}

function voicingToNotes(voicing: Voicing): string[] {
  return voicing.strings
    .filter((entry) => entry.fret >= 0)
    .map((entry) => {
      const midi = tuningMidi[entry.str - 1] + entry.fret;
      return midiToNoteName(midi);
    })
    .filter((note): note is string => Boolean(note));
}

function chordSymbolToNotes(symbol: string): string[] {
  const chord = Chord.get(symbol);
  if (chord.empty) {
    return [];
  }
  const octaves = [3, 3, 4, 4, 5];
  return chord.notes.map((note, idx) => `${note}${octaves[idx % octaves.length]}`);
}

function triggerBassForCell(note: string, time: number) {
  if (!bassSynth) {
    return;
  }
  bassSynth.triggerAttackRelease(note, '2n', time, 0.9);
}

function getBassNoteForCell(cell: HarmonyCell): string | null {
  if (!cell.symbol || cell.symbol.toLowerCase() === 'rest') {
    return null;
  }
  const chord = Chord.get(cell.symbol);
  const tonic = chord.empty ? inferRootFromSymbol(cell.symbol) : chord.tonic ?? inferRootFromSymbol(cell.symbol);
  const pitch = tonic ? Note.pitchClass(tonic) : null;
  if (!pitch) {
    return null;
  }
  return `${pitch}${BASS_OCTAVE}`;
}

function inferRootFromSymbol(symbol: string): string | null {
  const match = symbol.match(/[A-G](?:#|b)?/i);
  if (!match) {
    return null;
  }
  const root = match[0];
  return `${root[0].toUpperCase()}${root.slice(1)}`;
}

function cellIndexToPosition(index: number): string {
  const bar = Math.floor(index / 2);
  const half = index % 2;
  const beats = half * 2;
  return `${bar}:${beats}:0`;
}

export function setBassLevel(value: number): void {
  bassLevel = clamp01(value);
  if (bassVolume) {
    bassVolume.volume.rampTo(levelToDb(bassLevel), 0.1);
  }
}

function normalizeArpeggioSpread(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_ARPEGGIO_SPREAD;
  }
  return Math.min(1, Math.max(0, value));
}

function quantizeArpeggioSpan(targetSpan: number, windowDuration: number): number {
  if (targetSpan <= 0) {
    return 0;
  }
  let best = windowDuration;
  let bestDiff = Math.abs(best - targetSpan);
  for (const division of ARPEGGIO_DIVISIONS) {
    const candidate = windowDuration / division;
    const diff = Math.abs(candidate - targetSpan);
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
    }
  }
  return best;
}

function clamp01(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function levelToDb(value: number): number {
  const min = -42;
  const max = 6;
  const clamped = clamp01(value);
  return min + (max - min) * clamped;
}
