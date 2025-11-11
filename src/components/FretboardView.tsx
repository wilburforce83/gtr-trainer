import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { NoteMarker } from '../lib/neck';
import { destroyFretboard, highlightPosition, mountFretboard, renderNotes, type FretboardHandle } from '../lib/fbAdapter';
import { emitNoteHover, onNoteHover, onNotePlay } from '../lib/noteEvents';

interface Props {
  markers: NoteMarker[];
  highlightIds: Set<string>;
  tuning: string[];
}

const FretboardView = forwardRef<HTMLDivElement, Props>(({ markers, highlightIds, tuning }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fretboardRef = useRef<FretboardHandle | null>(null);
  const [renderWidth, setRenderWidth] = useState(0);
  const dotMapRef = useRef<Map<string, SVGGElement>>(new Map());
  const cleanupRef = useRef<(() => void)[]>([]);
  const hoverIdRef = useRef<string | null>(null);
  const playIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      setRenderWidth(container?.clientWidth ?? 0);
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      setRenderWidth(container.clientWidth);
    });
    observer.observe(container);
    setRenderWidth(container.clientWidth);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || renderWidth === 0) {
      return undefined;
    }
    container.innerHTML = '';
    fretboardRef.current = mountFretboard(container, {
      frets: 22,
      tuning: tuning.map((note) => note.replace(/\d/g, '')),
      width: renderWidth,
    });
    renderNotes(fretboardRef.current, markers);
    wireDotInteractions();
    return () => {
      cleanupInteractions();
      destroyFretboard(fretboardRef.current);
      fretboardRef.current = null;
    };
  }, [tuning, renderWidth]);

  useEffect(() => {
    renderNotes(fretboardRef.current, markers);
    wireDotInteractions();
  }, [markers]);

  useEffect(() => {
    highlightPosition(fretboardRef.current, highlightIds);
  }, [highlightIds, renderWidth]);

  useEffect(() => {
    const offHover = onNoteHover(({ id, source }) => {
      if (source === 'fretboard') {
        return;
      }
      setHoverHighlight(id);
    });
    const offPlay = onNotePlay(({ id }) => {
      setPlayHighlight(id);
    });
    return () => {
      offHover();
      offPlay();
    };
  }, []);

  return <div className="fretboard" ref={containerRef} />;

  function wireDotInteractions(): void {
    cleanupInteractions();
    dotMapRef.current.clear();
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const dots = container.querySelectorAll<SVGGElement>('.dot');
    dots.forEach((dot) => {
      const classId = Array.from(dot.classList).find((cls) => cls.startsWith('dot-id-'));
      if (!classId) {
        return;
      }
      const match = /dot-id-s(\d+):f(\d+)/.exec(classId);
      if (!match) {
        return;
      }
      const noteId = `s${match[1]}f${match[2]}`;
      dotMapRef.current.set(noteId, dot);
      dot.style.cursor = 'pointer';
      const enter = () => {
        setHoverHighlight(noteId);
        emitNoteHover(noteId, 'fretboard');
      };
      const leave = () => {
        if (hoverIdRef.current === noteId) {
          setHoverHighlight(null);
        }
        emitNoteHover(null, 'fretboard');
      };
      dot.addEventListener('mouseenter', enter);
      dot.addEventListener('mouseleave', leave);
      cleanupRef.current.push(() => {
        dot.removeEventListener('mouseenter', enter);
        dot.removeEventListener('mouseleave', leave);
      });
    });
  }

  function cleanupInteractions(): void {
    cleanupRef.current.forEach((fn) => fn());
    cleanupRef.current = [];
  }

  function setHoverHighlight(id: string | null): void {
    if (hoverIdRef.current && hoverIdRef.current !== id) {
      toggleClass(hoverIdRef.current, 'linked-hover', false);
    }
    hoverIdRef.current = id;
    if (id) {
      toggleClass(id, 'linked-hover', true);
    }
  }

  function setPlayHighlight(id: string | null): void {
    if (playIdRef.current && playIdRef.current !== id) {
      toggleClass(playIdRef.current, 'linked-active', false);
    }
    playIdRef.current = id;
    if (id) {
      toggleClass(id, 'linked-active', true);
    }
  }

  function toggleClass(id: string, className: string, enabled: boolean): void {
    const node = dotMapRef.current.get(id);
    if (node) {
      node.classList.toggle(className, enabled);
    }
  }
});

export default FretboardView;
