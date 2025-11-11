import type { PositionNote, PositionResult } from './positions';

export type SequenceToken = {
  string: number;
  fret: number;
  midi: number;
  note: string;
  duration: '8';
};

export function buildSequence(position: PositionResult): SequenceToken[] {
  const ordered = orderNotesAscending(position.notes);
  if (!ordered.length) {
    return [];
  }
  const descending = [...ordered].reverse();
  const withoutDup = descending.slice(1);
  return [...ordered, ...withoutDup].map((note) => ({
    string: note.string,
    fret: note.fret,
    midi: note.midi,
    note: note.note,
    duration: '8',
  }));
}

function orderNotesAscending(notes: PositionNote[]): PositionNote[] {
  return [...notes].sort((a, b) => {
    if (a.midi === b.midi) {
      return a.string - b.string;
    }
    return a.midi - b.midi;
  });
}
