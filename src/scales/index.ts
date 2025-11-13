import { Note } from '@tonaljs/tonal';

export type PositionSystem = '5BOX' | '7NPS' | 'AUTO';

export type ScaleFlavor = 'major' | 'minor' | 'blues' | 'other';

export type ScaleDef = {
  id: string;
  name: string;
  alias?: string[];
  intervals: number[];
  positions: PositionSystem;
  flavor: ScaleFlavor;
  relativeScaleId?: string;
};

export const SCALES: ScaleDef[] = [
  {
    id: 'minorPentatonic',
    name: 'Minor Pentatonic',
    alias: ['Am Pentatonic'],
    intervals: [0, 3, 5, 7, 10],
    positions: '5BOX',
    flavor: 'minor',
    relativeScaleId: 'majorPentatonic',
  },
  {
    id: 'majorPentatonic',
    name: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    positions: '5BOX',
    flavor: 'major',
    relativeScaleId: 'minorPentatonic',
  },
  {
    id: 'bluesHexatonic',
    name: 'Blues Hexatonic',
    alias: ['Minor Blues'],
    intervals: [0, 3, 5, 6, 7, 10],
    positions: '5BOX',
    flavor: 'blues',
  },
  {
    id: 'ionian',
    name: 'Ionian (Major)',
    alias: ['Major'],
    intervals: [0, 2, 4, 5, 7, 9, 11],
    positions: '7NPS',
    flavor: 'major',
    relativeScaleId: 'aeolian',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    positions: '7NPS',
    flavor: 'minor',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    positions: '7NPS',
    flavor: 'minor',
  },
  {
    id: 'lydian',
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    positions: '7NPS',
    flavor: 'major',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    positions: '7NPS',
    flavor: 'major',
  },
  {
    id: 'aeolian',
    name: 'Aeolian (Natural Minor)',
    alias: ['Natural Minor'],
    intervals: [0, 2, 3, 5, 7, 8, 10],
    positions: '7NPS',
    flavor: 'minor',
    relativeScaleId: 'ionian',
  },
  {
    id: 'locrian',
    name: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    positions: '7NPS',
    flavor: 'minor',
  },
  {
    id: 'harmonicMinor',
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    positions: '7NPS',
    flavor: 'minor',
  },
  {
    id: 'melodicMinor',
    name: 'Melodic Minor (Asc.)',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    positions: '7NPS',
    flavor: 'minor',
  },
  {
    id: 'wholeTone',
    name: 'Whole Tone',
    intervals: [0, 2, 4, 6, 8, 10],
    positions: 'AUTO',
    flavor: 'other',
  },
  {
    id: 'diminishedHW',
    name: 'Diminished (Half–Whole)',
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    positions: 'AUTO',
    flavor: 'other',
  },
  {
    id: 'diminishedWH',
    name: 'Diminished (Whole–Half)',
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    positions: 'AUTO',
    flavor: 'other',
  },
  {
    id: 'chromatic',
    name: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    positions: 'AUTO',
    flavor: 'other',
  },
  {
    id: 'bebopDominant',
    name: 'Bebop Dominant',
    intervals: [0, 2, 4, 5, 7, 9, 10, 11],
    positions: 'AUTO',
    flavor: 'other',
  },
  {
    id: 'bebopMajor',
    name: 'Bebop Major',
    intervals: [0, 2, 4, 5, 7, 8, 9, 11],
    positions: 'AUTO',
    flavor: 'other',
  },
];

const SCALE_LOOKUP = new Map<string, ScaleDef>();

function registerScaleKey(key: string, scale: ScaleDef) {
  if (!key) {
    return;
  }
  const lower = key.toLowerCase();
  SCALE_LOOKUP.set(lower, scale);
  const compact = lower.replace(/[^a-z0-9]/g, '');
  if (compact && compact !== lower) {
    SCALE_LOOKUP.set(compact, scale);
  }
  const stripped = lower.replace(/\([^)]*\)/g, '').trim();
  if (stripped && stripped !== lower) {
    SCALE_LOOKUP.set(stripped, scale);
  }
}

SCALES.forEach((scale) => {
  registerScaleKey(scale.id, scale);
  registerScaleKey(scale.name, scale);
  scale.alias?.forEach((alias) => registerScaleKey(alias, scale));
});

export const DEFAULT_SCALE_ID = 'minorPentatonic';
export const DEFAULT_KEY = 'A';

export const KEY_OPTIONS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

export function findScale(key: string): ScaleDef | null {
  if (!key) {
    return null;
  }
  return SCALE_LOOKUP.get(key.toLowerCase()) ?? null;
}

export function getScaleByName(name: string): ScaleDef {
  return findScale(name) ?? SCALE_LOOKUP.get(DEFAULT_SCALE_ID)!;
}

export function getScaleById(id: string): ScaleDef {
  return findScale(id) ?? SCALE_LOOKUP.get(DEFAULT_SCALE_ID)!;
}

export function normalizeKey(input: string): string {
  const note = Note.pitchClass(input);
  return note ?? DEFAULT_KEY;
}

export function resolvePositionSystem(scale: ScaleDef): Exclude<PositionSystem, 'AUTO'> {
  if (scale.positions !== 'AUTO') {
    return scale.positions;
  }
  return scale.intervals.length <= 5 ? '5BOX' : '7NPS';
}

export function getRelativeScale(scale: ScaleDef): ScaleDef | null {
  if (!scale.relativeScaleId) {
    return null;
  }
  return getScaleById(scale.relativeScaleId);
}
