import * as Tone from 'tone';
import type { SequenceToken } from './sequencing';

export type VoicingPosition = {
  string: number;
  fret: number;
};

let synth: Tone.PolySynth | null = null;
let clickSynth: Tone.Synth | null = null;
let clickLoop: Tone.Loop | null = null;
let sequencePart: Tone.Part | null = null;
let toneReady = false;
let unlockRegistered = false;

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
    synth.set({ volume: -6 });
  }
  if (!clickSynth) {
    clickSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination();
  }
  return true;
}

export async function setBpm(bpm: number): Promise<void> {
  if (!(await ensureAudio())) {
    return;
  }
  Tone.Transport.bpm.rampTo(bpm, 0.05);
}

export async function playSequence(sequence: SequenceToken[], options: { loop?: boolean } = {}): Promise<void> {
  if (!sequence.length) {
    return;
  }
  if (!(await ensureAudio())) {
    return;
  }
  disposeSequence();
  const subdivision = Tone.Time('8n').toSeconds();
  const events = sequence.map((step, index) => ({
    time: index * subdivision,
    note: step.midi,
  }));
  sequencePart = new Tone.Part((time, value: { note: number }) => {
    const frequency = Tone.Frequency(value.note, 'midi').toFrequency();
    synth!.triggerAttackRelease(frequency, '8n', time);
  }, events as any);
  if (sequencePart) {
    sequencePart.loop = options.loop ?? false;
    sequencePart.loopEnd = `${sequence.length / 2}m`;
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    sequencePart.start(0);
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
  stopClick();
}

export async function startClick(): Promise<void> {
  if (!(await ensureAudio())) {
    return;
  }
  if (clickLoop) {
    return;
  }
  clickLoop = new Tone.Loop((time) => {
    clickSynth!.triggerAttackRelease('C6', '32n', time);
  }, '4n');
  clickLoop.start(0);
  if (!Tone.Transport.state || Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }
}

export function stopClick(): void {
  if (!clickLoop) {
    return;
  }
  clickLoop.stop();
  clickLoop.cancel();
  clickLoop = null;
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
}
