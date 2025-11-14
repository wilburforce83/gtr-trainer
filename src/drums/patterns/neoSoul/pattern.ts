import type { PatternDefinition } from '../shared';
import {
  addKickSimple,
  addPercussionSimple,
  addSnareSimple,
  addSnareBackbeatSimple,
  buildPattern,
  fillEvenHats,
} from '../shared';

export const NEO_SOUL_PATTERNS: PatternDefinition[] = [
  {
    name: 'Lazy Glide',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.86, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 7, 0.74, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 10, 0.72, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 4 === 3) {
          addKickSimple(bar, 14, 0.6, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }

        addSnareBackbeatSimple(bar, 0.85, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addSnareSimple(bar, 3, 0.34, { ghost: true, velocityJitter: 0.02, offsetJitterMs: 4 });

        fillEvenHats(bar, {
          step: 1,
          baseVelocity: 0.6,
          accentEvery: 4,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
  {
    name: 'Syncopated Neo',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.88, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 5, 0.76, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 11, 0.74, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 2 === 1) {
          addKickSimple(bar, 15, 0.6, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }

        addSnareBackbeatSimple(bar, 0.86, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addSnareSimple(bar, 9, 0.32, { ghost: true, velocityJitter: 0.02, offsetJitterMs: 4 });

        fillEvenHats(bar, {
          step: 1,
          baseVelocity: 0.58,
          accentEvery: 4,
          swing,
          dropoutSlots: barIndex % 4 === 2 ? [2, 6] : undefined,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
  {
    name: 'Midnight Bounce',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.9, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 5, 0.72, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 10, 0.78, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 4 === 2) {
          addKickSimple(bar, 12, 0.7, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }

        addSnareBackbeatSimple(bar, 0.88, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addSnareSimple(bar, 11, 0.3, { ghost: true, velocityJitter: 0.02, offsetJitterMs: 4 });

        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.62,
          accentEvery: 4,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
  {
    name: 'Floating Bridge',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.9, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 7, 0.76, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 12, 0.74, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 4 === 1) {
          addPercussionSimple(bar, 15, 0.42, { type: 'pedal', velocityJitter: 0.02, offsetJitterMs: 4 });
        }

        addSnareBackbeatSimple(bar, 0.83, { velocityJitter: 0.02, offsetJitterMs: 4 });

        fillEvenHats(bar, {
          step: 1,
          baseVelocity: 0.6,
          accentEvery: 2,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
];
