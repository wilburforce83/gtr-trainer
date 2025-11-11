import * as Tone from 'tone';
import type { SequenceToken } from './sequencing';
import { emitNotePlay } from './noteEvents';

export type VoicingPosition = {
  string: number;
  fret: number;
};

let synth: Tone.PolySynth | null = null;
let clickSynth: Tone.Synth | null = null;
let sequencePart: Tone.Part | null = null;
let toneReady = false;
let unlockRegistered = false;
let masterVolume = 0.6;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function primeAudioUnlock(): void {
  if (!isBrowser() || toneReady || unlockRegistered) {
    return;
  }
  unlockRegistered = true;
  const unlock = async () => {
    try {
      await Tone.start();
      toneReady = true;
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

async function ensureAudio(): Promise<boolean> {
  if (!isBrowser()) {
    return false;
  }
  if (!toneReady) {
    try {
      await Tone.start();
      toneReady = true;
    } catch {
      return false;
    }
  }
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth).toDestination();
  }
  if (!clickSynth) {
    clickSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination();
  }
  applyVolume();
  return true;
}

export async function setBpm(bpm: number): Promise<void> {
  if (!(await ensureAudio())) {
    return;
  }
  Tone.Transport.bpm.rampTo(bpm, 0.05);
}

type PlayOptions = {
  loop?: boolean;
  countIn?: number;
  masterVolume?: number;
};

export async function playSequence(sequence: SequenceToken[], options: PlayOptions = {}): Promise<void> {
  if (!sequence.length) {
    return;
  }
  if (!(await ensureAudio())) {
    return;
  }
  const subdivision = Tone.Time('8n').toSeconds();
  const beatSeconds = Tone.Time('4n').toSeconds();
  const countInBeats = options.countIn ?? 0;
  const countInSeconds = countInBeats * beatSeconds;

  if (typeof options.masterVolume === 'number') {
    setGlobalVolume(options.masterVolume);
  }

  disposeSequence();
  const events = sequence.map((step) => ({
    time: step.sequenceIndex * subdivision,
    midi: step.midi,
    id: step.id,
    sequenceIndex: step.sequenceIndex,
  }));
  sequencePart = new Tone.Part((time, value: { midi: number; id: string; sequenceIndex: number }) => {
    emitNotePlay(value.id, value.sequenceIndex);
    const frequency = Tone.Frequency(value.midi, 'midi').toFrequency();
    synth!.triggerAttackRelease(frequency, '8n', time);
  }, events as any);
  if (sequencePart) {
    const loopEnabled = options.loop ?? false;
    sequencePart.loop = loopEnabled;
    if (loopEnabled) {
      sequencePart.loopStart = subdivision;
      sequencePart.loopEnd = sequence.length * subdivision;
    }
    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    scheduleCountIn(countInBeats, beatSeconds);
    sequencePart.start(countInSeconds);
    Tone.Transport.start();
  }
}

export function stopAll(): void {
  if (!isBrowser()) {
    return;
  }
  disposeSequence();
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  emitNotePlay(null, null);
}

const MIN_DB = -36;
const MAX_DB = -6;

function normalizedToDb(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return MIN_DB + (MAX_DB - MIN_DB) * clamped;
}

export function setGlobalVolume(value: number): void {
  masterVolume = Math.min(1, Math.max(0, value));
  applyVolume();
}

export async function playChord(voicing: VoicingPosition[], tuningMidi: number[]): Promise<void> {
  if (!voicing.length) {
    return;
  }
  if (!(await ensureAudio())) {
    return;
  }
  const startTime = Tone.now();
  voicing.forEach((position, index) => {
    const stringMidi = tuningMidi[position.string - 1];
    if (typeof stringMidi !== 'number') {
      return;
    }
    const midi = stringMidi + position.fret;
    const time = startTime + index * 0.018;
    const frequency = Tone.Frequency(midi, 'midi').toFrequency();
    synth!.triggerAttackRelease(frequency, '8n', time);
  });
}

function disposeSequence(): void {
  if (sequencePart) {
    sequencePart.stop();
    sequencePart.dispose();
    sequencePart = null;
  }
  emitNotePlay(null, null);
}

function applyVolume(): void {
  const db = normalizedToDb(masterVolume);
  if (synth) {
    synth.volume.value = db;
  }
  if (clickSynth) {
    clickSynth.volume.value = db;
  }
}

function scheduleCountIn(beats: number, beatSeconds: number): void {
  if (!beats) {
    return;
  }
  for (let i = 0; i < beats; i += 1) {
    Tone.Transport.schedule((time) => {
      clickSynth?.triggerAttackRelease('C6', '16n', time);
    }, i * beatSeconds);
  }
}
