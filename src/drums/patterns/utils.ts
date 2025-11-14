import type { DrumBar } from '../types';
import { addPercussion } from './shared';

export function addTurnaroundMarkers(bars: DrumBar[]): void {
  const markerBars = [7, 15];
  markerBars.forEach((marker) => {
    if (bars[marker]) {
      addPercussion(bars[marker], 0, 0.85, { type: 'crash' });
    }
  });
}
