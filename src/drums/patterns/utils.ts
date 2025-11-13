import type { DrumBar } from '../types';
import { addPercussionRandom } from './shared';

export function addTurnaroundMarkers(bars: DrumBar[]): void {
  const markerBars = [7, 15];
  markerBars.forEach((marker) => {
    if (bars[marker]) {
      addPercussionRandom(bars[marker], 0, 0.85, { type: 'crash' });
    }
  });
}
