import type { PatternBuilder } from '../shared';
import {
  addKickSimple,
  addPercussionSimple,
  addSnareSimple,
  addSnareBackbeatSimple,
  buildPattern,
  fillShuffleHats,
} from '../shared';

export const BLUES_PATTERNS: PatternBuilder[] = [
  // ------------------------------------------------------------
  // PATTERN 1 – Straight shuffle backbeat
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar) => {
      addKickSimple(bar, 0, 0.84, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 8, 0.78, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      addSnareBackbeatSimple(bar, 0.86, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      fillShuffleHats(bar, swing, 2, {
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 2 – Shuffle with occasional extra kick
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.84, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 8, 0.78, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      if (barIndex % 2 === 1) {
        addKickSimple(bar, 12, 0.72, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      addSnareBackbeatSimple(bar, 0.86, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      fillShuffleHats(bar, swing, 3, {
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 3 – Busier kick with ghost snare
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.86, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 7, 0.72, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 12, 0.72, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      addSnareBackbeatSimple(bar, 0.88, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      if (barIndex % 4 === 3) {
        addSnareSimple(bar, 11, 0.42, {
          ghost: true,
          velocityJitter: 0.02,
          offsetJitterMs: 4,
        });
      }

      fillShuffleHats(bar, swing, 1, {
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 4 – Shuffle with occasional pickup + pedal
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.84, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 8, 0.76, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      if (barIndex % 4 === 0) {
        addKickSimple(bar, 6, 0.68, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      addSnareBackbeatSimple(bar, 0.88, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      fillShuffleHats(bar, swing, 2, {
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });

      if (barIndex % 4 === 2) {
        addPercussionSimple(bar, 15, 0.6, {
          type: 'pedal',
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }
    }),
];
