import { Note } from '@tonaljs/tonal';
import { normalizeKey } from '../scales';
import type { ScaleDef, ScaleFlavor } from '../scales';

export type NoteMarker = {
  id: string;
  string: number;
  fret: number;
  note: string;
  midi: number;
  inScale: boolean;
  isRoot: boolean;
  inCurrentPosition: boolean;
  degreeLabel?: string;
  rootFlavor?: ScaleFlavor;
  degreeIndex?: number;
};

export const STANDARD_TUNING = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const DEFAULT_TUNING_MIDI = [64, 59, 55, 50, 45, 40];
const DEFAULT_MAX_FRET = 22;

export function tuningToMidi(tuning: string[]): number[] {
  return tuning.map((note, idx) => {
    const midi = Note.midi(note);
    if (typeof midi === 'number') {
      return midi;
    }
    return DEFAULT_TUNING_MIDI[idx] ?? DEFAULT_TUNING_MIDI[DEFAULT_TUNING_MIDI.length - 1];
  });
}

export interface BuildNeckOptions {
  key: string;
  scale: ScaleDef;
  tuning?: string[];
  highlighted?: Set<string>;
  maxFret?: number;
}

export function buildNeckMarkers({
  key,
  scale,
  tuning = STANDARD_TUNING,
  highlighted,
  maxFret = DEFAULT_MAX_FRET,
}: BuildNeckOptions): NoteMarker[] {
  const normalizedKey = normalizeKey(key);
  const tuningMidi = tuningToMidi(tuning);
  const rootChroma = Note.chroma(normalizedKey) ?? 0;
  const scaleSet = new Set(scale.intervals.map((interval) => ((interval % 12) + 12) % 12));
  const degreeLabels = buildDegreeLabelMap(scale);
  const degreeOrderMap = new Map<number, number>();
  scale.intervals.forEach((interval, idx) => {
    const normalized = ((interval % 12) + 12) % 12;
    if (!degreeOrderMap.has(normalized)) {
      degreeOrderMap.set(normalized, idx);
    }
  });
  const markers: NoteMarker[] = [];

  for (let stringNumber = 6; stringNumber >= 1; stringNumber -= 1) {
    const midiRoot = tuningMidi[stringNumber - 1];
    for (let fret = 0; fret <= maxFret; fret += 1) {
      const midi = midiRoot + fret;
      const display = Note.fromMidi(midi) ?? '';
      const noteName = (display ? Note.pitchClass(display) : null) ?? display ?? '';
      const chroma = Note.chroma(display ?? '') ?? 0;
      const interval = (chroma - rootChroma + 12) % 12;
      const inScale = scaleSet.has(interval);
      const isRoot = interval === 0;
      const degreeLabel = inScale ? degreeLabels.get(interval) : undefined;
      const id = `s${stringNumber}f${fret}`;
      markers.push({
        id,
        string: stringNumber,
        fret,
        note: noteName,
        midi,
        inScale,
        isRoot,
        inCurrentPosition: highlighted?.has(id) ?? false,
        degreeLabel,
        rootFlavor: isRoot ? scale.flavor : undefined,
        degreeIndex: inScale ? degreeOrderMap.get(interval) : undefined,
      });
    }
  }

  return markers;
}

const MAJOR_TEMPLATE = [0, 2, 4, 5, 7, 9, 11];

function buildDegreeLabelMap(scale: ScaleDef): Map<number, string> {
  const map = new Map<number, string>();
  scale.intervals.forEach((interval, index) => {
    const normalized = ((interval % 12) + 12) % 12;
    if (!map.has(normalized)) {
      const label = resolveDegreeLabel(normalized, index + 1);
      map.set(normalized, label);
    }
  });
  return map;
}

function resolveDegreeLabel(semitone: number, fallbackDegree: number): string {
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestDegree = -1;
  MAJOR_TEMPLATE.forEach((template, idx) => {
    let diff = semitone - template;
    if (diff > 6) {
      diff -= 12;
    } else if (diff < -6) {
      diff += 12;
    }
    if (Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff;
      bestDegree = idx;
    }
  });
  if (bestDegree >= 0 && Math.abs(bestDiff) <= 1) {
    const accidental = bestDiff === 0 ? '' : bestDiff === -1 ? '♭' : '♯';
    return `${accidental}${bestDegree + 1}`;
  }
  return fallbackDegree.toString();
}
