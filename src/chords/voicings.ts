import { KIND_INTERVALS, type ChordKind, formatVoicingId, resolveChordKind } from './chordKinds';
import { MUTED_OFFSET, getFormsForKind, type ShapeForm } from './shapeLibrary';
import {
  findFretsForNote,
  getStringPitchClass,
  normalizeNoteName,
  toPitchClass,
  type NoteName,
} from './noteUtils';

export type Voicing = {
  chordKind: string;
  root: string;
  strings: { str: number; fret: number }[];
  name?: string;
  id?: string;
};

type IntervalCheck = {
  requiredThird?: 3 | 4;
  requiredSuspended?: 2 | 5;
  requireSeventh?: boolean;
  requireNinth?: boolean;
};

const KIND_GUARDS: Record<ChordKind, IntervalCheck> = {
  '': { requiredThird: 4 },
  m: { requiredThird: 3 },
  6: { requiredThird: 4 },
  m6: { requiredThird: 3 },
  7: { requiredThird: 4, requireSeventh: true },
  m7: { requiredThird: 3, requireSeventh: true },
  maj7: { requiredThird: 4, requireSeventh: true },
  9: { requiredThird: 4, requireSeventh: true, requireNinth: true },
  m9: { requiredThird: 3, requireSeventh: true, requireNinth: true },
  maj9: { requiredThird: 4, requireSeventh: true, requireNinth: true },
  dim: { requiredThird: 3 },
  aug: { requiredThird: 4 },
  sus: { requiredSuspended: 5 },
  sus2: { requiredSuspended: 2 },
};

const MAX_SPAN = 5;
const MAX_FRET = 17;

export function getCanonicalVoicings(root: NoteName, kind: ChordKind): Voicing[] {
  const normalizedRoot = normalizeNoteName(root);
  const forms = getFormsForKind(kind);
  const candidates = forms.flatMap((form) => buildVoicingsFromForm(form, normalizedRoot));
  const deduped = dedupeVoicings(candidates);
  deduped.sort((a, b) => scoreVoicing(a) - scoreVoicing(b));
  return deduped.slice(0, 4);
}

export function getVoicingsForSymbol(symbol: string): Voicing[] {
  const match = symbol.trim().match(/^([A-G][b#]?)(.*)$/i);
  if (!match) {
    return [];
  }
  const [, rawRoot, rawKind] = match;
  const root = normalizeNoteName(rawRoot);
  const kind = resolveChordKind(rawKind || '');
  return getCanonicalVoicings(root, kind);
}

export function chooseVoicing(prev: Voicing | undefined, options: Voicing[]): Voicing {
  if (!options.length) {
    throw new Error('No voicing options supplied.');
  }
  if (!prev) {
    return options[0];
  }
  let best = options[0];
  let bestScore = Number.POSITIVE_INFINITY;
  options.forEach((candidate) => {
    const score = measureMovement(prev, candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return best;
}

function measureMovement(a: Voicing, b: Voicing): number {
  const map = new Map<number, number>();
  a.strings.forEach((entry) => {
    if (entry.fret >= 0) {
      map.set(entry.str, entry.fret);
    }
  });
  let total = 0;
  b.strings.forEach((entry) => {
    if (entry.fret < 0) {
      total += 0.5;
      return;
    }
    const prev = map.get(entry.str);
    if (typeof prev === 'number') {
      total += Math.abs(prev - entry.fret);
    } else {
      total += entry.fret;
    }
  });
  return total;
}

function buildVoicingsFromForm(form: ShapeForm, root: NoteName): Voicing[] {
  const normalizedRoot = normalizeNoteName(root);
  if (!form.movable && normalizedRoot !== form.referenceRoot) {
    return [];
  }
  const rootFrets = form.movable
    ? findFretsForNote(normalizedRoot, form.rootString, form.maxRootFret ?? MAX_FRET, form.minRootFret ?? 0)
    : [form.referenceRootFret];
  const allowedIntervals = KIND_INTERVALS[form.chordKind];
  const intervalRules = KIND_GUARDS[form.chordKind];
  const rootPc = toPitchClass(normalizedRoot);
  const voicings: Voicing[] = [];
  rootFrets.forEach((rootFret) => {
    if (form.maxRootFret !== undefined && rootFret > form.maxRootFret) {
      return;
    }
    if (form.minRootFret !== undefined && rootFret < form.minRootFret) {
      return;
    }
    const strings = buildStringLayout(form, rootFret);
    if (!strings) {
      return;
    }
    if (!passesPlayability(strings)) {
      return;
    }
    if (!validateIntervals(strings, rootPc, allowedIntervals, intervalRules)) {
      return;
    }
    voicings.push({
      chordKind: form.chordKind,
      root: normalizedRoot,
      strings,
      name: form.label,
      id: formatVoicingId(normalizedRoot, form.chordKind, form.id),
    });
  });
  return voicings;
}

function buildStringLayout(form: ShapeForm, rootFret: number): { str: number; fret: number }[] | null {
  const offsetMap = new Map<number, number>();
  form.pattern.forEach((pattern) => {
    offsetMap.set(pattern.str, pattern.fretOffset);
  });
  const muted = new Set<number>(form.muted ?? []);
  const open = new Set<number>(form.openStrings ?? []);
  const strings: { str: number; fret: number }[] = [];
  for (let str = 6; str >= 1; str -= 1) {
    const offset = offsetMap.get(str);
    if (offset !== undefined) {
      if (offset <= MUTED_OFFSET) {
        strings.push({ str, fret: -1 });
        continue;
      }
      const fret = rootFret + offset;
      if (fret < 0 || fret > MAX_FRET + 3) {
        return null;
      }
      strings.push({ str, fret });
      continue;
    }
    if (muted.has(str)) {
      strings.push({ str, fret: -1 });
      continue;
    }
    if (open.has(str)) {
      strings.push({ str, fret: 0 });
      continue;
    }
    strings.push({ str, fret: -1 });
  }
  const hasSounding = strings.some((entry) => entry.fret >= 0);
  return hasSounding ? strings : null;
}

function passesPlayability(strings: { str: number; fret: number }[]): boolean {
  const fretted = strings.filter((entry) => entry.fret > 0);
  if (!fretted.length) {
    return true;
  }
  const frets = fretted.map((entry) => entry.fret);
  const min = Math.min(...frets);
  const max = Math.max(...frets);
  if (max - min > MAX_SPAN) {
    return false;
  }
  if (max > MAX_FRET) {
    return false;
  }
  return true;
}

function validateIntervals(
  strings: { str: number; fret: number }[],
  rootPc: number,
  allowed: number[],
  rules: IntervalCheck,
): boolean {
  const pcs = strings.filter((entry) => entry.fret >= 0).map((entry) => getStringPitchClass(entry.str, entry.fret));
  if (!pcs.includes(rootPc)) {
    return false;
  }
  const intervals = pcs.map((pc) => ((pc - rootPc + 12) % 12));
  if (intervals.some((interval) => !allowed.includes(interval))) {
    return false;
  }
  if (rules.requiredThird && !intervals.includes(rules.requiredThird)) {
    return false;
  }
  if (rules.requiredSuspended && !intervals.includes(rules.requiredSuspended)) {
    return false;
  }
  if (rules.requireSeventh) {
    const target = allowed.includes(10) && !allowed.includes(11) ? 10 : allowed.includes(11) ? 11 : 10;
    if (!intervals.includes(target)) {
      return false;
    }
  }
  if (rules.requireNinth && !intervals.includes(2)) {
    return false;
  }
  return true;
}

function dedupeVoicings(voicings: Voicing[]): Voicing[] {
  const map = new Map<string, Voicing>();
  voicings.forEach((voicing) => {
    const key = voicing.strings.map((entry) => `${entry.str}:${entry.fret}`).join('|');
    if (!map.has(key)) {
      map.set(key, voicing);
    }
  });
  return Array.from(map.values());
}

function scoreVoicing(voicing: Voicing): number {
  const frets = voicing.strings.filter((entry) => entry.fret >= 0).map((entry) => entry.fret);
  if (!frets.length) {
    return Number.POSITIVE_INFINITY;
  }
  const min = Math.min(...frets);
  const max = Math.max(...frets);
  const avg = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;
  const span = max - min;
  const openBonus = voicing.strings.some((entry) => entry.fret === 0) ? -0.5 : 0;
  const nameBonus = voicing.name?.toLowerCase().includes('open') ? -1 : 0;
  return avg + span * 0.5 + openBonus + nameBonus;
}
