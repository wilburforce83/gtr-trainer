import type { Voicing } from './voicings';

export type StyleName = 'neo-soul' | 'pop' | 'lofi' | 'blues';

export type ModeName =
  | 'ionian'
  | 'major'
  | 'aeolian'
  | 'natural minor'
  | 'dorian'
  | 'melodic minor'
  | 'melodicMinor'
  | 'harmonic minor'
  | 'harmonicMinor'
  | 'mixolydian'
  | 'phrygian'
  | 'lydian'
  | 'locrian'
  | 'minorPentatonic'
  | 'majorPentatonic'
  | 'bluesHexatonic'
  | 'wholeTone'
  | 'diminishedHW'
  | 'diminishedWH'
  | 'chromatic'
  | 'bebopDominant'
  | 'bebopMajor';

export type HarmonicFunction = 'T' | 'SD' | 'D';

export type HarmonyCell = {
  index: number;
  roman: string;
  symbol: string;
  func: HarmonicFunction;
  voicing?: Voicing;
  locked?: boolean;
};

export type GenerateProgressionParams = {
  key: string;
  mode: ModeName;
  bars: number;
  style: StyleName;
  resolution: '1/2';
  lockedMap?: Record<number, HarmonyCell>;
};

export type HarmonyContext = Pick<GenerateProgressionParams, 'key' | 'mode' | 'style'>;

export type StyleDefaultExtensions = Record<HarmonicFunction, string[]>;

export type StylePack = {
  name: StyleName;
  displayName: string;
  start: Record<string, number>;
  transitions: Record<string, Record<string, number>>;
  allowedBorrowed?: string[];
  defaultExtensions: StyleDefaultExtensions;
  templates?: string[][];
};
