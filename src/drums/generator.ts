import type { StyleName } from '../chords/types';
import type { DrumPattern } from './types';
import { getPatternDefinitions } from './patterns';
import { addTurnaroundMarkers } from './patterns/utils';

const DEFAULT_BAR_COUNT = 8;

type GenerateOptions = {
  style: StyleName;
  barCount?: number;
  patternIndex?: number;
};

export function generateDrumPattern({ style, barCount = DEFAULT_BAR_COUNT, patternIndex = 0 }: GenerateOptions): DrumPattern {
  const sanitizedBars = clampBarCount(barCount);
  const definitions = getPatternDefinitions(style);
  const sanitizedPattern = clampPatternIndex(patternIndex, definitions.length);
  const pattern = definitions[sanitizedPattern] ?? definitions[0];
  const swing = pickSwingAmount(style);
  const bars = pattern.builder(sanitizedBars, swing);
  addTurnaroundMarkers(bars);
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `drm-${style}-${sanitizedPattern}-${sanitizedBars}`,
    style,
    swing,
    barCount: sanitizedBars,
    bars,
  };
}

function clampBarCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BAR_COUNT;
  }
  return Math.max(4, Math.min(16, Math.round(value)));
}

function clampPatternIndex(value: number, total: number): number {
  const maxIndex = Math.max(1, total);
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(maxIndex - 1, Math.round(value)));
}

function pickSwingAmount(style: StyleName): number {
  switch (style) {
    case 'lofi':
      return 0.1;
    case 'neo-soul':
      return 0.07;
    case 'blues':
      return 0.12;
    case 'pop':
    default:
      return 0.03;
  }
}
