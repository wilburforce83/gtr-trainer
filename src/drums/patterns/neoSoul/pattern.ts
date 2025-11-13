import type { PatternBuilder } from '../shared';
import {
  addKickSimple,
  addPercussionSimple,
  addSnareSimple,
  addSnareBackbeatSimple,
  buildPattern,
  fillEvenHats,
} from '../shared';

export const NEO_SOUL_PATTERNS: PatternBuilder[] = [
  // ------------------------------------------------------------
  // PATTERN 1 – Smooth, lazy neo-soul pocket
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // Kicks: 1, "& of 2", "& of 3"
      addKickSimple(bar, 0, 0.86, { velocityJitter: 0.03, offsetJitterMs: 6 });
      addKickSimple(bar, 7, 0.74, { velocityJitter: 0.03, offsetJitterMs: 6 });
      addKickSimple(bar, 10, 0.72, { velocityJitter: 0.03, offsetJitterMs: 6 });

      // Light variation every 4th bar: extra late kick
      if (barIndex % 4 === 3) {
        addKickSimple(bar, 14, 0.6, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      // Snare on 2 & 4
      addSnareBackbeatSimple(bar, 0.85, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Gentle ghost in front of the backbeat (3 sixteenth before beat 2)
      addSnareSimple(bar, 3, 0.34, {
        ghost: true,
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // 16th hats, soft but present, swung
      fillEvenHats(bar, {
        step: 1,
        baseVelocity: 0.6,
        accentEvery: 4,
        swing,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 2 – More syncopated, R&B-ish
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // Kicks: 1, "e of 2", "a of 3"
      addKickSimple(bar, 0, 0.88, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 5, 0.76, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 11, 0.74, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      // Optional pickup into 1 every 2 bars
      if (barIndex % 2 === 1) {
        addKickSimple(bar, 15, 0.6, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      addSnareBackbeatSimple(bar, 0.86, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Ghost after snare on 2, before 3
      addSnareSimple(bar, 9, 0.32, {
        ghost: true,
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // 16th hats with occasional dropouts to keep it breathing
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

  // ------------------------------------------------------------
  // PATTERN 3 – Spacey half-time neo-soul feel
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // Fewer kicks, more space
      addKickSimple(bar, 0, 0.9, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 8, 0.78, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      // Subtle off-beat kick, only in bars 3 & 7, etc.
      if (barIndex % 4 === 2) {
        addKickSimple(bar, 6, 0.68, {
          velocityJitter: 0.03,
          offsetJitterMs: 6,
        });
      }

      addSnareBackbeatSimple(bar, 0.88, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Ghost just before the 4th snare
      addSnareSimple(bar, 11, 0.3, {
        ghost: true,
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Eighth hats with a bit more weight, for a deeper pocket
      fillEvenHats(bar, {
        step: 2,
        baseVelocity: 0.62,
        accentEvery: 4,
        swing,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });
    }),

  // ------------------------------------------------------------
  // PATTERN 4 – Pedal hat flavour, tight modern neo-soul
  // ------------------------------------------------------------
  (barCount, swing) =>
    buildPattern(barCount, (bar, barIndex) => {
      // Kicks: 1, "& of 2", 4
      addKickSimple(bar, 0, 0.9, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 7, 0.76, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });
      addKickSimple(bar, 12, 0.74, {
        velocityJitter: 0.03,
        offsetJitterMs: 6,
      });

      addSnareBackbeatSimple(bar, 0.83, {
        velocityJitter: 0.02,
        offsetJitterMs: 4,
      });

      // Very light ghost before beat 4 in every 2nd bar
      if (barIndex % 2 === 1) {
        addSnareSimple(bar, 11, 0.28, {
          ghost: true,
          velocityJitter: 0.02,
          offsetJitterMs: 4,
        });
      }

      // 16th hats with stronger accent grid
      fillEvenHats(bar, {
        step: 1,
        baseVelocity: 0.6,
        accentEvery: 2,
        swing,
        // occasional gap to stop machine-gun feel
        dropoutSlots: barIndex % 4 === 1 ? [1, 9] : undefined,
        velocityJitter: 0.03,
        offsetJitterMs: 4,
      });

      // Pedal/percussion on the last 16th of the bar every 4 bars
      if (barIndex % 4 === 1) {
        addPercussionSimple(bar, 15, 0.42, {
          type: 'pedal',
          velocityJitter: 0.03,
          offsetJitterMs: 4,
        });
      }
    }),
];
