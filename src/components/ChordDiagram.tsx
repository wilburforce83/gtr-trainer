import { useEffect, useRef } from 'react';
import type { Voicing } from '../chords/voicings';
import { renderChordDiagram } from '../chords/svguitar';

type Props = {
  voicing?: Voicing;
  caption?: string;
  compact?: boolean;
};

export default function ChordDiagram({ voicing, caption, compact = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!voicing || !containerRef.current) {
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
      return;
    }
    const target = containerRef.current;
    renderChordDiagram(target, voicing);
    return () => {
      target.replaceChildren();
    };
  }, [voicing]);

  return (
    <figure className={`chord-diagram${compact ? ' compact' : ''}`}>
      {voicing ? (
        <div className="diagram-surface" ref={containerRef} />
      ) : (
        <div className="diagram-surface empty">
          <p className="muted">No voicing selected.</p>
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
