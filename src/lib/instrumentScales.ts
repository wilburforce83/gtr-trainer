import { Note } from '@tonaljs/tonal';
import { getScaleById, getScaleByName } from '../scales';
import { buildPositions } from './positions';
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

const PATTERN_SOURCE_OVERRIDES: Record<string, string> = {
  bluesHexatonic: 'minorPentatonic',
};

const POSITION_COLOR_PALETTE = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#c084fc', '#f472b6'];
const UNASSIGNED_POSITION_COLOR = '#94a3b8';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const int = parseInt(normalized, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function blendColors(colors: string[]): string {
  if (colors.length === 1) {
    return colors[0];
  }
  const totals = colors.reduce(
    (acc, color) => {
      const rgb = hexToRgb(color);
      acc.r += rgb.r;
      acc.g += rgb.g;
      acc.b += rgb.b;
      return acc;
    },
    { r: 0, g: 0, b: 0 },
  );
  const count = colors.length;
  return rgbToHex({ r: totals.r / count, g: totals.g / count, b: totals.b / count });
}

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
  geometryNotes?: MidiNote[];
};

export type InstrumentConfig = {
  id: InstrumentId;
  label: string;
  tunings: InstrumentTuning[];
  frets: number;
  positions: number;
  positionRadius?: number;
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
    positionRadius: 2,
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
    positionRadius: 1,
  },
  {
    id: 'ukulele',
    label: 'Ukulele (GCEA)',
    tunings: [
      {
        id: 'reentrant',
        label: 'High G (gCEA)',
        notes: [67, 60, 64, 69],
        geometryNotes: [55, 60, 64, 69],
      },
      { id: 'linear', label: 'Low G (GCEA)', notes: [55, 60, 64, 69] },
    ],
    frets: 15,
    positions: 4,
    positionRadius: 1,
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
    positionRadius: 1,
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
    positionRadius: 2,
  },
];

const HIDDEN_INSTRUMENT_IDS = new Set<InstrumentId>(['mandolin', 'banjo']);

export const VISIBLE_INSTRUMENTS = INSTRUMENTS.filter(
  (instrument) => !HIDDEN_INSTRUMENT_IDS.has(instrument.id),
);

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
const DEFAULT_POSITION_RADIUS = 2;
const MAX_INTERVAL_STEPS = 3;
const MAX_FRET_DELTA = 6;
const MAX_LOWER_STRING_SWAP_FRETS = 5;

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

type PatternPosition = {
  ids: Set<string>;
  startFret: number;
  endFret: number;
};

type PatternPositionResult = {
  positions: PatternPosition[];
  canonicalScale: ScaleDef;
};

function getPatternTemplateScale(scale: ScaleDef): ScaleDef | null {
  if (scale.positions === 'AUTO') {
    return null;
  }
  if (scale.positions === '5BOX') {
    if (scale.intervals.length === 5) {
      return scale;
    }
    const overrideId = PATTERN_SOURCE_OVERRIDES[scale.id];
    if (overrideId) {
      return getScaleById(overrideId);
    }
    return null;
  }
  if (scale.positions === '7NPS') {
    if (scale.intervals.length === 7) {
      return scale;
    }
    return null;
  }
  return null;
}

function canUsePatternPositions(scale: ScaleDef, tuningMidi: number[]): boolean {
  if (!tuningMidi.length) {
    return false;
  }
  return Boolean(getPatternTemplateScale(scale));
}

function buildPatternPositions({
  instrument,
  key,
  scale,
  tuningMidi,
}: {
  instrument: InstrumentConfig;
  key: string;
  scale: ScaleDef;
  tuningMidi: number[];
}): PatternPositionResult | null {
  if (!canUsePatternPositions(scale, tuningMidi)) {
    return null;
  }
  const canonicalScale = getPatternTemplateScale(scale);
  if (!canonicalScale) {
    return null;
  }
  const patternResults = buildPositions({
    key,
    scale: canonicalScale,
    tuningMidi,
    maxFret: instrument.frets,
  });
  const positions = patternResults.map((position) => {
    const frets = position.notes.map((note) => note.fret);
    const startFret = frets.length ? Math.max(0, Math.min(...frets)) : 0;
    const endFret = frets.length ? Math.min(instrument.frets, Math.max(...frets)) : 0;
    return {
      ids: position.idSet,
      startFret,
      endFret,
    };
  });
  return { positions, canonicalScale };
}

type PositionClusterResult = {
  kept: NoteMarker[];
  centerFret: number;
  minFret: number;
  maxFret: number;
};

function refinePositionByCluster(markers: NoteMarker[], radius: number): PositionClusterResult {
  if (!markers.length) {
    return { kept: [], centerFret: 0, minFret: 0, maxFret: 0 };
  }
  const sortedFrets = markers
    .map((marker) => marker.fret)
    .sort((a, b) => a - b);
  const middleIndex = Math.floor(sortedFrets.length / 2);
  let centerFret = sortedFrets[middleIndex];
  if (sortedFrets.length % 2 === 0 && sortedFrets.length > 1) {
    const lower = sortedFrets[middleIndex - 1];
    const upper = sortedFrets[middleIndex];
    centerFret = Math.round((lower + upper) / 2);
  }
  const effectiveRadius = Math.max(0, Math.floor(radius));
  const minFret = centerFret - effectiveRadius;
  const maxFret = centerFret + effectiveRadius;
  let kept = markers.filter((marker) => marker.fret >= minFret && marker.fret <= maxFret);

  const byString = new Map<number, NoteMarker[]>();
  markers.forEach((marker) => {
    const list = byString.get(marker.string) ?? [];
    list.push(marker);
    byString.set(marker.string, list);
  });

  byString.forEach((list, stringNumber) => {
    const hasKept = kept.some((marker) => marker.string === stringNumber);
    if (!hasKept && list.length) {
      let closest = list[0];
      let bestDiff = Math.abs(closest.fret - centerFret);
      for (let i = 1; i < list.length; i += 1) {
        const diff = Math.abs(list[i].fret - centerFret);
        if (diff < bestDiff) {
          bestDiff = diff;
          closest = list[i];
        }
      }
      kept.push(closest);
    }
  });

  const seen = new Set<string>();
  const deduped = kept.filter((marker) => {
    const key = `${marker.string}:${marker.fret}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return {
    kept: deduped,
    centerFret,
    minFret,
    maxFret,
  };
}

function adjustPreferredKeysForLowerStrings(
  preferredKeys: Set<string>,
  scaleMap: Map<number, NoteMarker[]>,
  markerLookup: Map<string, NoteMarker>,
  stringCount: number,
): Set<string> {
  const adjusted = new Set(preferredKeys);
  preferredKeys.forEach((key) => {
    if (!adjusted.has(key)) {
      return;
    }
    const marker = markerLookup.get(key);
    if (!marker) {
      return;
    }
    for (let string = marker.string + 1; string <= stringCount; string += 1) {
      const candidates = scaleMap.get(string);
      if (!candidates?.length) {
        continue;
      }
      const swap = candidates.find(
        (candidate) =>
          candidate.midi === marker.midi &&
          Math.abs(candidate.fret - marker.fret) <= MAX_LOWER_STRING_SWAP_FRETS,
      );
      if (swap) {
        adjusted.delete(key);
        adjusted.add(`${swap.string}:${swap.fret}`);
        break;
      }
    }
  });
  return adjusted;
}

function enforceUniquePitchesPerPosition(
  scaleMap: Map<number, NoteMarker[]>,
  preferredKeys: Set<string>,
  degreeCount: number,
): NoteMarker[] {
  if (!preferredKeys.size) {
    return [];
  }
  const stringIndices = Array.from(scaleMap.keys()).sort((a, b) => b - a);
  const usedMidis = new Set<number>();
  const kept: NoteMarker[] = [];
  const keptKeys = new Set<string>();
  stringIndices.forEach((index) => {
    const list = scaleMap.get(index);
    if (!list?.length) {
      return;
    }
    let stringHasPreferred = false;
    list.forEach((marker) => {
      if (preferredKeys.has(`${marker.string}:${marker.fret}`)) {
        stringHasPreferred = true;
      }
    });
    if (!stringHasPreferred) {
      return;
    }
    list.forEach((marker, idx) => {
      const key = `${marker.string}:${marker.fret}`;
      if (!preferredKeys.has(key) || keptKeys.has(key)) {
        return;
      }
      if (!usedMidis.has(marker.midi)) {
        usedMidis.add(marker.midi);
        kept.push(marker);
        keptKeys.add(key);
        return;
      }
      const promoted = findPromotionCandidate(
        list,
        idx + 1,
        marker,
        usedMidis,
        keptKeys,
        degreeCount,
      );
      if (promoted) {
        const promotedKey = `${promoted.string}:${promoted.fret}`;
        usedMidis.add(promoted.midi);
        kept.push(promoted);
        keptKeys.add(promotedKey);
      }
    });
  });
  kept.sort((a, b) => (a.string === b.string ? a.fret - b.fret : b.string - a.string));
  return kept;
}

function findPromotionCandidate(
  list: NoteMarker[],
  startIndex: number,
  baseMarker: NoteMarker,
  usedMidis: Set<number>,
  keptKeys: Set<string>,
  degreeCount: number,
): NoteMarker | null {
  const baseDegreeIndex = typeof baseMarker.degreeIndex === 'number' ? baseMarker.degreeIndex : null;
  if (baseDegreeIndex === null || degreeCount <= 0) {
    return null;
  }
  const maxSteps = Math.min(MAX_INTERVAL_STEPS, Math.max(0, degreeCount - 1));
  for (let step = 1; step <= maxSteps; step += 1) {
    for (let i = startIndex; i < list.length; i += 1) {
      const candidate = list[i];
      const degreeIndex = typeof candidate.degreeIndex === 'number' ? candidate.degreeIndex : null;
      if (degreeIndex === null) {
        continue;
      }
      const diff = (degreeIndex - baseDegreeIndex + degreeCount) % degreeCount;
      if (diff !== step) {
        continue;
      }
      if (Math.abs(candidate.fret - baseMarker.fret) > MAX_FRET_DELTA) {
        continue;
      }
      const key = `${candidate.string}:${candidate.fret}`;
      if (keptKeys.has(key) || usedMidis.has(candidate.midi)) {
        continue;
      }
      return candidate;
    }
  }
  return null;
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
  const geometrySource =
    tuning.geometryNotes && tuning.geometryNotes.length === tuning.notes.length
      ? tuning.geometryNotes
      : tuning.notes;
  const displayTuningMidi = [...tuning.notes].reverse();
  const geometryTuningMidi = [...geometrySource].reverse();
  const enforceMinPerString = instrument.id !== 'guitar';
  const tuningNotes = displayTuningMidi.map((midi) => Note.fromMidi(midi) ?? 'E');
  const patternResult = buildPatternPositions({
    instrument,
    key,
    scale,
    tuningMidi: geometryTuningMidi,
  });
  const patternPositions = patternResult?.positions ?? [];
  const canonicalScale = patternResult?.canonicalScale ?? null;
  const patternWindows: PositionWindow[] = patternPositions.map((position, idx) => ({
    index: idx,
    startFret: position.startFret,
    endFret: position.endFret,
  }));
  const windows = patternWindows.length ? patternWindows : buildPositionWindows(instrument, fretSpan);
  const clampedPositionIndex = Math.min(Math.max(0, positionIndex), Math.max(0, windows.length - 1));
  const activeWindow = windows[clampedPositionIndex] ?? null;
  const { pcs, rootPc } = buildScalePcs(key, scale);
  const pcSet = new Set(pcs);
  const canonicalPcSet = canonicalScale ? new Set(buildScalePcs(key, canonicalScale).pcs) : null;
  const extraPcSet =
    canonicalPcSet && canonicalScale && canonicalScale.id !== scale.id
      ? new Set([...pcSet].filter((pc) => !canonicalPcSet.has(pc)))
      : null;
  const intervalMap = new Map<number, string>();
  const degreeOrderMap = new Map<number, number>();
  scale.intervals.forEach((interval, idx) => {
    const pcValue = ((rootPc + interval) % 12 + 12) % 12;
    intervalMap.set(pcValue, formatDegreeFromInterval(interval));
    if (!degreeOrderMap.has(pcValue)) {
      degreeOrderMap.set(pcValue, idx);
    }
  });
  const degreeCount = degreeOrderMap.size || scale.intervals.length;
  const degreeMap = buildDegreeLabelMap(scale);
  const markers: NoteMarker[] = [];
  const scaleMap = new Map<number, NoteMarker[]>();
  const markerLookup = new Map<string, NoteMarker>();

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
      const degree = intervalMap.get(pitchClass);
      const degreeIndex = degreeOrderMap.get(pitchClass);
      const marker: NoteMarker = {
        id,
        string: stringNumber,
        fret,
        note,
        midi,
        inScale,
        isRoot,
        inCurrentPosition: false,
        degreeLabel: degree ?? (inScale ? degreeMap.get(intervalPc) : undefined),
        rootFlavor: isRoot ? scale.flavor : undefined,
        degreeIndex,
      };
      markers.push(marker);
      markerLookup.set(id, marker);
      if (marker.inScale) {
        const list = scaleMap.get(marker.string) ?? [];
        list.push(marker);
        scaleMap.set(marker.string, list);
      }
    }
  }
  scaleMap.forEach((list) => list.sort((a, b) => a.fret - b.fret));

  const computeHighlightSet = (index: number): Set<string> => {
    const pattern = patternPositions[index] ?? null;
    const window = windows[index] ?? null;
    const highlight = new Set<string>();
    const canonicalIds = pattern?.ids ?? null;
    const windowRange =
      pattern && typeof pattern.startFret === 'number' && typeof pattern.endFret === 'number'
        ? { startFret: pattern.startFret, endFret: pattern.endFret }
        : window;
    if (canonicalIds && canonicalIds.size) {
      markers.forEach((marker) => {
        const pitchClass = ((marker.midi % 12) + 12) % 12;
        const inWindow =
          pattern && typeof pattern.startFret === 'number' && typeof pattern.endFret === 'number'
            ? marker.fret >= pattern.startFret && marker.fret <= pattern.endFret
            : false;
        const inCanonical = canonicalIds.has(marker.id);
        const isExtra = Boolean(extraPcSet && extraPcSet.has(pitchClass) && inWindow);
        if (marker.inScale && (inCanonical || isExtra)) {
          highlight.add(marker.id);
        }
      });
      if (enforceMinPerString) {
        ensureMinimumNotesPerString({
          highlight,
          markers,
          stringCount: displayTuningMidi.length,
          window: windowRange,
        });
      }
      return highlight;
    }
    if (window) {
      const radius = instrument.positionRadius ?? DEFAULT_POSITION_RADIUS;
      const windowCandidates = markers.filter(
        (marker) => marker.inScale && marker.fret >= window.startFret && marker.fret <= window.endFret,
      );
      const refined = refinePositionByCluster(windowCandidates, radius);
      const initialPreferred = new Set(refined.kept.map((marker) => `${marker.string}:${marker.fret}`));
      const preferredKeys = adjustPreferredKeysForLowerStrings(
        initialPreferred,
        scaleMap,
        markerLookup,
        displayTuningMidi.length,
      );
      let kept = enforceUniquePitchesPerPosition(scaleMap, preferredKeys, degreeCount);
      if (!kept.length) {
        kept = refined.kept;
      }
      const keptKeys = new Set(kept.map((marker) => `${marker.string}:${marker.fret}`));
      if (keptKeys.size) {
        markers.forEach((marker) => {
          const key = `${marker.string}:${marker.fret}`;
          if (marker.inScale && keptKeys.has(key)) {
            highlight.add(marker.id);
          }
        });
      } else {
        markers.forEach((marker) => {
          const inWindowRange = marker.fret >= window.startFret && marker.fret <= window.endFret;
          if (marker.inScale && inWindowRange) {
            highlight.add(marker.id);
          }
        });
      }
      if (enforceMinPerString) {
        ensureMinimumNotesPerString({
          highlight,
          markers,
          stringCount: displayTuningMidi.length,
          window,
        });
      }
      return highlight;
    }
    markers.forEach((marker) => {
      if (marker.inScale) {
        highlight.add(marker.id);
      }
    });
    if (enforceMinPerString) {
      ensureMinimumNotesPerString({
        highlight,
        markers,
        stringCount: displayTuningMidi.length,
        window: null,
      });
    }
    return highlight;
  };

  const positionHighlightSets: Array<Set<string>> = [];
  if (windows.length) {
    windows.forEach((_, idx) => {
      positionHighlightSets.push(computeHighlightSet(idx));
    });
  } else {
    positionHighlightSets.push(computeHighlightSet(0));
  }
  const highlightIds = positionHighlightSets[clampedPositionIndex] ?? positionHighlightSets[0] ?? new Set<string>();

  const allPositionHighlightIds = new Set<string>();
  positionHighlightSets.forEach((set) => {
    set.forEach((id) => allPositionHighlightIds.add(id));
  });
  markers.forEach((marker) => {
    marker.inCurrentPosition = highlightIds.has(marker.id);
  });
  const sequence = markersToSequence(markers);

  const membershipColors = new Map<string, string[]>();
  positionHighlightSets.forEach((set, index) => {
    const color = POSITION_COLOR_PALETTE[index % POSITION_COLOR_PALETTE.length];
    set.forEach((id) => {
      const list = membershipColors.get(id) ?? [];
      list.push(color);
      membershipColors.set(id, list);
    });
  });
  const positionColorMap = new Map<string, string>();
  membershipColors.forEach((colors, id) => {
    positionColorMap.set(id, blendColors(colors));
  });
  markers.forEach((marker) => {
    if (marker.inScale) {
      allPositionHighlightIds.add(marker.id);
      if (!positionColorMap.has(marker.id)) {
        positionColorMap.set(marker.id, UNASSIGNED_POSITION_COLOR);
      }
    }
  });

  return {
    markers,
    highlightIds,
    sequence,
    tuningNotes,
    windows,
    clampedPositionIndex,
    displayTuningMidi,
    positionHighlights: positionHighlightSets,
    allPositionHighlightIds,
  positionColorMap,
  };
}

function ensureMinimumNotesPerString({
  highlight,
  markers,
  stringCount,
  minNotes = 2,
  window,
}: {
  highlight: Set<string>;
  markers: NoteMarker[];
  stringCount: number;
  minNotes?: number;
  window?: PositionWindow | null;
}): void {
  if (!minNotes || minNotes <= 0) {
    return;
  }
  const center = window ? (window.startFret + window.endFret) / 2 : 0;
  for (let string = stringCount; string >= 1; string -= 1) {
    const candidates = markers
      .filter(
        (marker) =>
          marker.string === string &&
          marker.inScale &&
          (!window || (marker.fret >= window.startFret && marker.fret <= window.endFret)),
      )
      .sort((a, b) => Math.abs(a.fret - center) - Math.abs(b.fret - center));
    if (!candidates.length) {
      continue;
    }
    const current = candidates.filter((candidate) => highlight.has(candidate.id));
    if (current.length >= minNotes) {
      continue;
    }
    for (let idx = 0; idx < candidates.length && current.length < minNotes; idx += 1) {
      const candidate = candidates[idx];
      if (!highlight.has(candidate.id)) {
        highlight.add(candidate.id);
        current.push(candidate);
      }
    }
  }
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
  const tuningLabels = tuning.notes.map((midi) => formatNoteLabel(midi));
  const firstData = buildInstrumentScaleData({
    instrument,
    tuning,
    key: rootNote,
    scale: scaleDef,
    positionIndex: 0,
    fretSpan,
  });
  const { windows } = firstData;
  const positions = windows.map((window, index) => {
    const data =
      index === 0
        ? firstData
        : buildInstrumentScaleData({
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
      startFret: window.startFret,
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
