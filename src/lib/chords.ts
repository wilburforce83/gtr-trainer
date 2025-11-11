import { Chord, Note } from '@tonaljs/tonal';
import { normalizeKey } from '../scales';
import type { ScaleDef } from '../scales';
import type { VoicingPosition } from './audio';

export type ChordQuality = 'maj7' | 'm7' | 'dom7' | 'm7b5' | 'dim7';

export interface ChordInfo {
  degree: string;
  symbol: string;
  notes: string[];
  extensions: string[];
  quality: ChordQuality;
  root: string;
}

export interface ChordVoicing {
  id: string;
  label: string;
  chordSymbol: string;
  diagram: {
    fingers: Array<[number, number | 'x' | 0, string?]>;
    position: number;
    title: string;
    barres?: Array<{ fromString: number; toString: number; fret: number; text?: string }>;
  };
  audio: VoicingPosition[];
}

const INTERVALS = {
  ROOT: 0,
  MINOR_THIRD: 3,
  MAJOR_THIRD: 4,
  PERFECT_FIFTH: 7,
  DIM_FIFTH: 6,
  MINOR_SEVENTH: 10,
  MAJOR_SEVENTH: 11,
  NINTH: 14,
  ELEVENTH: 17,
  THIRTEENTH: 21,
};

const VOICING_LIBRARY: VoicingTemplate[] = [
  {
    id: 'maj7-6',
    quality: 'maj7',
    label: '6th-string root',
    layout: [
      { string: 6, interval: INTERVALS.ROOT, text: 'R' },
      { string: 4, interval: INTERVALS.MAJOR_SEVENTH, text: '7' },
      { string: 3, interval: INTERVALS.MAJOR_THIRD, text: '3' },
      { string: 2, interval: INTERVALS.PERFECT_FIFTH, text: '5' },
      { string: 1, interval: INTERVALS.NINTH, text: '9' },
    ],
    muted: [5],
  },
  {
    id: 'maj7-5',
    quality: 'maj7',
    label: '5th-string root',
    layout: [
      { string: 5, interval: INTERVALS.ROOT, text: 'R' },
      { string: 3, interval: INTERVALS.MAJOR_SEVENTH, text: '7' },
      { string: 2, interval: INTERVALS.MAJOR_THIRD, text: '3' },
      { string: 1, interval: INTERVALS.PERFECT_FIFTH, text: '5' },
    ],
    muted: [6, 4],
  },
  {
    id: 'm7-6',
    quality: 'm7',
    label: '6th-string root',
    layout: [
      { string: 6, interval: INTERVALS.ROOT, text: 'R' },
      { string: 4, interval: INTERVALS.MINOR_SEVENTH, text: 'b7' },
      { string: 3, interval: INTERVALS.MINOR_THIRD, text: 'b3' },
      { string: 2, interval: INTERVALS.PERFECT_FIFTH, text: '5' },
      { string: 1, interval: INTERVALS.NINTH, text: '9' },
    ],
    muted: [5],
  },
  {
    id: 'm7-5',
    quality: 'm7',
    label: '5th-string root',
    layout: [
      { string: 5, interval: INTERVALS.ROOT, text: 'R' },
      { string: 3, interval: INTERVALS.MINOR_SEVENTH, text: 'b7' },
      { string: 2, interval: INTERVALS.MINOR_THIRD, text: 'b3' },
      { string: 1, interval: INTERVALS.PERFECT_FIFTH, text: '5' },
    ],
    muted: [6, 4],
  },
  {
    id: 'dom7-6',
    quality: 'dom7',
    label: '6th-string root',
    layout: [
      { string: 6, interval: INTERVALS.ROOT, text: 'R' },
      { string: 4, interval: INTERVALS.MINOR_SEVENTH, text: 'b7' },
      { string: 3, interval: INTERVALS.MAJOR_THIRD, text: '3' },
      { string: 2, interval: INTERVALS.PERFECT_FIFTH, text: '5' },
      { string: 1, interval: INTERVALS.THIRTEENTH, text: '13' },
    ],
    muted: [5],
  },
  {
    id: 'dom7-5',
    quality: 'dom7',
    label: '5th-string root',
    layout: [
      { string: 5, interval: INTERVALS.ROOT, text: 'R' },
      { string: 3, interval: INTERVALS.MINOR_SEVENTH, text: 'b7' },
      { string: 2, interval: INTERVALS.MAJOR_THIRD, text: '3' },
      { string: 1, interval: INTERVALS.PERFECT_FIFTH, text: '5' },
      { string: 4, interval: INTERVALS.NINTH, text: '9' },
    ],
    muted: [6],
  },
  {
    id: 'm7b5-5',
    quality: 'm7b5',
    label: 'Half-diminished',
    layout: [
      { string: 5, interval: INTERVALS.ROOT, text: 'R' },
      { string: 4, interval: INTERVALS.DIM_FIFTH, text: 'b5' },
      { string: 3, interval: INTERVALS.MINOR_SEVENTH, text: 'b7' },
      { string: 2, interval: INTERVALS.MINOR_THIRD, text: 'b3' },
    ],
    muted: [6, 1],
  },
  {
    id: 'dim7-6',
    quality: 'dim7',
    label: 'Diminished',
    layout: [
      { string: 6, interval: INTERVALS.ROOT, text: 'R' },
      { string: 4, interval: INTERVALS.MINOR_THIRD, text: 'b3' },
      { string: 3, interval: INTERVALS.DIM_FIFTH, text: 'b5' },
      { string: 2, interval: INTERVALS.MINOR_SEVENTH - 1, text: 'bb7' },
    ],
    muted: [5, 1],
  },
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function getDiatonicChords(key: string, scale: ScaleDef): ChordInfo[] {
  const normalizedKey = normalizeKey(key);
  const steps = buildScaleSteps(normalizedKey, scale, scale.intervals.length * 3);
  const chords: ChordInfo[] = [];

  for (let degree = 0; degree < scale.intervals.length; degree += 1) {
    const chordSteps = [degree, degree + 2, degree + 4, degree + 6];
    const notes = chordSteps.map((step) => steps[step % steps.length]);
    const detected = Chord.detect(notes);
    const symbol = detected[0] ?? `${notes[0]}${fallbackSuffix(notes)}`;
    const quality = detectQuality(symbol);
    const extensions: string[] = [];
    if (steps[degree + 8]) {
      extensions.push('9');
    }
    if (steps[degree + 10]) {
      extensions.push('11');
    }
    if (steps[degree + 12]) {
      extensions.push('13');
    }
    chords.push({
      degree: formatRoman(degree, quality),
      symbol,
      notes,
      extensions,
      quality,
      root: notes[0],
    });
  }

  return chords;
}

export function getVoicings(chord: ChordInfo, tuningMidi: number[]): ChordVoicing[] {
  const templates = VOICING_LIBRARY.filter((template) => template.quality === chord.quality);
  const voicings: ChordVoicing[] = [];
  templates.forEach((template) => {
    const voicing = buildVoicing(template, chord, tuningMidi);
    if (voicing) {
      voicings.push(voicing);
    }
  });
  return voicings;
}

function buildScaleSteps(key: string, scale: ScaleDef, count: number): string[] {
  const candidates = [3, 2, 4];
  let baseMidi: number | null = null;
  for (const octave of candidates) {
    const midi = Note.midi(`${key}${octave}`);
    if (typeof midi === 'number') {
      baseMidi = midi;
      break;
    }
  }
  if (baseMidi === null) {
    baseMidi = 48;
  }
  return Array.from({ length: count }, (_, step) => {
    const semitones = scale.intervals[step % scale.intervals.length] + 12 * Math.floor(step / scale.intervals.length);
    const name = Note.fromMidi(baseMidi + semitones) ?? key;
    return Note.pitchClass(name) ?? name;
  });
}

function fallbackSuffix(notes: string[]): string {
  if (notes.length < 3) {
    return '';
  }
  const [root, third, fifth] = notes;
  const quality = detectQualityFromNotes(root, third, fifth);
  return quality === 'm7' ? 'm7' : quality === 'dom7' ? '7' : '';
}

function detectQuality(symbol: string): ChordQuality {
  const lower = symbol.toLowerCase();
  if (lower.includes('ø') || lower.includes('m7b5')) {
    return 'm7b5';
  }
  if (lower.includes('dim')) {
    return 'dim7';
  }
  if (lower.includes('maj') || lower.includes('Δ')) {
    return 'maj7';
  }
  if (lower.includes('m') && !lower.includes('maj')) {
    return 'm7';
  }
  if (lower.includes('7')) {
    return 'dom7';
  }
  return 'maj7';
}

function detectQualityFromNotes(root: string, third: string, fifth: string): ChordQuality {
  const rootChroma = Note.chroma(root) ?? 0;
  const thirdChroma = Note.chroma(third) ?? 0;
  const fifthChroma = Note.chroma(fifth) ?? 0;
  const thirdInterval = (thirdChroma - rootChroma + 12) % 12;
  const fifthInterval = (fifthChroma - rootChroma + 12) % 12;
  if (thirdInterval === 3 && fifthInterval === 6) {
    return 'm7b5';
  }
  if (thirdInterval === 3) {
    return 'm7';
  }
  if (thirdInterval === 4 && fifthInterval === 6) {
    return 'dim7';
  }
  return 'maj7';
}

function formatRoman(index: number, quality: ChordQuality): string {
  const numeral = ROMAN[index % ROMAN.length] ?? `${index + 1}`;
  if (quality === 'maj7' || quality === 'dom7') {
    return numeral;
  }
  if (quality === 'm7') {
    return numeral.toLowerCase();
  }
  if (quality === 'm7b5') {
    return `${numeral.toLowerCase()}ø`;
  }
  if (quality === 'dim7') {
    return `${numeral.toLowerCase()}°`;
  }
  return numeral;
}

type VoicingTemplate = {
  id: string;
  quality: ChordQuality;
  label: string;
  layout: Array<{ string: number; interval: number; text?: string }>;
  muted?: number[];
};

function buildVoicing(template: VoicingTemplate, chord: ChordInfo, tuningMidi: number[]): ChordVoicing | null {
  const rootNote = chord.root;
  const layoutEntries = template.layout.map((entry) => ({ ...entry }));
  const rootString = layoutEntries.find((entry) => entry.interval === INTERVALS.ROOT)?.string ?? layoutEntries[0].string;
  const rootMidi = matchMidiOnString(rootNote, rootString, tuningMidi);
  if (rootMidi === null) {
    return null;
  }

  const layoutMap = new Map<number, { fret: number; text?: string }>();
  for (const entry of layoutEntries) {
    const stringMidi = tuningMidi[entry.string - 1];
    if (typeof stringMidi !== 'number') {
      return null;
    }
    let targetMidi = rootMidi + entry.interval;
    let fret = targetMidi - stringMidi;
    if (fret < 0) {
      targetMidi += 12;
      fret = targetMidi - stringMidi;
    }
    if (fret > 20) {
      return null;
    }
    layoutMap.set(entry.string, { fret, text: entry.text });
  }

  const playableFrets = Array.from(layoutMap.values())
    .map((item) => item.fret)
    .filter((fret) => fret > 0);
  const minFret = playableFrets.length ? Math.min(...playableFrets) : 1;
  const maxFret = playableFrets.length ? Math.max(...playableFrets) : 4;
  if (maxFret - minFret > 7) {
    return null;
  }
  const position = Math.max(1, minFret - 1);

  const fingers: Array<[number, number | 'x' | 0, string?]> = [];
  const audioPositions: VoicingPosition[] = [];

  for (let stringNumber = 6; stringNumber >= 1; stringNumber -= 1) {
    const entry = layoutMap.get(stringNumber);
    if (entry) {
      const relative = entry.fret === 0 ? 0 : entry.fret - position + 1;
      fingers.push([stringNumber, entry.fret === 0 ? 0 : relative, entry.text]);
      audioPositions.push({ string: stringNumber, fret: entry.fret });
    } else if (template.muted?.includes(stringNumber)) {
      fingers.push([stringNumber, 'x']);
    } else {
      fingers.push([stringNumber, 'x']);
    }
  }

  audioPositions.sort((a, b) => b.string - a.string);

  return {
    id: `${chord.symbol}-${template.id}`,
    label: template.label,
    chordSymbol: chord.symbol,
    diagram: {
      fingers,
      position,
      title: chord.symbol,
      barres: [],
    },
    audio: audioPositions,
  };
}

function matchMidiOnString(note: string, stringNumber: number, tuningMidi: number[]): number | null {
  const targetChroma = Note.chroma(note);
  if (targetChroma === null) {
    return null;
  }
  const stringMidi = tuningMidi[stringNumber - 1];
  if (typeof stringMidi !== 'number') {
    return null;
  }
  for (let fret = 0; fret <= 12; fret += 1) {
    const midi = stringMidi + fret;
    if ((midi % 12) === targetChroma) {
      return midi;
    }
  }
  return stringMidi + ((targetChroma - (stringMidi % 12) + 12) % 12);
}
