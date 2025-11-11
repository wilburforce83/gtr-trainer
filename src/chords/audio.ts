import * as Tone from 'tone';
import { Chord, Note } from '@tonaljs/tonal';
import type { HarmonyCell } from './types';
import type { Voicing } from './voicings';
import { STANDARD_TUNING, tuningToMidi } from '../lib/neck';

type PlayOptions = {
  arpeggiate?: boolean;
  msBetween?: number;
};

const tuningMidi = tuningToMidi(STANDARD_TUNING);
let synth: Tone.PolySynth<Tone.Synth> | null = null;
let metronome: Tone.MembraneSynth | null = null;
let metronomeLoop: Tone.Loop | null = null;
let toneReady = false;
let unlockRegistered = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

async function ensureTone(): Promise<void> {
  if (!isBrowser()) {
    throw new Error('Not in browser');
  }
  if (!toneReady) {
    await Tone.start();
    toneReady = true;
  }
  ensureSynth();
}

export function primeChordAudioUnlock(): void {
  if (!isBrowser() || toneReady || unlockRegistered) {
    return;
  }
  unlockRegistered = true;
  const unlock = async () => {
    try {
      await ensureTone();
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
  try {
    await ensureTone();
    return true;
  } catch {
    primeChordAudioUnlock();
    return false;
  }
}

export async function playChord(voicing: Voicing, options: PlayOptions = {}): Promise<void> {
  const ready = await primeAudio();
  const notes = voicingToNotes(voicing);
  if (!ready || !notes.length || !synth) {
    return;
  }
  const now = Tone.now();
  const { arpeggiate = false, msBetween = 80 } = options;
  if (arpeggiate) {
    notes.forEach((note, idx) => {
      synth!.triggerAttackRelease(note, '8n', now + (msBetween / 1000) * idx);
    });
    return;
  }
  synth.triggerAttackRelease(notes, '2n', now);
}

export async function playProgression(cells: HarmonyCell[], loop: boolean): Promise<boolean> {
  const ready = await primeAudio();
  if (!ready || !synth) {
    return false;
  }
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
        triggerVoicing(voicing, time);
      } else {
        const notes = chordSymbolToNotes(cell.symbol);
        if (notes.length) {
          synth!.triggerAttackRelease(notes, '2n', time);
        }
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

function ensureSynth() {
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.set({
      volume: -8,
    });
  }
}

function triggerVoicing(voicing: Voicing, time: number) {
  if (!synth) {
    return;
  }
  const notes = voicingToNotes(voicing);
  if (!notes.length) {
    return;
  }
  synth.triggerAttackRelease(notes, '2n', time);
}

function voicingToNotes(voicing: Voicing): string[] {
  return voicing.strings
    .filter((entry) => entry.fret >= 0)
    .map((entry) => {
      const midi = tuningMidi[entry.str - 1] + entry.fret;
      return Note.fromMidi(midi);
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

function cellIndexToPosition(index: number): string {
  const bar = Math.floor(index / 2);
  const half = index % 2;
  const beats = half * 2;
  return `${bar}:${beats}:0`;
}
