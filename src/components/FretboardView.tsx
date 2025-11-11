import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { NoteMarker } from '../lib/neck';
import { destroyFretboard, highlightPosition, mountFretboard, renderNotes, type FretboardHandle } from '../lib/fbAdapter';

interface Props {
  markers: NoteMarker[];
  highlightIds: Set<string>;
  tuning: string[];
}

const FretboardView = forwardRef<HTMLDivElement, Props>(({ markers, highlightIds, tuning }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fretboardRef = useRef<FretboardHandle | null>(null);
  const [renderWidth, setRenderWidth] = useState(0);

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
    return () => {
      destroyFretboard(fretboardRef.current);
      fretboardRef.current = null;
    };
  }, [tuning, renderWidth]);

  useEffect(() => {
    renderNotes(fretboardRef.current, markers);
  }, [markers]);

  useEffect(() => {
    highlightPosition(fretboardRef.current, highlightIds);
  }, [highlightIds, renderWidth]);

  return <div className="fretboard" ref={containerRef} />;
});

export default FretboardView;
