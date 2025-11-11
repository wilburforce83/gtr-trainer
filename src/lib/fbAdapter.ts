import { Fretboard } from '@moonwave99/fretboard.js';
import type { NoteMarker } from './neck';

export type FretboardHandle = {
  board: any;
  highlighted: Set<string>;
};

const DEFAULT_TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];
const ROOT_COLORS: Record<string, string> = {
  major: '#fde047',
  minor: '#fb7185',
  blues: '#38bdf8',
  other: '#facc15',
};
const ACTIVE_COLOR = '#fb923c';

export function mountFretboard(
  container: HTMLElement,
  options: Partial<{ frets: number; tuning: string[]; width: number; height: number }> = {},
): FretboardHandle {
  const frets = options.frets ?? 22;
  const tuning = options.tuning ?? DEFAULT_TUNING;
  const board = new Fretboard({
    el: container,
    fretCount: frets,
    stringCount: tuning.length,
    tuning,
    width: options.width ?? 1000,
    height: options.height ?? 260,
    dotSize: 29,
    dotTextSize: 14,
    dotStrokeWidth: 1,
    dotFill: '#1f2937',
    dotText: (dot: any) => dot.text ?? dot.note ?? '',
  });
  board.render();
  return { board, highlighted: new Set<string>() };
}

export function renderNotes(handle: FretboardHandle | null, noteMarkers: NoteMarker[]): void {
  if (!handle) {
    return;
  }
  const dots = noteMarkers.map((marker) => ({
    string: marker.string,
    fret: marker.fret,
    note: marker.note,
    text: marker.isRoot ? marker.note : marker.inScale ? marker.degreeLabel ?? '' : '',
    role: marker.isRoot ? 'root' : marker.inScale ? 'scale' : 'ghost',
    state: marker.inCurrentPosition ? 'active' : 'inactive',
    disabled: !marker.inScale,
    flavor: marker.rootFlavor ?? 'other',
  }));
  handle.board.setDots(dots).render();
  highlightPosition(handle, handle.highlighted);
}

export function highlightPosition(handle: FretboardHandle | null, ids: Set<string> | null): void {
  if (!handle) {
    return;
  }
  handle.highlighted = ids ?? new Set<string>();
  const board = handle.board;
  board.style({
    filter: () => true,
    fill: '#1f2937',
    fontFill: '#f8fafc',
  });
  Object.entries(ROOT_COLORS).forEach(([flavor, color]) => {
    board.style({
      filter: (dot: any) => dot.role === 'root' && dot.flavor === flavor,
      fill: color,
      fontFill: '#0f172a',
    });
  });
  board.style({
    filter: (dot: any) => dot.role !== 'root' && handle.highlighted.has(`s${dot.string}f${dot.fret}`),
    fill: ACTIVE_COLOR,
    fontFill: '#0f172a',
  });
}

export function destroyFretboard(handle: FretboardHandle | null): void {
  if (!handle) {
    return;
  }
  try {
    handle.board?.clear();
    const wrapper = handle.board?.svg?.node?.parentNode;
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  } catch {
    // ignore
  }
}
