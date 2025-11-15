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

const CANONICAL_NAMES: Record<number, NoteName> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'Eb',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'Ab',
  9: 'A',
  10: 'Bb',
  11: 'B',
};

export function normalizeNoteName(input: string): NoteName {
  const trimmed = input.trim();
  const firstTwo = trimmed.slice(0, 2);
  const firstOne = trimmed.slice(0, 1);
  if (Object.prototype.hasOwnProperty.call(NOTE_TO_PC, firstTwo as NoteName)) {
    return firstTwo as NoteName;
  }
  if (Object.prototype.hasOwnProperty.call(NOTE_TO_PC, firstOne as NoteName)) {
    return firstOne as NoteName;
  }
  return 'C';
}

export function toPitchClass(note: NoteName): number {
  return NOTE_TO_PC[note];
}

export function fromPitchClass(pc: number): NoteName {
  const normalized = ((pc % 12) + 12) % 12;
  return CANONICAL_NAMES[normalized];
}

const STANDARD_STRING_MIDI = [64, 59, 55, 50, 45, 40]; // strings 1 → 6

export function getStringOpenMidi(str: number): number {
  return STANDARD_STRING_MIDI[str - 1];
}

export function getStringPitchClass(str: number, fret: number): number {
  const midi = getStringOpenMidi(str) + fret;
  return ((midi % 12) + 12) % 12;
}

export function findFretsForNote(
  note: NoteName,
  stringNumber: number,
  maxFret = 17,
  minFret = 0,
): number[] {
  const targetPc = toPitchClass(note);
  const matches: number[] = [];
  for (let fret = minFret; fret <= maxFret; fret += 1) {
    if (getStringPitchClass(stringNumber, fret) === targetPc) {
      matches.push(fret);
    }
  }
  return matches;
}

export function intervalBetween(root: NoteName, note: NoteName): number {
  const rootPc = toPitchClass(root);
  const notePc = toPitchClass(note);
  return ((notePc - rootPc) % 12 + 12) % 12;
}

export function intervalFromPitchClass(rootPc: number, pitchClass: number): number {
  return ((pitchClass - rootPc) % 12 + 12) % 12;
}
