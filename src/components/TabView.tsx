import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { SequenceToken } from '../lib/sequencing';
import { clearTab, renderTab } from '../lib/vex';
import { emitNoteHover, onNoteHover, onNotePlay } from '../lib/noteEvents';

interface Props {
  sequence: SequenceToken[];
  stringCount: number;
}

type NoteEntry = {
  node: SVGGElement;
  id: string;
  sequenceIndex: number;
};

const TabView = forwardRef<HTMLDivElement, Props>(({ sequence, stringCount }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hoverLayerRef = useRef<HTMLDivElement>(null);
  const playLayerRef = useRef<HTMLDivElement>(null);
  const noteLookupRef = useRef<Map<string, NoteEntry[]>>(new Map());
  const seqLookupRef = useRef<Map<number, NoteEntry>>(new Map());
  const cleanupRef = useRef<(() => void)[]>([]);

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  useEffect(() => {
    renderTab(canvasRef.current, sequence, stringCount);
    wireNotes();
    return () => {
      clearTab(canvasRef.current);
      cleanupListeners();
      noteLookupRef.current.clear();
      seqLookupRef.current.clear();
      renderMarkers(hoverLayerRef.current, null, 'tab-marker hover');
      renderMarkers(playLayerRef.current, null, 'tab-marker play');
    };
  }, [sequence, stringCount]);

  useEffect(() => {
    const offHover = onNoteHover(({ id, source }) => {
      if (source === 'tab') {
        return;
      }
      setHoverMarkers(id);
    });
    const offPlay = onNotePlay(({ sequenceIndex }) => {
      if (typeof sequenceIndex === 'number') {
        moveCursor(sequenceIndex);
      } else {
        hideCursor();
      }
    });
    return () => {
      offHover();
      offPlay();
    };
  }, []);

  return (
    <div className="tab-view" ref={containerRef}>
      <div className="tab-canvas" ref={canvasRef} />
      <div className="tab-overlay">
        <div className="tab-hover-layer" ref={hoverLayerRef} />
        <div className="tab-play-layer" ref={playLayerRef} />
      </div>
    </div>
  );

  function wireNotes(): void {
    cleanupListeners();
    noteLookupRef.current.clear();
    seqLookupRef.current.clear();
    const host = canvasRef.current;
    if (!host) {
      return;
    }
    const nodes = host.querySelectorAll<SVGGElement>('.vf-tabnote');
    nodes.forEach((node, index) => {
      const token = sequence[index];
      if (!token) {
        return;
      }
      const entry: NoteEntry = { node, id: token.id, sequenceIndex: token.sequenceIndex };
      if (!noteLookupRef.current.has(token.id)) {
        noteLookupRef.current.set(token.id, []);
      }
      noteLookupRef.current.get(token.id)!.push(entry);
      seqLookupRef.current.set(token.sequenceIndex, entry);
      node.style.cursor = 'pointer';
      const enter = () => {
        setHoverMarkers(token.id);
        emitNoteHover(token.id, 'tab');
      };
      const leave = () => {
        setHoverMarkers(null);
        emitNoteHover(null, 'tab');
      };
      node.addEventListener('mouseenter', enter);
      node.addEventListener('mouseleave', leave);
      cleanupRef.current.push(() => {
        node.removeEventListener('mouseenter', enter);
        node.removeEventListener('mouseleave', leave);
      });
    });
  }

  function cleanupListeners(): void {
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
  }

  function setHoverMarkers(noteId: string | null): void {
    const entries = noteId ? noteLookupRef.current.get(noteId) ?? null : null;
    renderMarkers(hoverLayerRef.current, entries, 'tab-marker hover');
  }

  function moveCursor(sequenceIndex: number): void {
    const entry = seqLookupRef.current.get(sequenceIndex);
    renderMarkers(playLayerRef.current, entry ? [entry] : null, 'tab-marker play');
  }

  function hideCursor(): void {
    renderMarkers(playLayerRef.current, null, 'tab-marker play');
  }

  function relativeCenter(node: Element): { x: number; y: number } {
    const container = containerRef.current;
    const rect = node.getBoundingClientRect();
    const hostRect = container?.getBoundingClientRect();
    if (!hostRect) {
      return { x: 0, y: 0 };
    }
    const x = rect.left - hostRect.left + rect.width / 2;
    const y = rect.top - hostRect.top + rect.height / 2;
    return { x, y };
  }
  function renderMarkers(layer: HTMLDivElement | null, entries: NoteEntry[] | null, className: string): void {
    if (!layer) {
      return;
    }
    layer.innerHTML = '';
    if (!entries || !entries.length) {
      return;
    }
    entries.forEach((entry) => {
      markerPositions(entry.node).forEach(({ x, y }) => {
        const marker = document.createElement('span');
        marker.className = className;
        marker.style.transform = `translate(${x - 4}px, ${y - 4}px)`;
        layer.appendChild(marker);
      });
    });
  }

  function markerPositions(node: Element): Array<{ x: number; y: number }> {
    const { x, y } = relativeCenter(node);
    const offset = 18;
    return [
      { x, y: Math.max(0, y - offset) },
      { x, y: y + offset },
    ];
  }
});

export default TabView;
