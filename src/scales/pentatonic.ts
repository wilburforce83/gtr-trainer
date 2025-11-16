export type StepMatrix = number[][]; // [stringN..string1][two steps]

export interface PentatonicPattern {
  name: string;
  steps: StepMatrix;
  startStep: number;
}

const DEFAULT_STRING_COUNT = 6;

const SHAPES: Array<{ name: string; startStep: number }> = [
  { name: 'E Shape', startStep: 0 },
  { name: 'D Shape', startStep: 1 },
  { name: 'C Shape', startStep: 2 },
  { name: 'A Shape', startStep: 3 },
  { name: 'G Shape', startStep: 4 },
];

function buildSteps(startStep: number, stringCount: number): StepMatrix {
  const count = Math.max(1, stringCount);
  return Array.from({ length: count }, (_, indexFromLowString) => {
    const base = startStep + indexFromLowString * 2;
    return [base, base + 1];
  });
}

function buildPatterns(stringCount: number): PentatonicPattern[] {
  return SHAPES.map((shape) => ({
    name: shape.name,
    startStep: shape.startStep,
    steps: buildSteps(shape.startStep, stringCount),
  }));
}

const PATTERN_CACHE = new Map<number, PentatonicPattern[]>([
  [DEFAULT_STRING_COUNT, buildPatterns(DEFAULT_STRING_COUNT)],
]);

export function getPentatonicPatterns(stringCount = DEFAULT_STRING_COUNT): PentatonicPattern[] {
  const count = Math.max(1, stringCount);
  let cached = PATTERN_CACHE.get(count);
  if (!cached) {
    cached = buildPatterns(count);
    PATTERN_CACHE.set(count, cached);
  }
  return cached;
}
