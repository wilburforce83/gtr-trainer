import { useEffect, useRef } from 'react';
import { SVGuitarChord } from 'svguitar';
import type { ChordInfo, ChordVoicing } from '../lib/chords';
import type { VoicingPosition } from '../lib/audio';

interface Props {
  chords: ChordInfo[];
  voicingMap: Record<string, ChordVoicing[]>;
  tuning: string[];
  onPlay: (voicing: VoicingPosition[]) => void;
}

export function ChordsPanel({ chords, voicingMap, tuning, onPlay }: Props) {
  return (
    <aside className="chords-panel">
      <h2>Diatonic Chords</h2>
      <div className="chord-grid">
        {chords.map((chord) => {
          const voicings = voicingMap[chord.symbol] ?? [];
          return (
            <article key={chord.symbol} className="chord-card">
              <header>
                <div>
                  <strong>{chord.degree}</strong>
                  <span>{chord.symbol}</span>
                </div>
                {chord.extensions.length > 0 && (
                  <small>Ext: {chord.extensions.join(', ')}</small>
                )}
              </header>
              <div className="voicing-list">
                {voicings.map((voicing) => (
                  <div className="voicing" key={voicing.id}>
                    <ChordDiagram voicing={voicing} tuning={tuning} />
                    <button type="button" onClick={() => onPlay(voicing.audio)}>
                      Play
                    </button>
                  </div>
                ))}
                {!voicings.length && <p className="muted">No voicings for this chord.</p>}
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function ChordDiagram({ voicing, tuning }: { voicing: ChordVoicing; tuning: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const palette = {
    line: '#e2e8f0',
    accent: '#fbbf24',
    text: '#f8fafc',
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) {
      return;
    }
    const chart = new SVGuitarChord(containerRef.current);
    chart
      .configure({
        tuning: tuning.map((value) => value.replace(/\d/g, '')),
        strings: tuning.length,
        frets: 5,
        position: voicing.diagram.position,
        backgroundColor: 'transparent',
        color: palette.line,
        stringColor: palette.line,
        fretColor: palette.line,
        tuningsColor: palette.text,
        titleColor: palette.accent,
        nutColor: palette.accent,
        nutTextColor: '#0f172a',
        fretLabelColor: palette.text,
        emptyStringIndicatorSize: 14,
        strokeWidth: 3,
      })
      .chord({
        fingers: voicing.diagram.fingers,
        barres: voicing.diagram.barres ?? [],
        position: voicing.diagram.position,
        title: voicing.diagram.title,
      })
      .draw();
    return () => {
      containerRef.current?.replaceChildren();
    };
  }, [voicing, tuning]);

  return <div className="svguitar" ref={containerRef} />;
}

export default ChordsPanel;
