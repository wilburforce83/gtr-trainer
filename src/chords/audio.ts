import * as Tone from 'tone';
import { Chord } from '@tonaljs/tonal';
import type { HarmonyCell } from './types';
import type { Voicing } from './voicings';
import { STANDARD_TUNING, tuningToMidi } from '../lib/neck';
import { getSampler, midiToNoteName, primeSamplerUnlock } from '../lib/samplePlayer';

export {
  DEFAULT_EFFECT_SETTINGS,
  setReverbAmount,
  setTapeAmount,
  setToneAmount,
} from '../lib/samplePlayer';
export type { EffectSettings } from '../lib/samplePlayer';

type StrumMode = 'arpeggio' | 'strum' | 'picked';

type PlayOptions = {
  mode?: StrumMode;
};

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
  const mode = options.mode ?? 'arpeggio';
  triggerNotesWithMode(sampler, notes, now, mode);
}

export async function playProgression(
  cells: HarmonyCell[],
  loop: boolean,
  options: PlayOptions = {},
): Promise<boolean> {
  const ready = await primeAudio();
  const sampler = await ensureSamplerReady();
  if (!ready || !sampler) {
    return false;
  }
  const mode = options.mode ?? 'arpeggio';
  Tone.Transport.stop();
  Tone.Transport.cancel();
  Tone.Transport.loop = loop;
  const totalBars = Math.max(1, cells.length / 2);
  Tone.Transport.loopEnd = `${Math.ceil(totalBars)}:0:0`;

  cells.forEach((cell, index) => {
    const position = cellIndexToPosition(index);
    Tone.Transport.schedule((time) => {
      const voicing = cell.voicing;
      if (voicing) {
        const notes = voicingToNotes(voicing);
        triggerNotesWithMode(sampler, notes, time, mode);
      } else {
        const notes = chordSymbolToNotes(cell.symbol);
        triggerNotesWithMode(sampler, notes, time, mode);
      }
    }, position);
  });

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

function triggerNotesWithMode(sampler: Tone.Sampler, notes: string[], time: number, mode: StrumMode) {
  if (!notes.length) {
    return;
  }
  if (mode === 'arpeggio') {
    notes.forEach((note, idx) => {
      sampler.triggerAttackRelease(note, '2n', time + idx * 0.08);
    });
    return;
  }
  if (mode === 'picked') {
    triggerPickingPattern(sampler, notes, time);
    return;
  }
  sampler.triggerAttackRelease(notes, '1m', time);
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

function triggerPickingPattern(sampler: Tone.Sampler, notes: string[], startTime: number) {
  const sequence = buildPickingSequence(notes, 4);
  if (!sequence.length) {
    return;
  }
  const stepDuration = Tone.Time('8n').toSeconds();
  sequence.forEach((note, step) => {
    sampler.triggerAttackRelease(note, '8n', startTime + step * stepDuration);
  });
}

function buildPickingSequence(notes: string[], length = 4): string[] {
  if (!notes.length) {
    return [];
  }
  const sorted = sortNotesAscending(notes);
  const sequence: string[] = [];
  if (sorted.length === 1) {
    return Array.from({ length }, () => sorted[0]);
  }
  if (sorted.length === 2) {
    while (sequence.length < length) {
      sequence.push(sorted[0], sorted[1]);
    }
    return sequence.slice(0, length);
  }
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const mid = sorted[Math.floor(sorted.length / 2)];
  const secondLowest = sorted[1];
  const pattern = [lowest, highest, mid, highest, secondLowest];
  while (sequence.length < length) {
    sequence.push(pattern[sequence.length % pattern.length]);
  }
  return sequence.slice(0, length);
}

function sortNotesAscending(notes: string[]): string[] {
  return [...notes].sort((a, b) => noteToMidi(a) - noteToMidi(b));
}

function noteToMidi(note: string): number {
  try {
    return Tone.Frequency(note).toMidi();
  } catch {
    return 0;
  }
}

function cellIndexToPosition(index: number): string {
  const bar = Math.floor(index / 2);
  const half = index % 2;
  const beats = half * 2;
  return `${bar}:${beats}:0`;
}
