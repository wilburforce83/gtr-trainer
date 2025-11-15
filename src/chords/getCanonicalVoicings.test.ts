import { describe, expect, it } from 'vitest';
import { getCanonicalVoicings } from './voicings';
import { KIND_INTERVALS } from './chordKinds';
import { getStringPitchClass, normalizeNoteName, toPitchClass } from './noteUtils';

function layoutString(voicing: ReturnType<typeof getCanonicalVoicings>[number]): string {
  return voicing.strings
    .map((entry) => {
      if (entry.fret < 0) {
        return 'X';
      }
      return entry.fret.toString();
    })
    .join('');
}

function hasLayout(voicings: ReturnType<typeof getCanonicalVoicings>, expected: string) {
  return voicings.some((voicing) => layoutString(voicing) === expected);
}

describe('getCanonicalVoicings', () => {
  it('prefers open C as first major voicing', () => {
    const voicings = getCanonicalVoicings('C', '');
    expect(layoutString(voicings[0])).toBe('X32010');
  });

  it('includes F E-shape barre', () => {
    const voicings = getCanonicalVoicings('F', '');
    expect(hasLayout(voicings, '133211')).toBe(true);
  });

  it('returns a real G7 open grip', () => {
    const voicings = getCanonicalVoicings('G', '7');
    expect(hasLayout(voicings, '320001')).toBe(true);
  });

  it('returns open Am first', () => {
    const voicings = getCanonicalVoicings('A', 'm');
    expect(layoutString(voicings[0])).toBe('X02210');
  });

  it('returns a barred Bbm7', () => {
    const voicings = getCanonicalVoicings('Bb', 'm7');
    expect(hasLayout(voicings, 'X13121')).toBe(true);
  });

  it('returns a movable Ebmaj7', () => {
    const voicings = getCanonicalVoicings('Eb', 'maj7');
    expect(hasLayout(voicings, 'X68786')).toBe(true);
  });

  it('returns a dominant G9', () => {
    const voicings = getCanonicalVoicings('G', '9');
    expect(hasLayout(voicings, '3X3435')).toBe(true);
  });

  it('returns a diminished B shape', () => {
    const voicings = getCanonicalVoicings('B', 'dim');
    expect(voicings.length).toBeGreaterThan(0);
  });
});

describe('voicing validation', () => {
  it('keeps notes inside allowed intervals', () => {
    const voicings = getCanonicalVoicings('E', 'maj9');
    voicings.forEach((voicing) => {
      const pcs = voicing.strings
        .filter((entry) => entry.fret >= 0)
        .map((entry) => getStringPitchClass(entry.str, entry.fret));
      const intervals = pcs.map((pc) => (pc - toPitchClass(normalizeNoteName('E')) + 12) % 12);
      intervals.forEach((interval) => {
        expect(KIND_INTERVALS['maj9']).toContain(interval);
      });
    });
  });

  it('enforces fret span <= 5', () => {
    const voicings = getCanonicalVoicings('D', 'm7');
    voicings.forEach((voicing) => {
      const fretted = voicing.strings.filter((entry) => entry.fret > 0).map((entry) => entry.fret);
      if (!fretted.length) {
        return;
      }
      const min = Math.min(...fretted);
      const max = Math.max(...fretted);
      expect(max - min).toBeLessThanOrEqual(5);
    });
  });
});
