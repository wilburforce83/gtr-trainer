import { SVGuitarChord } from 'svguitar';
import type { Voicing } from './voicings';

const PALETTE = {
  background: 'transparent',
  line: '#e2e8f0',
  accent: '#fbbf24',
  text: '#f8fafc',
};

export function renderChordDiagram(container: HTMLElement, voicing: Voicing): void {
  if (!container) {
    return;
  }
  container.replaceChildren();
  const fretted = voicing.strings.filter((entry) => entry.fret > 0);
  const minFret = fretted.length ? Math.min(...fretted.map((entry) => entry.fret)) : 0;
  const position = minFret <= 1 ? 1 : minFret - 1;
  const fingers = voicing.strings.map((entry) => {
    if (entry.fret < 0) {
      return [entry.str, 'x'] as const;
    }
    if (entry.fret === 0) {
      return [entry.str, 0] as const;
    }
    return [entry.str, entry.fret - position + 1] as const;
  });
  const barres = detectBarres(voicing.strings, position);

  const chart = new SVGuitarChord(container);
  chart
    .configure({
      tuning: ['E', 'A', 'D', 'G', 'B', 'E'],
      strings: 6,
      frets: 5,
      position,
      backgroundColor: PALETTE.background,
      color: PALETTE.line,
      stringColor: PALETTE.line,
      fretColor: PALETTE.line,
      tuningsColor: PALETTE.text,
      titleColor: PALETTE.accent,
      nutColor: PALETTE.accent,
      fretLabelColor: PALETTE.text,
      strokeWidth: 3,
    })
    .chord({
      fingers,
      barres,
      title: `${voicing.root}${voicing.chordKind}`,
    })
    .draw();
}

function detectBarres(strings: Voicing['strings'], position: number) {
  const barres: Array<{ fromString: number; toString: number; fret: number }> = [];
  const sorted = [...strings].sort((a, b) => b.str - a.str);
  let current: { fret: number; start: number; end: number } | null = null;

  const flush = () => {
    if (current && current.end - current.start >= 1) {
      barres.push({
        fromString: current.start,
        toString: current.end,
        fret: current.fret - position + 1,
      });
    }
    current = null;
  };

  sorted.forEach((entry) => {
    if (entry.fret <= 0) {
      flush();
      return;
    }
    if (!current || entry.fret !== current.fret || entry.str !== current.end - 1) {
      flush();
      current = { fret: entry.fret, start: entry.str, end: entry.str };
      return;
    }
    current.end = entry.str;
  });
  flush();
  return barres;
}
