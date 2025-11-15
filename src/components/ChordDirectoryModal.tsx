import { useMemo, useState } from 'react';
import ChordDiagram from './ChordDiagram';
import { getCanonicalVoicings, type Voicing } from '../chords/voicings';
import type { ChordKind } from '../chords/chordKinds';
import { CHORD_KIND_OPTIONS, CHORD_KIND_SUFFIXES, CHORD_KIND_LABELS } from '../chords/chordKinds';
import type { NoteName } from '../chords/noteUtils';

const ROOT_OPTIONS: Array<{ value: NoteName; label: string }> = [
  { value: 'C', label: 'C' },
  { value: 'C#', label: 'C# / Db' },
  { value: 'D', label: 'D' },
  { value: 'Eb', label: 'Eb / D#' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F# / Gb' },
  { value: 'G', label: 'G' },
  { value: 'Ab', label: 'Ab / G#' },
  { value: 'A', label: 'A' },
  { value: 'Bb', label: 'Bb / A#' },
  { value: 'B', label: 'B' },
];

type Props = {
  open: boolean;
  onClose(): void;
};

type DirectoryEntry = {
  id: string;
  root: NoteName;
  kind: ChordKind;
  symbol: string;
  voicings: Voicing[];
  searchIndex: string;
};

const DIRECTORY_ENTRIES: DirectoryEntry[] = (() => {
  const list: DirectoryEntry[] = [];
  ROOT_OPTIONS.forEach((root) => {
    CHORD_KIND_OPTIONS.forEach((kindOption) => {
      const voicings = getCanonicalVoicings(root.value, kindOption.value);
      if (!voicings.length) {
        return;
      }
      const symbol = `${root.value}${CHORD_KIND_SUFFIXES[kindOption.value]}`;
      const searchIndex = `${symbol} ${CHORD_KIND_LABELS[kindOption.value]} ${voicings
        .map((voicing) => voicing.name ?? '')
        .join(' ')}`
        .toLowerCase();
      list.push({
        id: `${root.value}-${kindOption.value}`,
        root: root.value,
        kind: kindOption.value,
        symbol,
        voicings,
        searchIndex,
      });
    });
  });
  return list;
})();

export default function ChordDirectoryModal({ open, onClose }: Props) {
  const [rootFilter, setRootFilter] = useState<NoteName | 'all'>('A');
  const [kindFilter, setKindFilter] = useState<ChordKind | 'all'>('all');

  const filtered = useMemo(() => {
    return DIRECTORY_ENTRIES.filter((entry) => {
      if (rootFilter !== 'all' && entry.root !== rootFilter) {
        return false;
      }
      if (kindFilter !== 'all' && entry.kind !== kindFilter) {
        return false;
      }
      return true;
    });
  }, [rootFilter, kindFilter]);

  if (!open) {
    return null;
  }

  return (
    <div className="chord-directory-backdrop" role="dialog" aria-modal="true">
      <div className="chord-directory-modal">
        <header>
          <div>
            <h3>Chord Directory</h3>
            <p className="muted">Browse every chord in the trainer.</p>
          </div>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close chord directory">
            ✕
          </button>
        </header>
        <div className="chord-directory-controls">
          <select value={rootFilter} onChange={(event) => setRootFilter(event.target.value === 'all' ? 'all' : (event.target.value as NoteName))}>
            <option value="all">All roots</option>
            {ROOT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value === 'all' ? 'all' : (event.target.value as ChordKind))}>
            <option value="all">All modifiers</option>
            {CHORD_KIND_OPTIONS.map((option) => (
              <option key={option.value || 'maj'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="chord-directory-list">
          {filtered.map((entry) => (
            <section key={entry.id} className="chord-directory-entry">
              <header>
                <strong>{entry.symbol || entry.root}</strong>
                <span>{CHORD_KIND_LABELS[entry.kind]}</span>
              </header>
              <div className="chord-directory-voicings">
                {entry.voicings.map((voicing) => (
                  <div key={voicing.id ?? `${entry.id}-${voicing.name ?? 'voicing'}` } className="chord-directory-voicing-card">
                    <ChordDiagram voicing={voicing} compact />
                    {voicing.name && <span className="muted">{voicing.name}</span>}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {!filtered.length && <p className="muted">No chords match this filter.</p>}
        </div>
      </div>
    </div>
  );
}
