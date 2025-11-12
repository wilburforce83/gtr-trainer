import * as Tone from 'tone';
import type { SequenceToken } from './sequencing';
import { emitNotePlay } from './noteEvents';
import { getSampler, midiToNoteName, primeSamplerUnlock, setSamplerVolume } from './samplePlayer';

export type VoicingPosition = {
  string: number;
  fret: number;
};

let clickSynth: Tone.Synth | null = null;
let sequencePart: Tone.Part | null = null;
let masterVolume = 0.85;
const METRONOME_GAIN_DB = -30;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function primeAudioUnlock(): void {
  if (!isBrowser()) {
    return;
  }
  primeSamplerUnlock();
  if (!clickSynth) {
    const unlock = async () => {
      try {
        await Tone.start();
      } catch {
        return;
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
}

async function ensureAudio(): Promise<{ sampler: Tone.Sampler } | null> {
  if (!isBrowser()) {
    return null;
  }
  try {
    const sampler = await getSampler();
    if (!clickSynth) {
      clickSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination();
      clickSynth.volume.value = METRONOME_GAIN_DB;
    }
    applyVolume();
    return { sampler };
  } catch {
    return null;
  }
}

export async function setBpm(bpm: number): Promise<void> {
  const ready = await ensureAudio();
  if (!ready) {
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
  const ready = await ensureAudio();
  if (!ready) {
    return;
  }
  const sampler = ready.sampler;
  sampler.volume.value = 10;
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
    sampler.triggerAttackRelease(midiToNoteName(value.midi), '8n', time);
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
const MAX_DB = 0;

function normalizedToDb(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return MIN_DB + (MAX_DB - MIN_DB) * clamped;
}

export function setGlobalVolume(value: number): void {
  masterVolume = Math.min(1, Math.max(0, value));
  applyVolume();
}

export async function playChord(
  voicing: VoicingPosition[],
  tuningMidi: number[],
  mode: 'arpeggio' | 'strum' | 'picked' = 'arpeggio',
): Promise<void> {
  if (!voicing.length) {
    return;
  }
  const ready = await ensureAudio();
  if (!ready) {
    return;
  }
  const sampler = ready.sampler;
  const startTime = Tone.now();
  const ordered = [...voicing];
  if (mode === 'arpeggio') {
    ordered.sort((a, b) => b.string - a.string);
  }
  ordered.forEach((position, index) => {
    const stringMidi = tuningMidi[position.string - 1];
    if (typeof stringMidi !== 'number') {
      return;
    }
    const midi = stringMidi + position.fret;
    let time = startTime;
    let duration: Tone.Unit.Time = '2n';
    if (mode === 'arpeggio') {
      time += index * 0.08;
      duration = '2n';
    } else if (mode === 'picked') {
      time += (index % 2 === 0 ? index * 0.12 : index * 0.18) + Math.random() * 0.03;
      duration = '1n';
    } else {
      time += index * 0.015;
      duration = '1m';
    }
    sampler.triggerAttackRelease(midiToNoteName(midi), duration, time);
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
  setSamplerVolume(masterVolume).catch(() => {});
  if (clickSynth) {
    clickSynth.volume.value = normalizedToDb(masterVolume) + METRONOME_GAIN_DB;
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
