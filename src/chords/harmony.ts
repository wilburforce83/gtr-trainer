import { Note, Scale } from '@tonaljs/tonal';
import { getStylePack } from './styles';
import type {
  GenerateProgressionParams,
  HarmonicFunction,
  HarmonyCell,
  HarmonyContext,
  StylePack,
} from './types';

const MODE_ALIASES: Record<string, string> = {
  ionian: 'major',
  major: 'major',
  aeolian: 'natural minor',
  'natural minor': 'natural minor',
  dorian: 'dorian',
  'melodic minor': 'melodic minor',
  'harmonic minor': 'harmonic minor',
  mixolydian: 'mixolydian',
};

const ROMAN_TO_DEGREE: Record<string, number> = {
  I: 0,
  II: 1,
  III: 2,
  IV: 3,
  V: 4,
  VI: 5,
  VII: 6,
};

const FUNCTION_FLOW: Record<HarmonicFunction, HarmonicFunction> = {
  T: 'SD',
  SD: 'D',
  D: 'T',
};

export function generateProgression(params: GenerateProgressionParams): HarmonyCell[] {
  const { key, mode, bars, style, resolution, lockedMap = {} } = params;
  const pack = getStylePack(style);
  const cellsPerBar = resolution === '1/2' ? 2 : 1;
  const totalCells = bars * cellsPerBar;
  const scaleNotes = getScaleNotes(key, mode);
  const cadence = getCadence(mode);
  const sequence: string[] = new Array(totalCells);
  let prevState: string | null = null;

  for (let i = 0; i < totalCells; i += 1) {
    const locked = lockedMap[i];
    if (locked) {
      const lockedState = `${locked.roman}${extractSuffixFromSymbol(locked.symbol)}`;
      sequence[i] = lockedState;
      prevState = lockedState;
      continue;
    }
    if (style === 'blues' && pack.templates?.length) {
      break;
    }
    const nextState = chooseNextState({
      index: i,
      prevState,
      pack,
      mode,
      cadence,
      sequence,
    });
    sequence[i] = nextState;
    prevState = nextState;
  }

  if (style === 'blues' && pack.templates?.length) {
    const bluesSequence = buildBluesSequence(bars, cellsPerBar, pack);
    bluesSequence.forEach((state, idx) => {
      if (idx < totalCells && !sequence[idx]) {
        sequence[idx] = state;
      }
    });
  }

  enforceCadence(sequence, cadence, lockedMap);

  return sequence.map((state, index) => {
    const resolvedState = state ?? 'Imaj7';
    const locked = lockedMap[index];
    if (locked) {
      return { ...locked, index, locked: true };
    }
    return realizeState(resolvedState, index, { key, mode, pack, scaleNotes });
  });
}

export function reharmonizeCell(cell: HarmonyCell, context: HarmonyContext): HarmonyCell {
  const pack = getStylePack(context.style);
  const scaleNotes = getScaleNotes(context.key, context.mode);
  const transitionKey = resolveTransitionKey(cell.roman, pack);
  const transitions = pack.transitions[transitionKey] ?? pack.start;
  const candidates = Object.keys(transitions);
  const state = candidates.length ? weightedPick(transitions) : cell.roman;
  const realized = realizeState(state, cell.index, { key: context.key, mode: context.mode, pack, scaleNotes });
  return { ...realized, locked: cell.locked };
}

function resolveTransitionKey(roman: string, pack: StylePack): string {
  if (pack.transitions[roman]) {
    return roman;
  }
  const entry = Object.keys(pack.transitions).find((state) => splitState(state).roman === roman);
  return entry ?? roman;
}

function realizeState(
  state: string,
  index: number,
  opts: { key: string; mode: string; pack: StylePack; scaleNotes: string[] },
): HarmonyCell {
  const { roman, suffix } = splitState(state);
  const func = detectFunction(roman, opts.mode);
  const extension = suffix || chooseExtension(func, opts.pack, index);
  const root = romanToPitch(roman, opts.scaleNotes);
  const symbol = buildSymbol(root, roman, extension, func);
  return {
    index,
    roman,
    symbol,
    func,
  };
}

function chooseNextState({
  index,
  prevState,
  pack,
  mode,
  cadence,
  sequence,
}: {
  index: number;
  prevState: string | null;
  pack: StylePack;
  mode: string;
  cadence: [string, string, string];
  sequence: Array<string | undefined>;
}): string {
  const transitions = (prevState && pack.transitions[prevState]) || null;
  const candidateEntries = transitions ? Object.entries(transitions) : Object.entries(pack.start);
  if (!candidateEntries.length) {
    return 'Imaj7';
  }
  const weighted: Record<string, number> = {};
  candidateEntries.forEach(([state, weight]) => {
    const probability = Math.max(weight || 0.001, 0.001);
    let score = Math.log(probability);
    score -= borrowPenalty(state, pack);
    score -= repetitionPenalty(state, sequence, index);
    score -= functionPenalty(prevState, state, mode);
    score += cadenceReward(state, sequence, index, cadence);
    score += Math.random() * 0.25;
    const adjusted = Math.exp(score);
    weighted[state] = Number.isFinite(adjusted) ? Math.max(adjusted, 0.0001) : 0.0001;
  });
  return weightedPick(weighted);
}

function buildBluesSequence(bars: number, cellsPerBar: number, pack: StylePack): string[] {
  const template = pack.templates?.[Math.floor(Math.random() * pack.templates.length)] ?? [];
  const barStates: string[] = [];
  while (barStates.length < bars) {
    barStates.push(...template);
  }
  const trimmedBars = barStates.slice(0, bars);
  const cells: string[] = [];
  trimmedBars.forEach((state) => {
    for (let i = 0; i < cellsPerBar; i += 1) {
      cells.push(state);
    }
  });
  return cells;
}

function enforceCadence(sequence: string[], cadence: [string, string, string], lockedMap: Record<number, HarmonyCell>) {
  if (hasCadence(sequence, cadence)) {
    return;
  }
  for (let index = sequence.length - 3; index >= 0; index -= 1) {
    if (canPlaceCadence(index, cadence, lockedMap)) {
      sequence[index] = cadence[0];
      sequence[index + 1] = cadence[1];
      sequence[index + 2] = cadence[2];
      return;
    }
  }
}

function hasCadence(sequence: string[], cadence: [string, string, string]): boolean {
  for (let i = 0; i < sequence.length - 2; i += 1) {
    if (sequence[i] === cadence[0] && sequence[i + 1] === cadence[1] && sequence[i + 2] === cadence[2]) {
      return true;
    }
  }
  return false;
}

function canPlaceCadence(index: number, cadence: [string, string, string], locked: Record<number, HarmonyCell>): boolean {
  for (let step = 0; step < cadence.length; step += 1) {
    const candidateIndex = index + step;
    if (locked[candidateIndex]?.locked) {
      return false;
    }
  }
  return true;
}

function getCadence(mode: string): [string, string, string] {
  if (isMinorMode(mode)) {
    return ['ivm7', 'V7', 'im9'];
  }
  return ['ii7', 'V7', 'Imaj7'];
}

function borrowPenalty(state: string, pack: StylePack): number {
  const roman = splitState(state).roman;
  if (!/[b#]/.test(roman)) {
    return 0;
  }
  if (pack.allowedBorrowed?.some((degree) => roman.toUpperCase().startsWith(degree.toUpperCase()))) {
    return 0;
  }
  return 0.8;
}

function repetitionPenalty(state: string, sequence: Array<string | undefined>, index: number): number {
  const prev = sequence[index - 1];
  const prev2 = sequence[index - 2];
  let penalty = 0;
  if (prev === state) {
    penalty += 0.4;
  }
  if (prev === state && prev2 === state) {
    penalty += 0.6;
  }
  return penalty;
}

function functionPenalty(prev: string | null, next: string, mode: string): number {
  if (!prev) {
    return 0;
  }
  const prevFunc = detectFunction(splitState(prev).roman, mode);
  const nextFunc = detectFunction(splitState(next).roman, mode);
  if (prevFunc === nextFunc) {
    return 0.15;
  }
  return FUNCTION_FLOW[prevFunc] === nextFunc ? -0.1 : 0.15;
}

function cadenceReward(state: string, sequence: Array<string | undefined>, index: number, cadence: [string, string, string]): number {
  const prev = sequence[index - 1];
  if (!prev) {
    return 0;
  }
  if (prev === cadence[0] && state === cadence[1]) {
    return 0.3;
  }
  if (prev === cadence[1] && state === cadence[2]) {
    return 0.5;
  }
  return 0;
}

function romanToPitch(roman: string, scaleNotes: string[]): string {
  const { accidental, letters } = splitRomanParts(roman);
  const degree = ROMAN_TO_DEGREE[letters.toUpperCase()] ?? 0;
  const base = scaleNotes[degree] ?? scaleNotes[0];
  const octaveCandidates = [3, 4];
  let baseMidi: number | null = null;
  for (const octave of octaveCandidates) {
    const midi = Note.midi(`${base}${octave}`);
    if (typeof midi === 'number') {
      baseMidi = midi;
      break;
    }
  }
  if (baseMidi === null) {
    baseMidi = Note.midi(`${base}3`) ?? 48;
  }
  const delta = (accidental.match(/#/g)?.length ?? 0) - (accidental.match(/b/g)?.length ?? 0);
  const note = Note.fromMidi(baseMidi + delta) ?? base;
  return Note.pitchClass(note) ?? base;
}

function detectFunction(roman: string, mode: string): HarmonicFunction {
  const { letters } = splitRomanParts(roman);
  const degree = ROMAN_TO_DEGREE[letters.toUpperCase()];
  if (degree === undefined) {
    return 'T';
  }
  const isMajorish = !isMinorMode(mode);
  const table: HarmonicFunction[] = isMajorish
    ? ['T', 'SD', 'T', 'SD', 'D', 'T', 'D']
    : ['T', 'SD', 'T', 'SD', 'D', 'T', 'D'];
  let func: HarmonicFunction = table[degree] ?? 'T';
  if (/^V$/i.test(letters)) {
    func = 'D';
  }
  if (/^[#b]/.test(roman) && degree === 6) {
    func = isMajorish ? 'SD' : 'D';
  }
  return func;
}

function chooseExtension(func: HarmonicFunction, pack: StylePack, index: number): string {
  const choices = pack.defaultExtensions[func] ?? [];
  if (!choices.length) {
    if (func === 'D') {
      return '7';
    }
    return func === 'SD' ? 'm7' : 'maj7';
  }
  return choices[index % choices.length];
}

function buildSymbol(root: string, roman: string, extension: string, func: HarmonicFunction): string {
  let suffix = extension;
  const isMinorRoman = roman === roman.toLowerCase();
  if (!suffix) {
    suffix = func === 'D' ? '7' : isMinorRoman ? 'm7' : 'maj7';
  }
  if (isMinorRoman && !suffix.startsWith('m') && !suffix.startsWith('sus') && !suffix.startsWith('dim')) {
    if (suffix.startsWith('maj')) {
      suffix = suffix.replace(/^maj/, 'm');
    } else {
      suffix = `m${suffix}`;
    }
  }
  return `${root}${suffix}`;
}

function getScaleNotes(key: string, mode: string): string[] {
  const alias = MODE_ALIASES[mode.toLowerCase()] ?? 'major';
  const descriptor = `${key} ${alias}`;
  const result = Scale.get(descriptor);
  if (result.empty || !result.notes.length) {
    return Scale.get(`${key} major`).notes;
  }
  return result.notes.map((note) => Note.pitchClass(note) ?? note);
}

function splitState(state: string): { roman: string; suffix: string } {
  const match = state.match(/^([b#]*[ivIV]+)(.*)$/);
  if (!match) {
    return { roman: state, suffix: '' };
  }
  return { roman: match[1], suffix: match[2] };
}

function splitRomanParts(roman: string): { accidental: string; letters: string } {
  const match = roman.match(/^([b#]*)([ivIV]+)/);
  if (!match) {
    return { accidental: '', letters: roman };
  }
  return { accidental: match[1], letters: match[2] };
}

function extractSuffixFromSymbol(symbol: string): string {
  const match = symbol.match(/^[A-G][b#]?/i);
  if (!match) {
    return '';
  }
  return symbol.slice(match[0].length);
}

function isMinorMode(mode: string): boolean {
  return ['aeolian', 'natural minor', 'dorian', 'melodic minor', 'harmonic minor'].includes(mode.toLowerCase());
}

function weightedPick(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const target = Math.random() * total;
  let cumulative = 0;
  for (const [state, weight] of entries) {
    cumulative += weight;
    if (target <= cumulative) {
      return state;
    }
  }
  return entries[0]?.[0] ?? 'Imaj7';
}
