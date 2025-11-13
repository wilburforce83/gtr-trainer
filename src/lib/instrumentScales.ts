import { Note } from '@tonaljs/tonal';
import type { ScaleDef } from '../scales';
import type { NoteMarker } from './neck';
import type { SequenceToken } from './sequencing';

export type NoteName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B';

type MidiNote = number;

const NOTE_TO_PC: Record<NoteName, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

const SHARP_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteNameToPc(name: NoteName): number {
  const pc = NOTE_TO_PC[name];
  if (typeof pc === 'number') {
    return pc;
  }
  throw new Error(`Unknown note name: ${name}`);
}

export function pcToNoteName(pc: number): NoteName {
  const normalized = ((pc % 12) + 12) % 12;
  return SHARP_NAMES[normalized];
}

export type InstrumentId = 'guitar' | 'bass' | 'ukulele' | 'mandolin';

export type InstrumentConfig = {
  id: InstrumentId;
  label: string;
  /** Lowest string first (low pitch → high pitch) */
  tuning: MidiNote[];
  frets: number;
  positions: number;
};

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'guitar',
    label: 'Guitar (EADGBE)',
    tuning: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    frets: 22,
    positions: 5,
  },
  {
    id: 'bass',
    label: 'Bass (EADG)',
    tuning: [28, 33, 38, 43], // E1 A1 D2 G2
    frets: 20,
    positions: 5,
  },
  {
    id: 'ukulele',
    label: 'Ukulele (GCEA)',
    tuning: [67, 60, 64, 69], // re-entrant G4 C4 E4 A4
    frets: 15,
    positions: 4,
  },
  {
    id: 'mandolin',
    label: 'Mandolin (GDAE)',
    tuning: [55, 62, 69, 76], // G3 D4 A4 E5
    frets: 15,
    positions: 4,
  },
];

const INSTRUMENT_MAP = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]));

export function getInstrument(id: InstrumentId): InstrumentConfig {
  return INSTRUMENT_MAP.get(id) ?? INSTRUMENTS[0];
}

export type PositionWindow = {
  index: number;
  startFret: number;
  endFret: number;
};

const WINDOW_SIZE = 4;

export function buildPositionWindows(instrument: InstrumentConfig): PositionWindow[] {
  const count = Math.max(1, instrument.positions);
  const windows: PositionWindow[] = [];
  const step = Math.max(1, Math.floor(WINDOW_SIZE / 2));
  const maxStart = Math.max(0, instrument.frets - (WINDOW_SIZE - 1));
  for (let index = 0; index < count; index += 1) {
    let startFret = index * step;
    if (startFret > maxStart) {
      startFret = Math.max(0, maxStart);
    }
    const endFret = Math.min(instrument.frets, startFret + WINDOW_SIZE - 1);
    windows.push({ index, startFret, endFret });
  }
  return windows;
}

export function isNoteInPosition(note: NoteMarker, window: PositionWindow | null): boolean {
  if (!window) {
    return false;
  }
  return note.fret >= window.startFret && note.fret <= window.endFret;
}

export function buildScalePcs(root: string, scale: ScaleDef): { pcs: number[]; rootPc: number } {
  const normalized = Note.pitchClass(root) ?? root;
  const rootPc = noteNameToPc(normalized as NoteName);
  const pcs = scale.intervals.map((interval) => ((rootPc + interval) % 12 + 12) % 12);
  return { pcs, rootPc };
}

type DegreeMap = Map<number, string>;

function buildDegreeLabelMap(scale: ScaleDef): DegreeMap {
  const MAJOR_TEMPLATE = [0, 2, 4, 5, 7, 9, 11];
  const map = new Map<number, string>();
  scale.intervals.forEach((interval, idx) => {
    const normalized = ((interval % 12) + 12) % 12;
    if (!map.has(normalized)) {
      let bestDiff = Number.POSITIVE_INFINITY;
      let bestDegree = -1;
      MAJOR_TEMPLATE.forEach((template, templateIdx) => {
        let diff = normalized - template;
        if (diff > 6) {
          diff -= 12;
        } else if (diff < -6) {
          diff += 12;
        }
        if (Math.abs(diff) < Math.abs(bestDiff)) {
          bestDiff = diff;
          bestDegree = templateIdx;
        }
      });
      if (bestDegree >= 0 && Math.abs(bestDiff) <= 1) {
        const accidental = bestDiff === 0 ? '' : bestDiff === -1 ? '♭' : '♯';
        map.set(normalized, `${accidental}${bestDegree + 1}`);
      } else {
        map.set(normalized, `${idx + 1}`);
      }
    }
  });
  return map;
}

function markersToSequence(markers: NoteMarker[]): SequenceToken[] {
  const selected = markers
    .filter((marker) => marker.inScale && marker.inCurrentPosition)
    .map((marker) => ({
      id: marker.id,
      string: marker.string,
      fret: marker.fret,
      midi: marker.midi,
      note: marker.note,
    }));
  if (!selected.length) {
    return [];
  }
  selected.sort((a, b) => {
    if (a.midi === b.midi) {
      return a.string - b.string;
    }
    return a.midi - b.midi;
  });
  const descending = [...selected].reverse().slice(1);
  const ordered = [...selected, ...descending];
  return ordered.map((entry, idx) => ({
    ...entry,
    duration: '8' as const,
    sequenceIndex: idx,
  }));
}

function midiToNoteName(midi: number): string {
  const full = Note.fromMidi(midi);
  return (full ? Note.pitchClass(full) : null) ?? full ?? '';
}

export function buildInstrumentScaleData({
  instrument,
  key,
  scale,
  positionIndex,
}: {
  instrument: InstrumentConfig;
  key: string;
  scale: ScaleDef;
  positionIndex: number;
}): {
  markers: NoteMarker[];
  highlightIds: Set<string>;
  sequence: SequenceToken[];
  tuningNotes: string[];
  windows: PositionWindow[];
  clampedPositionIndex: number;
} {
  const displayTuningMidi = [...instrument.tuning].reverse();
  const tuningNotes = displayTuningMidi.map((midi) => Note.fromMidi(midi) ?? 'E');
  const windows = buildPositionWindows(instrument);
  const clampedPositionIndex = Math.min(Math.max(0, positionIndex), Math.max(0, windows.length - 1));
  const activeWindow = windows[clampedPositionIndex] ?? null;
  const { pcs, rootPc } = buildScalePcs(key, scale);
  const pcSet = new Set(pcs);
  const degreeMap = buildDegreeLabelMap(scale);
  const markers: NoteMarker[] = [];
  const highlightIds = new Set<string>();

  for (let stringNumber = displayTuningMidi.length; stringNumber >= 1; stringNumber -= 1) {
    const openMidi = displayTuningMidi[stringNumber - 1];
    for (let fret = 0; fret <= instrument.frets; fret += 1) {
      const midi = openMidi + fret;
      const note = midiToNoteName(midi);
      const pitchClass = ((midi % 12) + 12) % 12;
      const inScale = pcSet.has(pitchClass);
      const isRoot = pitchClass === rootPc;
      const id = `s${stringNumber}f${fret}`;
      const intervalPc = ((pitchClass - rootPc) % 12 + 12) % 12;
      const inWindow = activeWindow ? fret >= activeWindow.startFret && fret <= activeWindow.endFret : false;
      const marker: NoteMarker = {
        id,
        string: stringNumber,
        fret,
        note,
        midi,
        inScale,
        isRoot,
        inCurrentPosition: inScale && inWindow,
        degreeLabel: inScale ? degreeMap.get(intervalPc) : undefined,
        rootFlavor: isRoot ? scale.flavor : undefined,
      };
      markers.push(marker);
      if (marker.inCurrentPosition) {
        highlightIds.add(id);
      }
    }
  }

  const sequence = markersToSequence(markers);

  return {
    markers,
    highlightIds,
    sequence,
    tuningNotes,
    windows,
    clampedPositionIndex,
  };
}
