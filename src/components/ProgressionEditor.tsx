import { useEffect, useRef, useState, type DragEvent } from 'react';
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
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

  useEffect(() => {
    if (dragIndex === null) {
      return;
    }
    const handleReset = () => {
      setDragIndex(null);
      setDragOverIndex(null);
    };
    window.addEventListener('dragend', handleReset);
    window.addEventListener('drop', handleReset);
    return () => {
      window.removeEventListener('dragend', handleReset);
      window.removeEventListener('drop', handleReset);
    };
  }, [dragIndex]);

  const handleDrop = (targetIndex: number | null) => {
    if (dragIndex !== null) {
      const maxIndex = cells.length;
      const clamped = Math.max(0, Math.min(targetIndex ?? dragIndex, maxIndex));
      onMove(dragIndex, clamped);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const updateDropIndex = (clientX: number) => {
    if (dragIndex === null) {
      return;
    }
    const entries = Array.from(cellRefs.current.entries()).sort((a, b) => a[0] - b[0]);
    if (!entries.length) {
      return;
    }
    for (const [index, node] of entries) {
      const rect = node.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      if (clientX < midpoint) {
        if (dragOverIndex !== index) {
          setDragOverIndex(index);
        }
        return;
      }
    }
    const lastIndex = entries[entries.length - 1][0] + 1;
    if (dragOverIndex !== lastIndex) {
      setDragOverIndex(lastIndex);
    }
  };

  const handleGridDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateDropIndex(event.clientX);
  };

  const registerCellRef = (index: number) => (node: HTMLDivElement | null) => {
    if (node) {
      cellRefs.current.set(index, node);
    } else {
      cellRefs.current.delete(index);
    }
  };

  return (
    <div className="progression-editor">
      <div
        className="progression-grid"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(120px, 1fr))` }}
        onDragOver={handleGridDragOver}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(dragOverIndex ?? dragIndex);
        }}
      >
        {cells.map((cell) => {
          const isSelected = selectedIndex === cell.index;
          const dragTarget = dragOverIndex ?? dragIndex;
          const movingForward = dragIndex !== null && dragTarget !== null && dragTarget > dragIndex;
          const movingBackward = dragIndex !== null && dragTarget !== null && dragTarget < dragIndex;
          const shouldShiftForward =
            movingForward && dragIndex !== null && dragTarget !== null && cell.index > dragIndex && cell.index <= dragTarget;
          const shouldShiftBackward =
            movingBackward && dragIndex !== null && dragTarget !== null && cell.index >= dragTarget && cell.index < dragIndex;
          const isDropBefore = dragOverIndex !== null && dragOverIndex === cell.index;
          const isDropAfter =
            dragOverIndex !== null && dragOverIndex >= cells.length && cell.index === cells.length - 1;
          const classNames = [
            'progression-cell',
            isSelected ? 'selected' : '',
            cell.locked ? 'locked' : '',
            dragIndex === cell.index ? 'drag-source' : '',
            shouldShiftForward ? 'shift-forward' : '',
            shouldShiftBackward ? 'shift-backward' : '',
            isDropBefore ? 'drop-before' : '',
            isDropAfter ? 'drop-after' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={cell.index}
              ref={registerCellRef(cell.index)}
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
