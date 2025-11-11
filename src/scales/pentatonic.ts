export type StepMatrix = number[][]; // [string6..string1][two steps]

export interface PentatonicPattern {
  name: string;
  steps: StepMatrix;
  startStep: number;
}

const SHAPES: Array<{ name: string; startStep: number }> = [
  { name: 'E Shape', startStep: 0 },
  { name: 'D Shape', startStep: 1 },
  { name: 'C Shape', startStep: 2 },
  { name: 'A Shape', startStep: 3 },
  { name: 'G Shape', startStep: 4 },
];

function buildSteps(startStep: number): StepMatrix {
  return Array.from({ length: 6 }, (_, indexFromLowString) => {
    const base = startStep + indexFromLowString * 2;
    return [base, base + 1];
  });
}

export const PENTATONIC_PATTERNS: PentatonicPattern[] = SHAPES.map((shape) => ({
  name: shape.name,
  startStep: shape.startStep,
  steps: buildSteps(shape.startStep),
}));

export function getPentatonicPatterns(): PentatonicPattern[] {
  return PENTATONIC_PATTERNS;
}
