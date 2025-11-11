import { Note } from '@tonaljs/tonal';
import { STANDARD_TUNING, tuningToMidi } from '../lib/neck';

const tuningMidi = tuningToMidi(STANDARD_TUNING);

type Template = {
  id: string;
  chordKinds: string[];
  layout: Array<{ string: number; interval: number }>;
  muted?: number[];
  name?: string;
};

const INTERVALS = {
  ROOT: 0,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FIFTH: 7,
  SIX: 9,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  NINTH: 14,
  ELEVENTH: 17,
  THIRTEENTH: 21,
  SHARP_ELEVENTH: 18,
};

export type Voicing = {
  chordKind: string;
  root: string;
  strings: { str: number; fret: number }[];
  name?: string;
  id?: string;
};

const VOICING_TEMPLATES: Template[] = [
  {
    id: 'maj-root6-spread',
    chordKinds: ['maj7', 'maj9', '6/9', 'maj9#11'],
    name: 'Drop-2 (6th string)',
    layout: [
      { string: 6, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MAJOR_SEVENTH },
      { string: 3, interval: INTERVALS.MAJOR_THIRD },
      { string: 2, interval: INTERVALS.PERFECT_FIFTH },
      { string: 1, interval: INTERVALS.NINTH },
    ],
    muted: [5],
  },
  {
    id: 'maj-root5-spread',
    chordKinds: ['maj7', 'maj9', '6/9', 'maj9#11'],
    name: 'Drop-2 (5th string)',
    layout: [
      { string: 5, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MAJOR_SEVENTH },
      { string: 3, interval: INTERVALS.MAJOR_THIRD },
      { string: 2, interval: INTERVALS.NINTH },
      { string: 1, interval: INTERVALS.PERFECT_FIFTH },
    ],
    muted: [6],
  },
  {
    id: 'maj-root5-sus',
    chordKinds: ['6/9', 'add9'],
    name: '6/9 shell',
    layout: [
      { string: 5, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.SIX },
      { string: 3, interval: INTERVALS.NINTH },
      { string: 2, interval: INTERVALS.MAJOR_THIRD },
    ],
    muted: [6, 1],
  },
  {
    id: 'min-root6-drop2',
    chordKinds: ['m7', 'm9', 'm11'],
    name: 'Drop-2 minor',
    layout: [
      { string: 6, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MINOR_SEVENTH },
      { string: 3, interval: INTERVALS.MINOR_THIRD },
      { string: 2, interval: INTERVALS.PERFECT_FIFTH },
      { string: 1, interval: INTERVALS.NINTH },
    ],
    muted: [5],
  },
  {
    id: 'min-root5-drop2',
    chordKinds: ['m7', 'm9', 'm11'],
    name: 'Drop-2 minor (5)',
    layout: [
      { string: 5, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MINOR_SEVENTH },
      { string: 3, interval: INTERVALS.MINOR_THIRD },
      { string: 2, interval: INTERVALS.NINTH },
      { string: 1, interval: INTERVALS.ELEVENTH },
    ],
    muted: [6],
  },
  {
    id: 'dom-root6',
    chordKinds: ['7', '9', '13', '9sus4'],
    name: 'Dominant shell (6)',
    layout: [
      { string: 6, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MINOR_SEVENTH },
      { string: 3, interval: INTERVALS.MAJOR_THIRD },
      { string: 2, interval: INTERVALS.PERFECT_FIFTH },
      { string: 1, interval: INTERVALS.THIRTEENTH },
    ],
    muted: [5],
  },
  {
    id: 'dom-root5',
    chordKinds: ['7', '9', '13', '9sus4'],
    name: 'Dominant shell (5)',
    layout: [
      { string: 5, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MINOR_SEVENTH },
      { string: 3, interval: INTERVALS.MAJOR_THIRD },
      { string: 2, interval: INTERVALS.NINTH },
      { string: 1, interval: INTERVALS.PERFECT_FIFTH },
    ],
    muted: [6],
  },
  {
    id: 'sus-root5',
    chordKinds: ['9sus4', '7sus2'],
    name: 'Sus cluster',
    layout: [
      { string: 5, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.PERFECT_FIFTH },
      { string: 3, interval: INTERVALS.MAJOR_SEVENTH },
      { string: 2, interval: INTERVALS.NINTH },
    ],
    muted: [6, 1],
  },
  {
    id: 'maj-lydian',
    chordKinds: ['maj9#11'],
    name: 'Lydian upper-structure',
    layout: [
      { string: 6, interval: INTERVALS.ROOT },
      { string: 4, interval: INTERVALS.MAJOR_SEVENTH },
      { string: 3, interval: INTERVALS.SHARP_ELEVENTH },
      { string: 2, interval: INTERVALS.NINTH },
    ],
    muted: [5, 1],
  },
];

export function getVoicingsForSymbol(symbol: string): Voicing[] {
  const match = symbol.match(/^([A-G][b#]?)(.*)$/i);
  if (!match) {
    return [];
  }
  const [, root, suffix] = match;
  const chordKind = (suffix || 'maj7').toLowerCase();
  return buildVoicings(root, chordKind);
}

export function buildVoicings(root: string, chordKind: string): Voicing[] {
  const normalizedRoot = Note.pitchClass(root) ?? root;
  const templates = VOICING_TEMPLATES.filter((template) =>
    template.chordKinds.some((kind) => normalizeKind(kind) === normalizeKind(chordKind)),
  );
  const voicings = templates
    .map((template) => buildVoicingFromTemplate(normalizedRoot, chordKind, template))
    .filter((entry): entry is Voicing => Boolean(entry));
  if (voicings.length) {
    return voicings;
  }
  const fallback = fallbackVoicing(normalizedRoot, chordKind);
  return fallback ? [fallback] : [];
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
  const byString = new Map<number, number>();
  a.strings.forEach((entry) => {
    if (entry.fret >= 0) {
      byString.set(entry.str, entry.fret);
    }
  });
  let total = 0;
  b.strings.forEach((entry) => {
    if (entry.fret < 0) {
      total += 1;
      return;
    }
    const prev = byString.get(entry.str);
    if (typeof prev === 'number') {
      total += Math.abs(prev - entry.fret);
    } else {
      total += entry.fret / 2;
    }
  });
  return total;
}

function buildVoicingFromTemplate(root: string, chordKind: string, template: Template): Voicing | null {
  const layoutMap = new Map<number, number>();
  const rootEntry = template.layout.find((entry) => entry.interval === INTERVALS.ROOT) ?? template.layout[0];
  const rootMidi = matchMidiOnString(root, rootEntry.string);
  if (rootMidi === null) {
    return null;
  }
  for (const entry of template.layout) {
    const stringMidi = tuningMidi[entry.string - 1];
    if (typeof stringMidi !== 'number') {
      return null;
    }
    let target = rootMidi + entry.interval;
    while (target < stringMidi) {
      target += 12;
    }
    let fret = target - stringMidi;
    if (fret > 20) {
      return null;
    }
    layoutMap.set(entry.string, fret);
  }
  const strings: { str: number; fret: number }[] = [];
  for (let str = 6; str >= 1; str -= 1) {
    if (layoutMap.has(str)) {
      strings.push({ str, fret: layoutMap.get(str)! });
    } else if (template.muted?.includes(str)) {
      strings.push({ str, fret: -1 });
    } else {
      strings.push({ str, fret: -1 });
    }
  }
  return {
    chordKind,
    root,
    strings,
    name: template.name,
    id: `${template.id}-${root}-${chordKind}`,
  };
}

function fallbackVoicing(root: string, chordKind: string): Voicing | null {
  const template: Template = {
    id: `fallback-${chordKind}`,
    chordKinds: [chordKind],
    layout: [
      { string: 5, interval: INTERVALS.ROOT },
      { string: 4, interval: chordKind.startsWith('m') ? INTERVALS.MINOR_THIRD : INTERVALS.MAJOR_THIRD },
      { string: 3, interval: INTERVALS.MINOR_SEVENTH },
      { string: 2, interval: INTERVALS.NINTH },
    ],
    muted: [6, 1],
    name: 'Shell',
  };
  return buildVoicingFromTemplate(root, chordKind, template);
}

function matchMidiOnString(note: string, stringNumber: number): number | null {
  const chroma = Note.chroma(note);
  if (chroma === null) {
    return null;
  }
  const stringMidi = tuningMidi[stringNumber - 1];
  const stringNote = STANDARD_TUNING[stringNumber - 1];
  const stringChroma = Note.chroma(stringNote) ?? 0;
  const diff = (chroma - stringChroma + 12) % 12;
  for (let octave = 0; octave <= 2; octave += 1) {
    const fret = diff + 12 * octave;
    if (fret >= 0 && fret <= 15) {
      return stringMidi + fret;
    }
  }
  return null;
}

function normalizeKind(kind: string): string {
  return kind.replace(/\s+/g, '').toLowerCase();
}
