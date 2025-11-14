import type { PatternDefinition } from '../shared';
import { addKickSimple, addSnareBackbeatSimple, buildPattern, fillEvenHats } from '../shared';

export const LOFI_PATTERNS: PatternDefinition[] = [
  {
    name: 'Dusty Boom',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.78, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 8, 0.7, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 4 === 3) {
          addKickSimple(bar, 12, 0.55, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }
        addSnareBackbeatSimple(bar, 0.7, { velocityJitter: 0.02, offsetJitterMs: 4 });
        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.45,
          accentEvery: 4,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
  {
    name: 'Sidechain Dream',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.8, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 10, 0.62, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addSnareBackbeatSimple(bar, 0.68, { velocityJitter: 0.02, offsetJitterMs: 4 });
        if (barIndex % 8 === 6) {
          addKickSimple(bar, 14, 0.5, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }
        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.44,
          accentEvery: 4,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
  {
    name: 'Late Night Cycle',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.82, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 8, 0.7, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 4 === 1) {
          addKickSimple(bar, 6, 0.48, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }
        addSnareBackbeatSimple(bar, 0.72, { velocityJitter: 0.02, offsetJitterMs: 4 });
        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.47,
          accentEvery: 4,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
  {
    name: 'Sparse Tape',
    builder: (barCount, swing) =>
      buildPattern(barCount, (bar, barIndex) => {
        addKickSimple(bar, 0, 0.75, { velocityJitter: 0.03, offsetJitterMs: 6 });
        addKickSimple(bar, 8, 0.68, { velocityJitter: 0.03, offsetJitterMs: 6 });
        if (barIndex % 8 === 4) {
          addKickSimple(bar, 3, 0.48, { velocityJitter: 0.03, offsetJitterMs: 6 });
        }
        addSnareBackbeatSimple(bar, 0.68, { velocityJitter: 0.02, offsetJitterMs: 4 });
        fillEvenHats(bar, {
          step: 2,
          baseVelocity: 0.43,
          accentEvery: 4,
          swing,
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }),
  },
];
