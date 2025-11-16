import { Note } from '@tonaljs/tonal';
import { normalizeKey, resolvePositionSystem } from '../scales';
import type { ScaleDef } from '../scales';
import { getPentatonicPatterns } from '../scales/pentatonic';
import { getThreeNpsPatterns } from '../scales/threeNPS';

export type PositionSystemType = '5BOX' | '7NPS';

export interface PositionNote {
  string: number;
  fret: number;
  midi: number;
  note: string;
  isRoot: boolean;
  step: number;
}

export interface PositionResult {
  index: number;
  label: string;
  system: PositionSystemType;
  notes: PositionNote[];
  idSet: Set<string>;
}

export interface BuildPositionOptions {
  key: string;
  scale: ScaleDef;
  tuningMidi: number[];
  maxFret?: number;
}

const DEFAULT_MAX_FRET = 22;

function buildStringOrder(stringCount: number): number[] {
  return Array.from({ length: Math.max(1, stringCount) }, (_, idx) => stringCount - idx);
}

export function buildPositions({
  key,
  scale,
  tuningMidi,
  maxFret = DEFAULT_MAX_FRET,
}: BuildPositionOptions): PositionResult[] {
  const normalizedKey = normalizeKey(key);
  const system = resolvePositionSystem(scale) as PositionSystemType;
  const stringOrder = buildStringOrder(tuningMidi.length);
  const patterns =
    system === '5BOX'
      ? getPentatonicPatterns(stringOrder.length)
      : getThreeNpsPatterns(stringOrder.length);
  const rootMidi = resolveRootMidi(normalizedKey, tuningMidi, maxFret);
  const positions: PositionResult[] = [];

  patterns.forEach((pattern, patternIndex) => {
    const notes: PositionNote[] = [];
    const idSet = new Set<string>();

    pattern.steps.forEach((stepsOnString, idx) => {
      const stringNumber = stringOrder[idx];
      if (typeof stringNumber !== 'number') {
        return;
      }
      const stringMidi = tuningMidi[stringNumber - 1];
      if (typeof stringMidi !== 'number') {
        return;
      }

      stepsOnString.forEach((step) => {
        const semitoneOffset = intervalForStep(scale.intervals, step);
        const midi = rootMidi + semitoneOffset;
        const fret = midi - stringMidi;
        if (fret < 0 || fret > maxFret) {
          return;
        }
        const display = Note.fromMidi(midi) ?? '';
        const noteName = (display ? Note.pitchClass(display) : null) ?? display ?? '';
        const id = `s${stringNumber}f${fret}`;
        const isRoot = step % scale.intervals.length === 0;
        notes.push({ string: stringNumber, fret, midi, note: noteName, isRoot, step });
        idSet.add(id);
      });
    });

    notes.sort((a, b) => {
      if (a.string === b.string) {
        return a.fret - b.fret;
      }
      return b.string - a.string;
    });

    positions.push({
      index: patternIndex,
      label: pattern.name,
      system,
      notes,
      idSet,
    });
  });

  return positions;
}

function intervalForStep(intervals: number[], step: number): number {
  const length = intervals.length;
  const octave = Math.floor(step / length);
  const index = step % length;
  return intervals[index] + 12 * octave;
}

function resolveRootMidi(key: string, tuningMidi: number[], maxFret: number): number {
  const lowestStringMidi = tuningMidi[tuningMidi.length - 1] ?? Note.midi(`${key}3`) ?? 0;
  const octaves = [2, 3, 1, 4, 5];
  for (const octave of octaves) {
    const midi = Note.midi(`${key}${octave}`);
    if (typeof midi === 'number') {
      const diff = midi - lowestStringMidi;
      if (diff >= 0 && diff <= 12) {
        return midi;
      }
    }
  }
  const highestReachable = (tuningMidi[0] ?? lowestStringMidi) + Math.max(0, maxFret);
  for (let octave = 0; octave <= 7; octave += 1) {
    const midi = Note.midi(`${key}${octave}`);
    if (typeof midi === 'number' && midi >= lowestStringMidi && midi <= highestReachable) {
      return midi;
    }
  }
  const fallback = Note.midi(`${key}3`);
  if (typeof fallback === 'number') {
    return fallback;
  }
  return lowestStringMidi;
}
