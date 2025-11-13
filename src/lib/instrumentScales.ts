import { Note } from '@tonaljs/tonal';
import { getScaleById, getScaleByName } from '../scales';
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
const DEGREE_SYMBOLS: Record<number, string> = {
  0: '1',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: 'b6',
  9: '6',
  10: 'b7',
  11: '7',
};

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

function formatDegreeFromInterval(interval: number): string {
  const normalized = ((interval % 12) + 12) % 12;
  return DEGREE_SYMBOLS[normalized] ?? `${interval}`;
}

function getPitchClassName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return pcToNoteName(pc);
}

function formatNoteLabel(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${getPitchClassName(midi)}${octave}`;
}

export type InstrumentId = 'guitar' | 'bass' | 'ukulele' | 'mandolin' | 'banjo';

export type InstrumentTuning = {
  id: string;
  label: string;
  notes: MidiNote[];
};

export type InstrumentConfig = {
  id: InstrumentId;
  label: string;
  tunings: InstrumentTuning[];
  frets: number;
  positions: number;
};

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    id: 'guitar',
    label: 'Guitar (EADGBE)',
    tunings: [
      { id: 'std', label: 'Standard (EADGBE)', notes: [40, 45, 50, 55, 59, 64] },
      { id: 'drop-d', label: 'Drop D (DADGBE)', notes: [38, 45, 50, 55, 59, 64] },
      { id: 'dadgad', label: 'DADGAD', notes: [38, 45, 50, 55, 57, 62] },
      { id: 'open-g', label: 'Open G (DGDGBD)', notes: [38, 43, 50, 55, 59, 62] },
    ],
    frets: 22,
    positions: 5,
  },
  {
    id: 'bass',
    label: 'Bass (EADG)',
    tunings: [
      { id: 'std', label: 'Standard (EADG)', notes: [28, 33, 38, 43] },
      { id: 'drop-d', label: 'Drop D (DADG)', notes: [26, 33, 38, 43] },
      { id: 'bead', label: 'BEAD', notes: [23, 28, 33, 38] },
    ],
    frets: 20,
    positions: 4,
  },
  {
    id: 'ukulele',
    label: 'Ukulele (GCEA)',
    tunings: [
      { id: 'reentrant', label: 'High G (gCEA)', notes: [60, 64, 67, 69] },
      { id: 'linear', label: 'Low G (GCEA)', notes: [55, 60, 64, 69] },
      { id: 'baritone', label: 'Baritone (DGBE)', notes: [50, 55, 59, 64] },
    ],
    frets: 15,
    positions: 4,
  },
  {
    id: 'mandolin',
    label: 'Mandolin (GDAE)',
    tunings: [
      { id: 'std', label: 'Standard (GDAE)', notes: [55, 62, 69, 76] },
      { id: 'gdad', label: 'GDAD', notes: [55, 62, 69, 74] },
    ],
    frets: 15,
    positions: 4,
  },
  {
    id: 'banjo',
    label: 'Banjo (gDGBD)',
    tunings: [
      { id: 'open-g', label: 'Open G (gDGBD)', notes: [50, 55, 59, 62, 67] },
      { id: 'double-c', label: 'Double C (gCGCD)', notes: [48, 55, 60, 62, 67] },
    ],
    frets: 22,
    positions: 4,
  },
];

const INSTRUMENT_MAP = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]));

export function getInstrument(id: InstrumentId): InstrumentConfig {
  return INSTRUMENT_MAP.get(id) ?? INSTRUMENTS[0];
}

export function getInstrumentTuning(instrument: InstrumentConfig, tuningId: string): InstrumentTuning {
  return instrument.tunings.find((option) => option.id === tuningId) ?? instrument.tunings[0];
}

export type PositionWindow = {
  index: number;
  startFret: number;
  endFret: number;
};

export const DEFAULT_FRET_SPAN = 4;

export function buildPositionWindows(instrument: InstrumentConfig, fretSpan = DEFAULT_FRET_SPAN): PositionWindow[] {
  const count = Math.max(1, instrument.positions);
  const maxStart = Math.max(0, instrument.frets - fretSpan);
  const step = count > 1 ? Math.max(1, Math.floor(maxStart / (count - 1))) : 0;
  const windows: PositionWindow[] = [];
  for (let index = 0; index < count; index += 1) {
    const rawStart = index * step;
    const startFret = Math.min(rawStart, maxStart);
    const endFret = Math.min(startFret + fretSpan, instrument.frets);
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

export function buildInstrumentScaleData({
  instrument,
  tuning,
  key,
  scale,
  positionIndex,
  fretSpan = DEFAULT_FRET_SPAN,
}: {
  instrument: InstrumentConfig;
  tuning: InstrumentTuning;
  key: string;
  scale: ScaleDef;
  positionIndex: number;
  fretSpan?: number;
}): {
  markers: NoteMarker[];
  highlightIds: Set<string>;
  sequence: SequenceToken[];
  tuningNotes: string[];
  windows: PositionWindow[];
  clampedPositionIndex: number;
  displayTuningMidi: number[];
} {
  const displayTuningMidi = [...tuning.notes].reverse();
  const tuningNotes = displayTuningMidi.map((midi) => Note.fromMidi(midi) ?? 'E');
  const windows = buildPositionWindows(instrument, fretSpan);
  const clampedPositionIndex = Math.min(Math.max(0, positionIndex), Math.max(0, windows.length - 1));
  const activeWindow = windows[clampedPositionIndex] ?? null;
  const { pcs, rootPc } = buildScalePcs(key, scale);
  const pcSet = new Set(pcs);
  const intervalMap = new Map<number, string>();
  scale.intervals.forEach((interval) => {
    const pcValue = ((rootPc + interval) % 12 + 12) % 12;
    intervalMap.set(pcValue, formatDegreeFromInterval(interval));
  });
  const degreeMap = buildDegreeLabelMap(scale);
  const markers: NoteMarker[] = [];
  const highlightIds = new Set<string>();

  for (let stringNumber = displayTuningMidi.length; stringNumber >= 1; stringNumber -= 1) {
    const openMidi = displayTuningMidi[stringNumber - 1];
    for (let fret = 0; fret <= instrument.frets; fret += 1) {
      const midi = openMidi + fret;
      const note = getPitchClassName(midi);
      const pitchClass = ((midi % 12) + 12) % 12;
      const inScale = pcSet.has(pitchClass);
      const isRoot = pitchClass === rootPc;
      const id = `s${stringNumber}f${fret}`;
      const intervalPc = ((pitchClass - rootPc) % 12 + 12) % 12;
      const inWindow = activeWindow ? fret >= activeWindow.startFret && fret <= activeWindow.endFret : false;
      const degree = intervalMap.get(pitchClass);
      const marker: NoteMarker = {
        id,
        string: stringNumber,
        fret,
        note,
        midi,
        inScale,
        isRoot,
        inCurrentPosition: inScale && inWindow,
        degreeLabel: degree ?? (inScale ? degreeMap.get(intervalPc) : undefined),
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
    displayTuningMidi,
  };
}

export function generateScalePositions(
  instrumentId: InstrumentId,
  tuningId: string,
  scaleName: string,
  rootNote: NoteName,
  fretSpan = DEFAULT_FRET_SPAN,
) {
  const instrument = getInstrument(instrumentId);
  const tuning = getInstrumentTuning(instrument, tuningId);
  const scaleDef = getScaleByName(scaleName) ?? getScaleById(scaleName);
  if (!scaleDef) {
    throw new Error(`Unknown scale: ${scaleName}`);
  }
  const windows = buildPositionWindows(instrument, fretSpan);
  const tuningLabels = tuning.notes.map((midi) => formatNoteLabel(midi));
  const positions = windows.map((_, index) => {
    const data = buildInstrumentScaleData({
      instrument,
      tuning,
      key: rootNote,
      scale: scaleDef,
      positionIndex: index,
      fretSpan,
    });
    const frets = data.markers
      .filter((marker) => marker.inCurrentPosition)
      .map((marker) => ({
        string: marker.string,
        fret: marker.fret,
        note: formatNoteLabel(marker.midi),
      }));
    return {
      startFret: windows[index].startFret,
      frets,
    };
  });
  return {
    instrument: instrument.label,
    tuning: tuningLabels,
    scale: scaleDef.name,
    positions,
  };
}

type CanonicalPositionSpec = {
  label: string;
  startFret: number;
  endFret: number;
  ignoreStrings?: number[];
  comment?: string;
};

const INSTRUMENT_FRET_LIMITS: Partial<Record<InstrumentId, number>> = {
  ukulele: 12,
  mandolin: 12,
  banjo: 12,
};

const CAGED_SHAPES = [
  { label: 'CAGED – E-shape', rootStrings: [6], startOffset: -1, endOffset: 3 },
  { label: 'CAGED – D-shape', rootStrings: [4, 2], startOffset: -2, endOffset: 2 },
  { label: 'CAGED – C-shape', rootStrings: [5, 2], startOffset: -3, endOffset: 1 },
  { label: 'CAGED – A-shape', rootStrings: [5], startOffset: -1, endOffset: 3 },
  { label: 'CAGED – G-shape', rootStrings: [6, 2], startOffset: -3, endOffset: 1 },
];

const BASS_WINDOWS = [
  { label: 'Bass – Position 1 (Frets 1–4)', startFret: 0, endFret: 4 },
  { label: 'Bass – Position 2 (Frets 5–8)', startFret: 5, endFret: 8 },
  { label: 'Bass – Position 3 (Frets 9–12)', startFret: 9, endFret: 12 },
  { label: 'Bass – Position 4 (Frets 13–16)', startFret: 13, endFret: 16 },
];

const FFCP_OFFSETS = [
  { label: 'FFcP 1', offset: 0 },
  { label: 'FFcP 2', offset: 2 },
  { label: 'FFcP 3', offset: 4 },
  { label: 'FFcP 4', offset: 6 },
];

export function generateCanonicalPositions(scaleName: string, root: NoteName) {
  const scaleDef = getScaleByName(scaleName) ?? getScaleById(scaleName);
  if (!scaleDef) {
    throw new Error(`Unknown scale: ${scaleName}`);
  }
  const rootPc = noteNameToPc(root);
  const results: Array<{
    instrument: string;
    tuning: string[];
    position: string;
    frets: Array<{ string: number; fret: number; note: string; degree: string }>;
    comment?: string;
  }> = [];
  INSTRUMENTS.forEach((instrument) => {
    const tuning = instrument.tunings[0];
    const data = buildInstrumentScaleData({
      instrument,
      tuning,
      key: root,
      scale: scaleDef,
      positionIndex: 0,
      fretSpan: DEFAULT_FRET_SPAN,
    });
    const specs = buildCanonicalPositionSpecs({
      instrument,
      rootPc,
      displayTuningMidi: data.displayTuningMidi,
    });
    specs.forEach((spec) => {
      const frets = spec.comment
        ? []
        : collectPositionNotes(
            data.markers,
            spec,
            instrument.id,
            spec.ignoreStrings,
          );
      results.push({
        instrument: instrument.label,
        tuning: tuning.notes.map(formatNoteLabel),
        position: spec.label,
        frets,
        ...(spec.comment && { comment: spec.comment }),
      });
    });
  });
  return results;
}

function collectPositionNotes(
  markers: NoteMarker[],
  spec: CanonicalPositionSpec,
  instrumentId: InstrumentId,
  ignoreStrings: number[] = [],
) {
  const ignore = new Set(ignoreStrings);
  const limit = INSTRUMENT_FRET_LIMITS[instrumentId] ?? Infinity;
  const endFret = Math.min(spec.endFret, limit);
  return markers
    .filter(
      (marker) =>
        marker.inScale &&
        marker.fret >= spec.startFret &&
        marker.fret <= endFret &&
        !ignore.has(marker.string),
    )
    .map((marker) => ({
      string: marker.string,
      fret: marker.fret,
      note: formatNoteLabel(marker.midi),
      degree: marker.degreeLabel ?? '',
    }));
}

function buildCanonicalPositionSpecs({
  instrument,
  rootPc,
  displayTuningMidi,
}: {
  instrument: InstrumentConfig;
  rootPc: number;
  displayTuningMidi: number[];
}): CanonicalPositionSpec[] {
  switch (instrument.id) {
    case 'guitar':
      return buildGuitarCagedSpecs(instrument, rootPc, displayTuningMidi);
    case 'bass':
      return BASS_WINDOWS.map((window) => ({
        label: window.label,
        startFret: window.startFret,
        endFret: Math.min(window.endFret, instrument.frets),
      }));
    case 'ukulele':
      return buildFfcpSpecs('Ukulele', instrument, rootPc, displayTuningMidi);
    case 'mandolin':
      return buildFfcpSpecs('Mandolin', instrument, rootPc, displayTuningMidi);
    case 'banjo':
      return buildBanjoSpecs(rootPc, displayTuningMidi);
    default:
      return [];
  }
}

function buildGuitarCagedSpecs(
  instrument: InstrumentConfig,
  rootPc: number,
  displayTuningMidi: number[],
): CanonicalPositionSpec[] {
  const specs: CanonicalPositionSpec[] = [];
  let minFret = 0;
  CAGED_SHAPES.forEach((shape) => {
    const match = findRootOnStrings(shape.rootStrings, minFret, displayTuningMidi, rootPc, instrument.frets);
    if (match) {
      const start = clampFret(match.fret + shape.startOffset, instrument.frets);
      const end = clampFret(match.fret + shape.endOffset, instrument.frets, start);
      specs.push({
        label: `Guitar – ${shape.label}`,
        startFret: start,
        endFret: end,
      });
      minFret = end + 1;
    } else {
      specs.push({
        label: `Guitar – ${shape.label}`,
        startFret: 0,
        endFret: 0,
        comment: 'Root not available on required string within range',
      });
    }
  });
  return specs;
}

function buildFfcpSpecs(
  instrumentLabel: string,
  instrument: InstrumentConfig,
  rootPc: number,
  displayTuningMidi: number[],
): CanonicalPositionSpec[] {
  const specs: CanonicalPositionSpec[] = [];
  const lowestString = displayTuningMidi.length;
  const rootMatch = findRootOnStrings([lowestString], 0, displayTuningMidi, rootPc, instrument.frets);
  const maxFret = Math.min(instrument.frets, 12);
  if (rootMatch) {
    FFCP_OFFSETS.forEach((entry) => {
      const start = clampFret(rootMatch.fret + entry.offset, maxFret);
      const end = clampFret(start + 3, maxFret, start);
      specs.push({
        label: `${instrumentLabel} – ${entry.label}`,
        startFret: start,
        endFret: end,
      });
    });
  } else {
    specs.push({
      label: `${instrumentLabel} – FFcP 1`,
      startFret: 0,
      endFret: 0,
      comment: 'Root not available within fret range',
    });
  }
  return specs;
}

function buildBanjoSpecs(
  rootPc: number,
  displayTuningMidi: number[],
): CanonicalPositionSpec[] {
  const ignoreDrone = [1];
  const specs: CanonicalPositionSpec[] = [
    { label: 'Banjo – Scruggs Open position', startFret: 0, endFret: 4, ignoreStrings: ignoreDrone },
    { label: 'Banjo – Scruggs Closed position', startFret: 5, endFret: 9, ignoreStrings: ignoreDrone },
  ];
  const dShape = findRootOnStrings([3], 0, displayTuningMidi, rootPc, 12);
  if (dShape) {
    const start = clampFret(dShape.fret - 2, 12);
    const end = clampFret(dShape.fret + 2, 12, start);
    specs.push({
      label: 'Banjo – Scruggs Movable D-shape',
      startFret: start,
      endFret: end,
      ignoreStrings: ignoreDrone,
    });
  } else {
    specs.push({
      label: 'Banjo – Scruggs Movable D-shape',
      startFret: 0,
      endFret: 0,
      ignoreStrings: ignoreDrone,
      comment: 'Root not available on 2nd string within range',
    });
  }
  const fShape = findRootOnStrings([2], 0, displayTuningMidi, rootPc, 12);
  if (fShape) {
    const start = clampFret(fShape.fret - 2, 12);
    const end = clampFret(fShape.fret + 2, 12, start);
    specs.push({
      label: 'Banjo – Scruggs Movable F-shape',
      startFret: start,
      endFret: end,
      ignoreStrings: ignoreDrone,
    });
  } else {
    specs.push({
      label: 'Banjo – Scruggs Movable F-shape',
      startFret: 0,
      endFret: 0,
      ignoreStrings: ignoreDrone,
      comment: 'Root not available on 1st string within range',
    });
  }
  return specs;
}

function findRootOnStrings(
  strings: number[],
  minFret: number,
  displayTuningMidi: number[],
  rootPc: number,
  maxFret: number,
): { string: number; fret: number } | null {
  let best: { string: number; fret: number } | null = null;
  strings.forEach((stringNumber) => {
    const openMidi = getOpenMidiForString(displayTuningMidi, stringNumber);
    if (openMidi === null) {
      return;
    }
    const fret = findRootFret(openMidi, rootPc, minFret, maxFret);
    if (fret === null) {
      return;
    }
    if (!best || fret < best.fret) {
      best = { string: stringNumber, fret };
    }
  });
  return best;
}

function findRootFret(
  openMidi: number,
  rootPc: number,
  minFret: number,
  maxFret: number,
): number | null {
  for (let fret = Math.max(0, minFret); fret <= maxFret; fret += 1) {
    const midi = openMidi + fret;
    if (((midi % 12) + 12) % 12 === rootPc) {
      return fret;
    }
  }
  return null;
}

function getOpenMidiForString(displayTuningMidi: number[], stringNumber: number): number | null {
  const index = stringNumber - 1;
  if (index < 0 || index >= displayTuningMidi.length) {
    return null;
  }
  return displayTuningMidi[index];
}

function clampFret(value: number, maxFret: number, minValue = 0): number {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxFret) {
    return maxFret;
  }
  return value;
}
