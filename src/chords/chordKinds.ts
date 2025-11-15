import type { NoteName } from './noteUtils';

export type ChordKind =
  | ''
  | 'm'
  | '6'
  | 'm6'
  | '7'
  | 'm7'
  | 'maj7'
  | '9'
  | 'm9'
  | 'maj9'
  | 'dim'
  | 'aug'
  | 'sus'
  | 'sus2';

export const KIND_INTERVALS: Record<ChordKind, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  9: [0, 4, 7, 10, 2],
  m9: [0, 3, 7, 10, 2],
  maj9: [0, 4, 7, 11, 2],
  dim: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus: [0, 5, 7],
  sus2: [0, 2, 7],
};

export const CHORD_KIND_ORDER: ChordKind[] = ['' , 'm', '6', 'm6', '7', 'm7', 'maj7', '9', 'm9', 'maj9', 'dim', 'aug', 'sus', 'sus2'];

export const CHORD_KIND_LABELS: Record<ChordKind, string> = {
  '': 'Major',
  m: 'Minor',
  6: '6',
  m6: 'Minor 6',
  7: 'Dominant 7',
  m7: 'Minor 7',
  maj7: 'Major 7',
  9: '9',
  m9: 'Minor 9',
  maj9: 'Major 9',
  dim: 'Diminished',
  aug: 'Augmented',
  sus: 'Sus4',
  sus2: 'Sus2',
};

export const CHORD_KIND_SUFFIXES: Record<ChordKind, string> = {
  '': '',
  m: 'm',
  6: '6',
  m6: 'm6',
  7: '7',
  m7: 'm7',
  maj7: 'maj7',
  9: '9',
  m9: 'm9',
  maj9: 'maj9',
  dim: 'dim',
  aug: 'aug',
  sus: 'sus',
  sus2: 'sus2',
};

export const CHORD_KIND_OPTIONS = CHORD_KIND_ORDER.map((kind) => ({
  value: kind,
  label: CHORD_KIND_LABELS[kind],
  suffix: CHORD_KIND_SUFFIXES[kind],
}));
const KIND_ALIASES: Record<string, ChordKind> = {
  '': '',
  maj: '',
  m: 'm',
  min: 'm',
  minor: 'm',
  6: '6',
  add6: '6',
  m6: 'm6',
  minor6: 'm6',
  maj6: '6',
  7: '7',
  dom7: '7',
  m7: 'm7',
  min7: 'm7',
  minor7: 'm7',
  maj7: 'maj7',
  ma7: 'maj7',
  M7: 'maj7',
  'Δ7': 'maj7',
  9: '9',
  add9: '9',
  m9: 'm9',
  min9: 'm9',
  maj9: 'maj9',
  ma9: 'maj9',
  dim: 'dim',
  diminished: 'dim',
  '°': 'dim',
  aug: 'aug',
  '+': 'aug',
  sus: 'sus',
  sus4: 'sus',
  sus2: 'sus2',
};

export function resolveChordKind(raw: string): ChordKind {
  const cleaned = raw.trim();
  if (!cleaned) {
    return '';
  }
  const key = cleaned.replace(/[^A-Za-z0-9+#]/g, '').toLowerCase();
  if (!key) {
    return '';
  }
  return KIND_ALIASES[key] ?? '';
}

export function formatVoicingId(root: NoteName, kind: ChordKind, variant: string): string {
  return `${root}:${kind || 'maj'}:${variant}`;
}
