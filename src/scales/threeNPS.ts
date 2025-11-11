export type ThreeNpsMatrix = number[][]; // [string6..string1][three steps]

export interface ThreeNpsPattern {
  name: string;
  steps: ThreeNpsMatrix;
  startStep: number;
}

const MODE_NAMES: Array<{ name: string; startStep: number }> = [
  { name: 'Ionian', startStep: 0 },
  { name: 'Dorian', startStep: 1 },
  { name: 'Phrygian', startStep: 2 },
  { name: 'Lydian', startStep: 3 },
  { name: 'Mixolydian', startStep: 4 },
  { name: 'Aeolian', startStep: 5 },
  { name: 'Locrian', startStep: 6 },
];

function buildMatrix(startStep: number): ThreeNpsMatrix {
  return Array.from({ length: 6 }, (_, indexFromLowString) => {
    const base = startStep + indexFromLowString * 3;
    return [base, base + 1, base + 2];
  });
}

export const THREE_NPS_PATTERNS: ThreeNpsPattern[] = MODE_NAMES.map((mode) => ({
  name: mode.name,
  startStep: mode.startStep,
  steps: buildMatrix(mode.startStep),
}));

export function getThreeNpsPatterns(): ThreeNpsPattern[] {
  return THREE_NPS_PATTERNS;
}
