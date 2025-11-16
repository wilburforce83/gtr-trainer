export type ThreeNpsMatrix = number[][]; // [stringN..string1][three steps]

export interface ThreeNpsPattern {
  name: string;
  steps: ThreeNpsMatrix;
  startStep: number;
}

const DEFAULT_STRING_COUNT = 6;

const MODE_NAMES: Array<{ name: string; startStep: number }> = [
  { name: 'Ionian', startStep: 0 },
  { name: 'Dorian', startStep: 1 },
  { name: 'Phrygian', startStep: 2 },
  { name: 'Lydian', startStep: 3 },
  { name: 'Mixolydian', startStep: 4 },
  { name: 'Aeolian', startStep: 5 },
  { name: 'Locrian', startStep: 6 },
];

function buildMatrix(startStep: number, stringCount: number): ThreeNpsMatrix {
  const count = Math.max(1, stringCount);
  return Array.from({ length: count }, (_, indexFromLowString) => {
    const base = startStep + indexFromLowString * 3;
    return [base, base + 1, base + 2];
  });
}

function buildPatterns(stringCount: number): ThreeNpsPattern[] {
  return MODE_NAMES.map((mode) => ({
    name: mode.name,
    startStep: mode.startStep,
    steps: buildMatrix(mode.startStep, stringCount),
  }));
}

const PATTERN_CACHE = new Map<number, ThreeNpsPattern[]>([
  [DEFAULT_STRING_COUNT, buildPatterns(DEFAULT_STRING_COUNT)],
]);

export function getThreeNpsPatterns(stringCount = DEFAULT_STRING_COUNT): ThreeNpsPattern[] {
  const count = Math.max(1, stringCount);
  let cached = PATTERN_CACHE.get(count);
  if (!cached) {
    cached = buildPatterns(count);
    PATTERN_CACHE.set(count, cached);
  }
  return cached;
}
