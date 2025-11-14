import type { PatternDefinition } from '../shared';
import {
  addKickSimple,
  addSnareSimple,
  addSnareBackbeatSimple,
  buildPattern,
  fillEvenHats,
} from '../shared';

export const POP_PATTERNS: PatternDefinition[] = [
  {
    name: 'Classic Pop Pulse',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar) => {
        addKickSimple(bar, 0, 0.9, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 4, 0.85, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 8, 0.9, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 12, 0.85, { velocityJitter: 0.02, offsetJitterMs: 4 });

        addSnareBackbeatSimple(bar, 0.82, { velocityJitter: 0.02, offsetJitterMs: 3 });

        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.55,
          accentEvery: 4,
          swing,
          velocityJitter: 0.02,
          offsetJitterMs: 3,
        });
      }),
  },
  {
    name: 'Modern Pop Rock',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.88, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 7, 0.7, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 8, 0.86, { velocityJitter: 0.02, offsetJitterMs: 4 });
        if (barIndex % 4 === 3) {
          addKickSimple(bar, 15, 0.6, { velocityJitter: 0.02, offsetJitterMs: 4 });
        }

        addSnareBackbeatSimple(bar, 0.85, { velocityJitter: 0.02, offsetJitterMs: 3 });

        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.52,
          accentEvery: 4,
          swing,
          velocityJitter: 0.02,
          offsetJitterMs: 3,
        });
      }),
  },
  {
    name: 'Soft Pop Ballad',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar) => {
        addKickSimple(bar, 0, 0.9, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 8, 0.65, { velocityJitter: 0.02, offsetJitterMs: 4 });

        addSnareSimple(bar, 12, 0.88, { velocityJitter: 0.02, offsetJitterMs: 3 });

        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.48,
          accentEvery: 4,
          swing,
          velocityJitter: 0.02,
          offsetJitterMs: 3,
        });
      }),
  },
  {
    name: 'Hi-Energy Chorus',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.88, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 4, 0.7, { velocityJitter: 0.02, offsetJitterMs: 4 });
        addKickSimple(bar, 10, 0.76, { velocityJitter: 0.02, offsetJitterMs: 4 });
        if (barIndex % 4 === 2) {
          addKickSimple(bar, 12, 0.55, { velocityJitter: 0.02, offsetJitterMs: 4 });
        }

        addSnareBackbeatSimple(bar, 0.84, { velocityJitter: 0.02, offsetJitterMs: 3 });

        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.5,
          accentEvery: 4,
          swing,
          velocityJitter: 0.02,
          offsetJitterMs: 3,
        });
      }),
  },
];
