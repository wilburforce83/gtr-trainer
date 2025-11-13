import type { PatternBuilder } from '../shared';
import {
  addKickSimple,
  addSnareBackbeatSimple,
  buildPattern,
  fillEvenHats,
} from '../shared';

export const LOFI_PATTERNS: PatternBuilder[] = [
  // ------------------------------------------------------------
  // PATTERN 1 – Classic Boom-Bap (very clean)
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // Kick: 1 & 3
      addKickSimple(bar, 0, 0.78, { velocityJitter: 0.03, offsetJitterMs: 6 });
      addKickSimple(bar, 8, 0.7, { velocityJitter: 0.03, offsetJitterMs: 6 });

      // Every 4 bars add a gentle late kick
      if (barIndex % 4 === 3) {
        addKickSimple(bar, 12, 0.55, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      // Snare on 2 + 4
      addSnareBackbeatSimple(bar, 0.7, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Simple 1/8 hats
      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.45,
        accentEvery: 4,
        swing,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 2 – Laid Back Head-Nodder
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.8, { velocityJitter: 0.03, offsetJitterMs: 6 });

      // A slightly later second kick for lazy feel
      addKickSimple(bar, 10, 0.62, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      addSnareBackbeatSimple(bar, 0.68, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Variation on bars 7 & 15 only
      if (barIndex % 8 === 6) {
        addKickSimple(bar, 14, 0.5, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      fillEvenHats(bar, {
        step: 2, // eighth notes
        baseVelocity: 0.44,
        accentEvery: 4,
        swing,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 3 – 90s MPC-Style (clean + punchy)
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      addKickSimple(bar, 0, 0.82, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 8, 0.7, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      // Soft offbeat kick every 4 bars
      if (barIndex % 4 === 1) {
        addKickSimple(bar, 6, 0.48, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      addSnareBackbeatSimple(bar, 0.72, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.47,
        accentEvery: 4,
        swing,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 4 – Warm + Minimal (super clean)
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // Very clean: just 1, a soft 3, and a rare pickup
      addKickSimple(bar, 0, 0.75, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 8, 0.68, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      if (barIndex % 8 === 4) {
        addKickSimple(bar, 3, 0.48, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        }); // soft pickup before snare
      }

      addSnareBackbeatSimple(bar, 0.68, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.43,
        accentEvery: 4,
        swing,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),
];
