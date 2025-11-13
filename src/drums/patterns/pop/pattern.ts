import type { PatternBuilder } from '../shared';
import {
  addKickSimple,
  addSnareSimple,
  addSnareBackbeatSimple,
  buildPattern,
  fillEvenHats,
} from '../shared';

export const POP_PATTERNS: PatternBuilder[] = [
  // ------------------------------------------------------------
  // PATTERN 1 – Classic 4-on-the-floor pop
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar) => {
      // Kicks on every beat (0, 4, 8, 12)
      addKickSimple(bar, 0, 0.9, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 4, 0.85, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 8, 0.9, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 12, 0.85, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Snare on 2 & 4
      addSnareBackbeatSimple(bar, 0.82, {
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });

      // Straight 1/8 hats, bright and steady
      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.55,
        accentEvery: 4,
        swing,
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 2 – Pop rock (classic modern pop groove)
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.88, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 7, 0.7, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 8, 0.86, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Optional pickup kick every 4 bars
      if (barIndex % 4 === 3) {
        addKickSimple(bar, 15, 0.6, {
          velocityJitter: 0.02,
          offsetJitterMs: 4,
        });
      }

      addSnareBackbeatSimple(bar, 0.85, {
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });

      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.52,
        accentEvery: 4,
        swing,
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 3 – Soft pop / ballad (half-time feel)
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar) => {
      // Kick only on beat 1 and soft on beat 3
      addKickSimple(bar, 0, 0.9, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 8, 0.65, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Big snare hit with space (half-time on beat 4)
      addSnareSimple(bar, 12, 0.88, {
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });

      // Simple eighth hats
      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.48,
        accentEvery: 4,
        swing,
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 4 – Tight modern pop (light variation)
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.88, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 4, 0.7, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });
      addKickSimple(bar, 10, 0.76, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      addSnareBackbeatSimple(bar, 0.84, {
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });

      // Light variation every 4 bars: small extra kick
      if (barIndex % 4 === 2) {
        addKickSimple(bar, 12, 0.55, {
          velocityJitter: 0.02,
          offsetJitterMs: 4,
        });
      }

      // Straight bright hats
      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.5,
        accentEvery: 4,
        swing,
        velocityJitter: 0.02,
        offsetJitterMs: 3,
      });
    }),
];
