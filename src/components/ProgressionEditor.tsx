import { useEffect, useState } from 'react';
import type { HarmonyCell } from '../chords/types';

type Props = {
  cells: HarmonyCell[];
  bars: number;
  selectedIndex: number | null;
  onSelect(index: number): void;
  onToggleLock(index: number): void;
  onReplace(index: number): void;
  onReharmonize(index: number): void;
  onDuplicate(index: number): void;
  onDelete(index: number): void;
};

export default function ProgressionEditor({
  cells,
  bars,
  selectedIndex,
  onSelect,
  onToggleLock,
  onReplace,
  onReharmonize,
  onDuplicate,
  onDelete,
}: Props) {
  const [menuIndex, setMenuIndex] = useState<number | null>(null);

  useEffect(() => {
    if (menuIndex === null) {
      return;
    }
    const handle = () => setMenuIndex(null);
    document.addEventListener('click', handle);
    return () => {
      document.removeEventListener('click', handle);
    };
  }, [menuIndex]);

  const cellsPerBar = bars ? Math.max(1, Math.round(cells.length / bars)) : 2;

  return (
    <div className="progression-editor">
      <div className="progression-grid" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(120px, 1fr))` }}>
        {cells.map((cell) => {
          const isSelected = selectedIndex === cell.index;
          return (
            <div
              key={cell.index}
              className={`progression-cell${isSelected ? ' selected' : ''}${cell.locked ? ' locked' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(cell.index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(cell.index);
                }
              }}
            >
              <header>
                <button
                  type="button"
                  className="ghost"
                  aria-pressed={cell.locked}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleLock(cell.index);
                  }}
                >
                  {cell.locked ? '🔒' : '🔓'}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuIndex((prev) => (prev === cell.index ? null : cell.index));
                  }}
                >
                  •••
                </button>
              </header>
              <div className="cell-body">
                <span className="roman">{cell.roman || '—'}</span>
                <span className="symbol">{cell.symbol}</span>
              </div>
              {menuIndex === cell.index && (
                <menu
                  className="cell-menu"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <button type="button" onClick={() => onReplace(cell.index)}>
                    Replace
                  </button>
                  <button type="button" onClick={() => onReharmonize(cell.index)}>
                    Reharmonize
                  </button>
                  <button type="button" onClick={() => onDuplicate(cell.index)}>
                    Duplicate
                  </button>
                  <button type="button" onClick={() => onDelete(cell.index)}>
                    Delete
                  </button>
                </menu>
              )}
            </div>
          );
        })}
      </div>
      <footer className="bar-markers">
        {Array.from({ length: bars }, (_, barIndex) => (
          <span key={`bar-${barIndex}`} style={{ width: `${(cellsPerBar / cells.length) * 100}%` }}>
            Bar {barIndex + 1}
          </span>
        ))}
      </footer>
    </div>
  );
}
