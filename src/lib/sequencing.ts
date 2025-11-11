import type { PositionNote, PositionResult } from './positions';

export type SequenceToken = {
  id: string;
  string: number;
  fret: number;
  midi: number;
  note: string;
  duration: '8';
  sequenceIndex: number;
};

export function buildSequence(position: PositionResult): SequenceToken[] {
  const ordered = orderNotesAscending(position.notes);
  if (!ordered.length) {
    return [];
  }
  const descending = [...ordered].reverse();
  const withoutDup = descending.slice(1);
  return [...ordered, ...withoutDup].map((note, idx) => ({
    id: `s${note.string}f${note.fret}`,
    string: note.string,
    fret: note.fret,
    midi: note.midi,
    note: note.note,
    duration: '8',
    sequenceIndex: idx,
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
