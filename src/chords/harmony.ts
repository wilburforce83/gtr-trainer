import { Note, Scale } from '@tonaljs/tonal';
import type {
  GenerateProgressionParams,
  HarmonicFunction,
  HarmonyCell,
  HarmonyContext,
  StyleName,
} from './types';
import { findScale } from '../scales';

const CELLS_PER_BAR = 2;
const DEFAULT_REST_PROBABILITY: Record<StyleName, number> = {
  pop: 0.12,
  lofi: 0.2,
  'neo-soul': 0.18,
  blues: 0.05,
};
const IS_DEV = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

export type RomanDegree =
  | 'I'
  | 'ii'
  | 'iii'
  | 'IV'
  | 'V'
  | 'vi'
  | 'vii°'
  | 'I7'
  | 'IV7'
  | 'V7'
  | 'iv';

type ChordFamily = 'major' | 'minor' | 'dominant' | 'diminished';

export type ChordSlot =
  | { type: 'chord'; barIndex: number; degree: RomanDegree; chord: ChordSpec }
  | { type: 'rest'; barIndex: number };

type ChordSpec = {
  root: string;
  suffix: string;
  family: ChordFamily;
  symbol: string;
};

type ProgressionTemplate = {
  id: string;
  name: string;
  genre: StyleName;
  degrees: RomanDegree[];
};

type GeneratedPlan = {
  template: ProgressionTemplate;
  barDegrees: RomanDegree[];
  slots: ChordSlot[];
};

const PROGRESSION_TEMPLATES: ProgressionTemplate[] = [
  // Pop
  { id: 'pop_1', name: 'Axis progression', genre: 'pop', degrees: ['I', 'V', 'vi', 'IV'] },
  { id: 'pop_2', name: '50s / doo-wop', genre: 'pop', degrees: ['I', 'vi', 'IV', 'V'] },
  { id: 'pop_3', name: 'Sensitive minor start', genre: 'pop', degrees: ['vi', 'IV', 'I', 'V'] },
  { id: 'pop_4', name: 'Classic rock loop', genre: 'pop', degrees: ['I', 'IV', 'V', 'IV'] },
  { id: 'pop_5', name: 'Pre-chorus lift', genre: 'pop', degrees: ['I', 'IV', 'ii', 'V'] },
  { id: 'pop_6', name: 'Anthemic rise', genre: 'pop', degrees: ['I', 'V', 'IV', 'V'] },
  { id: 'pop_7', name: 'Wistful lift', genre: 'pop', degrees: ['IV', 'I', 'V', 'vi'] },
  { id: 'pop_8', name: 'Emotional pop', genre: 'pop', degrees: ['I', 'iii', 'vi', 'IV'] },
  // Lo-fi
  { id: 'lofi_1', name: 'Soft circular', genre: 'lofi', degrees: ['I', 'vi', 'ii', 'V'] },
  { id: 'lofi_2', name: 'Jazz slip', genre: 'lofi', degrees: ['ii', 'V', 'I', 'vi'] },
  { id: 'lofi_3', name: 'Emotional loop', genre: 'lofi', degrees: ['vi', 'IV', 'I', 'V'] },
  { id: 'lofi_4', name: 'Rising inner line', genre: 'lofi', degrees: ['I', 'IV', 'iii', 'vi'] },
  { id: 'lofi_5', name: 'Drifty IV', genre: 'lofi', degrees: ['I', 'V', 'IV', 'IV'] },
  { id: 'lofi_6', name: 'Gentle cadence', genre: 'lofi', degrees: ['IV', 'I', 'ii', 'V'] },
  { id: 'lofi_7', name: 'Open cadence', genre: 'lofi', degrees: ['ii', 'IV', 'I', 'V'] },
  { id: 'lofi_8', name: 'Borrowed iv color', genre: 'lofi', degrees: ['I', 'IV', 'iv', 'I'] },
  // Neo-soul
  { id: 'neo_1', name: 'Neo classic', genre: 'neo-soul', degrees: ['I', 'vi', 'IV', 'V'] },
  { id: 'neo_2', name: 'ii–V–I slip', genre: 'neo-soul', degrees: ['ii', 'V', 'I', 'vi'] },
  { id: 'neo_3', name: 'Circle run', genre: 'neo-soul', degrees: ['iii', 'vi', 'ii', 'V'] },
  { id: 'neo_4', name: 'Gospel lean', genre: 'neo-soul', degrees: ['I', 'IV', 'ii', 'V'] },
  { id: 'neo_5', name: 'Minor start', genre: 'neo-soul', degrees: ['vi', 'IV', 'I', 'V'] },
  { id: 'neo_6', name: 'Borrowed iv', genre: 'neo-soul', degrees: ['IV', 'iv', 'I', 'V'] },
  { id: 'neo_7', name: 'Smooth cadence', genre: 'neo-soul', degrees: ['ii', 'V', 'vi', 'IV'] },
  { id: 'neo_8', name: 'Upper motion', genre: 'neo-soul', degrees: ['I', 'V', 'vi', 'iii'] },
  { id: 'neo_9', name: 'Energy climb', genre: 'neo-soul', degrees: ['I', 'iii', 'vi', 'ii'] },
  { id: 'neo_10', name: 'Bump finish', genre: 'neo-soul', degrees: ['I', 'IV', 'V', 'iii'] },
  // Blues
  { id: 'blues_1', name: 'I7 stay', genre: 'blues', degrees: ['I7', 'I7', 'IV7', 'I7'] },
  { id: 'blues_2', name: 'Quick change', genre: 'blues', degrees: ['I7', 'IV7', 'I7', 'V7'] },
  { id: 'blues_3', name: 'Drive', genre: 'blues', degrees: ['I7', 'IV7', 'V7', 'IV7'] },
  { id: 'blues_4', name: 'Turnaround', genre: 'blues', degrees: ['I7', 'I7', 'IV7', 'V7'] },
  { id: 'blues_5', name: 'Simple loop', genre: 'blues', degrees: ['I7', 'IV7', 'I7', 'I7'] },
];

export function listGenreDegrees(genre: StyleName): RomanDegree[] {
  const degrees = new Set<RomanDegree>();
  PROGRESSION_TEMPLATES.forEach((template) => {
    if (template.genre === genre) {
      template.degrees.forEach((degree) => degrees.add(degree));
    }
  });
  return Array.from(degrees);
}

export function buildChordSymbolForDegree({
  key,
  mode,
  degree,
  genre,
  humanise = false,
}: {
  key: string;
  mode: string;
  degree: RomanDegree;
  genre: StyleName;
  humanise?: boolean;
}): string {
  return mapRomanToChord({ key, mode, degree, genre, humanise }).symbol;
}

export function generateProgression(params: GenerateProgressionParams): HarmonyCell[] {
  const { key, mode, bars, style, resolution, lockedMap = {} } = params;
  const cellsPerBar = resolution === '1/2' ? CELLS_PER_BAR : 1;
  const plan = buildChordPlan({
    key,
    mode,
    genre: style,
    bars,
    restProbability: DEFAULT_REST_PROBABILITY[style] ?? 0,
    humanise: false,
  });

  logPlan(plan);

  const totalCells = bars * cellsPerBar;
  const result: HarmonyCell[] = [];

  for (let index = 0; index < totalCells; index += 1) {
    const locked = lockedMap[index];
    if (locked) {
      result.push({ ...locked, index, locked: true });
      continue;
    }
    const slot = plan.slots[index];
    if (!slot || slot.type === 'rest') {
      result.push({
        index,
        roman: '—',
        symbol: 'Rest',
        func: 'T',
      });
      continue;
    }
    const romanCore = stripRomanDegree(slot.degree);
    const func = detectFunction(romanCore, mode);
    result.push({
      index,
      roman: slot.degree,
      symbol: slot.chord.symbol,
      func,
    });
  }

  return result;
}

export function reharmonizeCell(cell: HarmonyCell, context: HarmonyContext): HarmonyCell {
  const { style, key, mode } = context;
  const barIndex = Math.floor(cell.index / CELLS_PER_BAR);
  const plan = buildChordPlan({
    key,
    mode,
    genre: style,
    bars: Math.max(barIndex + 1, 4),
    restProbability: 0,
    humanise: false,
  });
  const degree = plan.barDegrees[barIndex] ?? plan.barDegrees[0];
  const scaleNotes = getScaleNotes(key, mode);
  const chord = mapRomanToChord({
    key,
    mode,
    degree,
    genre: style,
    humanise: false,
    scaleNotes,
  });
  return {
    index: cell.index,
    roman: degree,
    symbol: chord.symbol,
    func: detectFunction(stripRomanDegree(degree), mode),
    locked: cell.locked,
  };
}

export function humanizeChordCells(cells: HarmonyCell[], genre: StyleName): HarmonyCell[] {
  return cells.map((cell) => {
    if (cell.symbol === 'Rest') {
      return cell;
    }
    if (!isRomanDegree(cell.roman)) {
      return cell;
    }
    const root = extractRootFromSymbol(cell.symbol);
    if (!root) {
      return cell;
    }
    const family = classifyChordFamily(cell.roman);
    const suffix = pickHumanisedSuffix(family, genre, defaultSuffixForFamily(family));
    return { ...cell, symbol: `${root}${suffix}` };
  });
}

type BuildPlanOptions = {
  key: string;
  mode: string;
  genre: StyleName;
  bars: number;
  restProbability: number;
  humanise: boolean;
};

function buildChordPlan(options: BuildPlanOptions): GeneratedPlan {
  const { key, mode, genre, bars, restProbability, humanise } = options;
  const candidates = PROGRESSION_TEMPLATES.filter((template) => template.genre === genre);
  const template = pickRandom(candidates.length ? candidates : PROGRESSION_TEMPLATES);
  const barDegrees = expandDegrees(template.degrees, bars);
  const scaleNotes = getScaleNotes(key, mode);
  const slots: ChordSlot[] = [];

  barDegrees.forEach((degree, barIndex) => {
    const chord = mapRomanToChord({
      key,
      mode,
      degree,
      genre,
      humanise,
      scaleNotes,
    });
    const chordSlot: ChordSlot = {
      type: 'chord',
      barIndex,
      degree,
      chord,
    };
    const restSlot: ChordSlot =
      restProbability > 0 && Math.random() < restProbability
        ? { type: 'rest', barIndex }
        : {
            type: 'chord',
            barIndex,
            degree,
            chord,
          };
    slots.push(chordSlot, restSlot);
  });

  return { template, barDegrees, slots };
}

function mapRomanToChord({
  key,
  mode,
  degree,
  genre,
  humanise,
  scaleNotes,
}: {
  key: string;
  mode: string;
  degree: RomanDegree;
  genre: StyleName;
  humanise: boolean;
  scaleNotes?: string[];
}): ChordSpec {
  const notes = scaleNotes ?? getScaleNotes(key, mode);
  const romanCore = stripRomanDegree(degree);
  const root = romanToPitch(romanCore, notes);
  const family = classifyChordFamily(degree);
  const baseSuffix = defaultSuffixForFamily(family);
  const suffix = humanise ? pickHumanisedSuffix(family, genre, baseSuffix) : baseSuffix;
  return {
    root,
    suffix,
    family,
    symbol: `${root}${suffix}`,
  };
}

function expandDegrees(degrees: RomanDegree[], bars: number): RomanDegree[] {
  const result: RomanDegree[] = [];
  while (result.length < bars) {
    result.push(...degrees);
  }
  return result.slice(0, bars);
}

function pickHumanisedSuffix(family: ChordFamily, genre: StyleName, fallback: string): string {
  const table = HUMANISE_SUFFIXES[genre]?.[family] ?? [];
  if (!table.length) {
    return fallback;
  }
  return pickRandom(table);
}

const HUMANISE_SUFFIXES: Record<StyleName, Record<ChordFamily, string[]>> = {
  pop: {
    major: ['maj7', '6/9', 'maj9'],
    minor: ['m7', 'm9', 'm11'],
    dominant: ['7', '9', 'sus2', 'sus4'],
    diminished: ['m7b5'],
  },
  lofi: {
    major: ['maj7', 'maj9', '6/9', 'maj9#11'],
    minor: ['m7', 'm9', 'm11'],
    dominant: ['9sus4', '7', '13'],
    diminished: ['m7b5'],
  },
  'neo-soul': {
    major: ['maj9', 'maj9#11', '6/9'],
    minor: ['m9', 'm11', 'm13'],
    dominant: ['13', '9', '7b9', '7#9'],
    diminished: ['m7b5'],
  },
  blues: {
    major: ['6/9', 'maj7'],
    minor: ['m7', 'm9'],
    dominant: ['7', '9', '13'],
    diminished: ['m7b5'],
  },
};

function classifyChordFamily(degree: RomanDegree): ChordFamily {
  if (degree.endsWith('7')) {
    return 'dominant';
  }
  if (degree.includes('°')) {
    return 'diminished';
  }
  const core = stripRomanDegree(degree);
  return core === core.toLowerCase() ? 'minor' : 'major';
}

function defaultSuffixForFamily(family: ChordFamily): string {
  switch (family) {
    case 'major':
      return 'maj7';
    case 'minor':
      return 'm7';
    case 'dominant':
      return '7';
    case 'diminished':
    default:
      return 'm7b5';
  }
}

function stripRomanDegree(degree: RomanDegree): string {
  return degree.replace(/7$/, '').replace(/°$/, '');
}

function isRomanDegree(value: string): value is RomanDegree {
  return PROGRESSION_TEMPLATES.some((template) => template.degrees.includes(value as RomanDegree));
}

function extractRootFromSymbol(symbol: string): string | null {
  const match = symbol.match(/^([A-G][b#]?)/i);
  return match ? match[1] : null;
}

function logPlan(plan: GeneratedPlan): void {
  if (!IS_DEV) {
    return;
  }
  const slotSummary = plan.slots.map((slot, index) => {
    if (slot.type === 'rest') {
      return { slot: index, bar: slot.barIndex + 1, value: 'Rest' };
    }
    return { slot: index, bar: slot.barIndex + 1, value: `${slot.degree} (${slot.chord.symbol})` };
  });
  // eslint-disable-next-line no-console
  console.groupCollapsed?.(`[ChordGen] ${plan.template.genre} – ${plan.template.name}`);
  // eslint-disable-next-line no-console
  console.info?.('Degrees:', plan.barDegrees.join(' · '));
  // eslint-disable-next-line no-console
  console.table?.(slotSummary);
  // eslint-disable-next-line no-console
  console.groupEnd?.();
}

function getScaleNotes(key: string, mode: string): string[] {
  const normalizedKey = Note.pitchClass(key) ?? key;
  const scaleDef = findScale(mode) ?? findScale(mode.replace(/\s+/g, ''));
  if (scaleDef) {
    return buildNotesFromIntervals(normalizedKey, scaleDef.intervals);
  }
  const descriptor = `${normalizedKey} ${mode}`;
  const result = Scale.get(descriptor);
  if (result.empty || !result.notes.length) {
    const fallback = Scale.get(`${normalizedKey} major`);
    return fallback.notes.map((note) => Note.pitchClass(note) ?? note);
  }
  return result.notes.map((note) => Note.pitchClass(note) ?? note);
}

function buildNotesFromIntervals(root: string, intervals: number[]): string[] {
  const normalizedRoot = Note.pitchClass(root) ?? root;
  const baseMidi = Note.midi(`${normalizedRoot}3`) ?? Note.midi(`${normalizedRoot}4`) ?? 60;
  return intervals.map((interval) => {
    const note = Note.fromMidi(baseMidi + interval) ?? normalizedRoot;
    return Note.pitchClass(note) ?? note;
  });
}

function romanToPitch(roman: string, scaleNotes: string[]): string {
  const degree = ROMAN_TO_DEGREE[roman.toUpperCase()] ?? 0;
  const base = scaleNotes[degree] ?? scaleNotes[0];
  const midi = Note.midi(`${base}3`) ?? Note.midi(`${base}4`) ?? 60;
  const note = Note.fromMidi(midi) ?? base;
  return Note.pitchClass(note) ?? base;
}

const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
  VI: 5,
  VII: 6,
};

function detectFunction(roman: string, mode: string): HarmonicFunction {
  const degree = ROMAN_TO_DEGREE[roman.toUpperCase()];
  if (degree === undefined) {
    return 'T';
  }
  const isMinorMode = ['aeolian', 'natural minor', 'dorian', 'melodic minor', 'harmonic minor'].includes(mode.toLowerCase());
  const table: HarmonicFunction[] = isMinorMode
    ? ['T', 'SD', 'T', 'SD', 'D', 'T', 'D']
    : ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'];
  return table[degree] ?? 'T';
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
