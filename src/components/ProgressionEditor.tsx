import { useEffect, useState } from 'react';
import type { HarmonyCell } from '../chords/types';

type Props = {
  cells: HarmonyCell[];
  bars: number;
  selectedIndex: number | null;
  onSelect(index: number): void;
  onToggleLock(index: number): void;
  onReharmonize(index: number): void;
  onDelete(index: number): void;
  onMove(fromIndex: number, toIndex: number): void;
};

export default function ProgressionEditor({
  cells,
  bars,
  selectedIndex,
  onSelect,
  onToggleLock,
  onReharmonize,
  onDelete,
  onMove,
}: Props) {
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
          const isDragSource = dragIndex === cell.index;
          const isDragHover = dragIndex !== null && dragOverIndex === cell.index && dragIndex !== cell.index;
          const dragDirection = isDragHover ? (dragIndex! < cell.index ? 'forward' : 'backward') : null;
          const classNames = [
            'progression-cell',
            isSelected ? 'selected' : '',
            cell.locked ? 'locked' : '',
            isDragSource ? 'drag-source' : '',
            isDragHover && dragDirection ? `drag-over drag-over-${dragDirection}` : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={cell.index}
              className={classNames}
              role="button"
              tabIndex={0}
              draggable
              onClick={() => onSelect(cell.index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(cell.index);
                }
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', String(cell.index));
                event.dataTransfer.effectAllowed = 'move';
                setDragIndex(cell.index);
                setDragOverIndex(cell.index);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== cell.index) {
                  setDragOverIndex(cell.index);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null && dragIndex !== cell.index) {
                  onMove(dragIndex, cell.index);
                }
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              onDragLeave={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                  setDragOverIndex((current) => (current === cell.index ? null : current));
                }
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDragOverIndex(null);
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
                  <button type="button" onClick={() => onReharmonize(cell.index)}>
                    Reharmonize
                  </button>
                  <button type="button" onClick={() => onDelete(cell.index)}>
                    Rest
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
